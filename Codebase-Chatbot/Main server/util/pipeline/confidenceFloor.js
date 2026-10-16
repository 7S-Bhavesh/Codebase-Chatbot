/**
 * Pipeline stage 3 — Confidence Floor
 *
 * Pure function: (chunks, config) → { chunks, lowConfidence }
 *
 * Checks if the top reranker score meets the absolute floor (ABS_FLOOR).
 * If not, the pipeline continues but the LLM is told retrieval confidence
 * is low and instructed to say "not found in the repository".
 *
 * This stage is a pure read — it does NOT modify or filter the chunk list.
 */

/**
 * @param {object[]} chunks  Chunks sorted by rerank_score desc (after rerank stage).
 * @param {object}   config  RAG_CONFIG (ABS_FLOOR).
 * @returns {{ chunks: object[], lowConfidence: boolean }}
 */
export function checkConfidence(chunks, config) {
  const { ABS_FLOOR } = config;

  if (chunks.length === 0) {
    return { chunks, lowConfidence: true };
  }

  const topScore = chunks[0].rerank_score ?? chunks[0].hybrid_score ?? 0;
  const lowConfidence = topScore < ABS_FLOOR;

  if (lowConfidence) {
    console.log(`[confidence] Top score ${topScore.toFixed(4)} < ABS_FLOOR ${ABS_FLOOR} — low confidence`);
  }

  return { chunks, lowConfidence };
}
