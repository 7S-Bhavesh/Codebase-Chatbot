/**
 * Pipeline stage 2 — Cross-Encoder Reranking
 *
 * Pure function: (query, chunks, config) → Chunk[] sorted by rerank_score desc
 *
 * POSTs to the reranker sidecar and attaches the logit score to each chunk.
 * Truncation to the model's max_length is handled by the sidecar.
 */

/**
 * @param {string}   query   User question.
 * @param {object[]} chunks  Chunks from hybridRetrieve.
 * @param {object}   config  RAG_CONFIG (RERANKER_URL, RERANKER_MODEL).
 * @returns {Promise<object[]>} Same chunks, `.rerank_score` populated, sorted desc.
 */
export async function rerank(query, chunks, config) {
  if (chunks.length === 0) return chunks;

  const { RERANKER_URL, RERANKER_MODEL } = config;
  const endpoint = `${RERANKER_URL}/rerank`;
  const started = Date.now();

  let scores;
  try {
    const resp = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        query,
        texts: chunks.map(c => c.text),
        model: RERANKER_MODEL,
      }),
      // Fail fast if sidecar is unreachable (don't hang the pipeline)
      signal: AbortSignal.timeout(30_000),
    });

    if (!resp.ok) {
      const body = await resp.text().catch(() => '');
      throw new Error(`Reranker HTTP ${resp.status}: ${body}`);
    }

    ({ scores } = await resp.json());
    if (!Array.isArray(scores) || scores.length !== chunks.length || !scores.every(Number.isFinite)) {
      throw new Error('Reranker returned invalid or incomplete scores');
    }
    console.log(`[rerank] status=ok candidates=${chunks.length} elapsedMs=${Date.now() - started}`);
  } catch (err) {
    console.error('[rerank] Sidecar error — falling back to hybrid scores:', err.message);
    // Graceful degradation: use hybrid score as rerank_score
    return chunks
      .map(c => ({ ...c, rerank_score: c.hybrid_score, score_source: 'hybrid_fallback' }))
      .sort((a, b) => b.rerank_score - a.rerank_score);
  }

  const ranked = chunks.map((chunk, i) => ({
    ...chunk,
    rerank_score: scores[i] ?? 0,
    score_source: 'cross_encoder',
  }));

  ranked.sort((a, b) => b.rerank_score - a.rerank_score);
  return ranked;
}
