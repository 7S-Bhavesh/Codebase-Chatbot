import { GoogleGenAI } from "@google/genai";
import { buildAugmentedPrompt } from "./augmenter.js";
import client from "../client/weaviate.client.js";
import { RAG_CONFIG } from "../config/rag.config.js";

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
export async function generation(query, email, repoUrl, repoId, configOverrides = {}) {
  try {
    if (!query) return { error: "Query is required" };

    const config = { ...RAG_CONFIG, ...configOverrides };
    const collection = client.collections.use('RepoCodeChunk');

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
    let ranked = candidates;
    if (config.ENABLE_RERANK) {
      ranked = await rerank(query, candidates, config);
    } else {
      // No reranker — use hybrid score as rerank_score so later stages work uniformly
      ranked = candidates.map(c => ({ ...c, rerank_score: c.hybrid_score }))
                         .sort((a, b) => b.rerank_score - a.rerank_score);
    }

    // ── Stage 3: Confidence floor ────────────────────────────────────────────
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

    // ── Build prompt & call LLM ──────────────────────────────────────────────
    const prompt = buildAugmentedPrompt(query, packed, lowConfidence);

    const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
    const MODEL = "gemini-2.0-flash";

    const llmResponse = await ai.models.generateContent({
      model: MODEL,
      contents: prompt,
    });

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

    return {
      success:        true,
      answer:         finalAnswer,
      sources:        uniqueSources,
      low_confidence: lowConfidence,
      model:          MODEL,
    };

  } catch (err) {
    console.error("[ragOutput] Pipeline error:", err);
    return {
      error:   "Failed to generate response",
      details: process.env.NODE_ENV === "development" ? err.message : undefined,
    };
  }
}
