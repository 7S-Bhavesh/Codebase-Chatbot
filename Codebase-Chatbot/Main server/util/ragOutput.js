import { GoogleGenAI } from "@google/genai";
import { buildAugmentedPrompt } from "./augmenter.js";
import client from "../client/weaviate.client.js";
import { RAG_CONFIG } from "../config/rag.config.js";
import { generateWithRetry, generationErrorMessage, providerFailure } from './generateWithRetry.js';
import { createRagTrace, traceChunks } from './ragTrace.js';

// Pipeline stages
import { hybridRetrieve }    from "./pipeline/retrieve.js";
import { rerank }            from "./pipeline/rerank.js";
import { checkConfidence }   from "./pipeline/confidenceFloor.js";
import { expandToParent }    from "./pipeline/expand.js";
import { dedupe }            from "./pipeline/dedupe.js";
import { packAndSort }       from "./pipeline/pack.js";

/**
 * Run the full RAG pipeline and return a structured response.
 *
 * @param {string} query    User question.
 * @param {string} email    User email (used as userid filter fallback).
 * @param {string} repoUrl  Repository URL (used as repourl filter fallback).
 * @param {number} repoId   Integer FK from PostgreSQL REPO_INPUT — primary filter.
 * @param {object} [configOverrides] Optional per-call config overrides (used by eval).
 * @param {Function} [onProgress] Persists or displays pipeline stage changes.
 * @param {object} [traceContext] Optional promptId and chatId for request log correlation.
 * @returns {Promise<{
 *   success:        boolean,
 *   answer:         string,
 *   sources:        Array<{file_path,start_line,end_line,unit_id,signature}>,
 *   low_confidence: boolean,
 *   model:          string,
 *   error?:         string,
 *   details?:       string,
 * }>}
 */
export async function generation(query, email, repoUrl, repoId, configOverrides = {}, onProgress = async () => {}, traceContext = {}) {
  let stage = 'retrieval';
  const trace = createRagTrace({ ...traceContext, repoId });
  const advance = async next => { stage = next; await onProgress(next); };
  try {
    await trace.write('request_started', { query });
    if (!query) {
      await trace.write('failed', { stage: 'validation', error_code: 'QUERY_REQUIRED' });
      return { error: "Query is required" };
    }

    const config = { ...RAG_CONFIG, ...configOverrides };
    await trace.write('pipeline_config', {
      retrieve_limit: config.K_RETRIEVE, hybrid_alpha: config.ALPHA, fusion_type: config.FUSION_TYPE,
      reranker_model: config.RERANKER_MODEL, token_budget: config.TOKEN_BUDGET,
      absolute_floor: config.ABS_FLOOR, relative_threshold: config.REL_THRESHOLD,
      min_units: config.MIN_UNITS, max_expanded_units: config.MAX_EXPANDED_UNITS,
      large_unit_tokens: config.LARGE_UNIT_TOKENS, inherit_discount: config.INHERIT_DISCOUNT,
      enable_rerank: config.ENABLE_RERANK, enable_threshold: config.ENABLE_THRESHOLD,
      enable_expand: config.ENABLE_EXPAND, enable_dedupe: config.ENABLE_DEDUPE,
    });
    const collection = client.collections.use('RepoCodeChunk');
    await advance('retrieval');

    // ── Stage 1: Hybrid Retrieval ────────────────────────────────────────────
    // Filter by integer repo_id; fall back to repourl string if repo_id missing
    // (backward compat for chunks indexed before this upgrade).
    let candidates;
    if (repoId) {
      candidates = await hybridRetrieve(query, repoId, config, collection);
    } else {
      // Legacy path: nearText filtered by repourl + userid
      const result = await collection.query.nearText(query, {
        limit: config.K_RETRIEVE,
        returnMetadata: ['distance', 'score'],
        filters: collection.filter.and(
          collection.filter.byProperty('userid').equal(email),
          collection.filter.byProperty('repourl').equal(repoUrl)
        ),
        returnProperties: [
          'chunk_id','repo_id','file_path','start_line','end_line',
          'unit_id','signature','is_signature_chunk','chunk_index',
          'token_count','text','repourl','userid',
        ],
      });
      candidates = result.objects.map(obj => ({
        ...obj.properties,
        hybrid_score: obj.metadata?.score ?? (1 - (obj.metadata?.distance ?? 1)),
        rerank_score: null,
        inherited: false,
      }));
    }

    // ── Stage 2: Rerank ──────────────────────────────────────────────────────
    await trace.write('retrieved_chunks', { count: candidates.length, chunks: traceChunks(candidates) });
    let ranked = candidates;
    console.log(`[rag] repo=${repoId} retrieved=${candidates.length}`);
    if (config.ENABLE_RERANK) {
      await advance('reranking');
      ranked = await rerank(query, candidates, config);
    } else {
      // No reranker — use hybrid score as rerank_score so later stages work uniformly
      ranked = candidates.map(c => ({ ...c, rerank_score: c.hybrid_score, score_source: 'hybrid_rerank_disabled' }))
                         .sort((a, b) => b.rerank_score - a.rerank_score);
    }

    // ── Stage 3: Confidence floor ────────────────────────────────────────────
    await trace.write('reranked_chunks', { model: config.ENABLE_RERANK ? config.RERANKER_MODEL : null, count: ranked.length, chunks: traceChunks(ranked) });
    await advance('context');
    const { chunks: afterFloor, lowConfidence } = config.ENABLE_THRESHOLD
      ? checkConfidence(ranked, config)
      : { chunks: ranked, lowConfidence: false };

    // ── Stage 4: Parent expansion ────────────────────────────────────────────
    let expanded = afterFloor;
    if (config.ENABLE_EXPAND && !lowConfidence) {
      expanded = await expandToParent(afterFloor, config, collection);
    }

    // ── Stage 5: Deduplicate ─────────────────────────────────────────────────
    const deduped = config.ENABLE_DEDUPE ? dedupe(expanded) : expanded;

    // ── Stage 6: Pack & sort ─────────────────────────────────────────────────
    const packed = await packAndSort(deduped, config);
    await trace.write('selected_context', {
      low_confidence: lowConfidence, after_floor_count: afterFloor.length,
      expanded_count: expanded.length, deduped_count: deduped.length,
      count: packed.length, chunks: traceChunks(packed),
    });

    // ── Build prompt & call LLM ──────────────────────────────────────────────
    const prompt = buildAugmentedPrompt(query, packed, lowConfidence);

    const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
    const MODEL = process.env.GEMINI_MODEL || "gemini-3.5-flash-lite";
    await trace.write('final_prompt', { model: MODEL, prompt_chars: prompt.length, prompt });
    await advance('generation');
    console.log(`[rag] repo=${repoId} model=${MODEL} contextChunks=${packed.length} promptChars=${prompt.length}`);

    const llmResponse = await generateWithRetry(ai, {
      model: MODEL,
      contents: prompt,
    }, { onRetry: async retry => {
      await trace.write('generation_retry', retry);
      await advance('retrying');
    } });

    const finalAnswer = llmResponse.text;

    // ── Build sources list (for DB storage + frontend display) ───────────────
    const sources = packed.map(c => ({
      file_path:  c.file_path  ?? null,
      start_line: c.start_line ?? null,
      end_line:   c.end_line   ?? null,
      unit_id:    c.unit_id    ?? null,
      signature:  c.signature  ?? null,
      inherited:  c.inherited  ?? false,
    }));

    // Deduplicate sources by (file_path, start_line) for cleaner display
    const seenSrc = new Set();
    const uniqueSources = sources.filter(s => {
      const key = `${s.file_path}:${s.start_line}`;
      if (seenSrc.has(key)) return false;
      seenSrc.add(key);
      return true;
    });

    await trace.write('completed', { model: MODEL, answer: finalAnswer, sources: uniqueSources, low_confidence: lowConfidence });
    return {
      success:        true,
      answer:         finalAnswer,
      sources:        uniqueSources,
      low_confidence: lowConfidence,
      model:          MODEL,
    };

  } catch (err) {
    const { status } = providerFailure(err);
    const providerStage = stage === 'generation' || stage === 'retrying';
    const errorCode = providerStage
      ? (status === 429 ? 'GEMINI_QUOTA_EXCEEDED' : status === 503 ? 'GEMINI_UNAVAILABLE' : 'GEMINI_ERROR')
      : `${stage.toUpperCase()}_FAILED`;
    await trace.write('failed', { stage, error_code: errorCode, http_status: status || null, message: providerStage ? generationErrorMessage(err) : 'Repository context preparation failed' });
    console.error(`[rag] repo=${repoId} stage=${stage} code=${errorCode} http=${status || 'unknown'}`, err.message);
    return {
      success: false,
      error: providerStage ? generationErrorMessage(err) : `Could not ${stage === 'retrieval' ? 'search the repository' : 'prepare the repository context'}. Please try again.`,
      error_code: errorCode,
      stage,
      details: process.env.NODE_ENV === "development" ? err.message : undefined,
    };
  }
}
