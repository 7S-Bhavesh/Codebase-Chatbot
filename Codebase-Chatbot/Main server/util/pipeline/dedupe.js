/**
 * Pipeline stage 5 — Deduplication
 *
 * Pure function: (chunks) → Chunk[]
 *
 * Removes duplicate chunks by chunk_id, keeping the first occurrence
 * (which will have the highest score after sort, or the retrieved copy
 * over the inherited copy when expansion added duplicates).
 */

/**
 * @param {object[]} chunks  Chunk list (may contain duplicates after expansion).
 * @returns {object[]}       De-duplicated chunk list preserving order.
 */
export function dedupe(chunks) {
  const seen = new Set();
  const result = [];

  for (const chunk of chunks) {
    const id = chunk.chunk_id;
    if (!seen.has(id)) {
      seen.add(id);
      result.push(chunk);
    }
  }

  return result;
}
