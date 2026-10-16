/**
 * Pipeline stage 4 — Parent-Unit Expansion
 *
 * Pure async function: (chunks, config, collection) → Chunk[]
 *
 * Algorithm:
 *  1. Group reranked chunks by unit_id; unit score = max chunk score.
 *  2. Select units: score >= REL_THRESHOLD * top_unit_score AND within top MAX_EXPANDED_UNITS.
 *  3. For each selected unit, fetch all its chunks from Weaviate.
 *  4. If unit.token_count <= LARGE_UNIT_TOKENS: include all fetched chunks.
 *     Else: include signature chunk + retrieved chunks + 1 neighbour on each side.
 *  5. Merge adjacent spans (contiguous chunk_index ranges) within a unit.
 *  6. Expanded (non-retrieved) chunks are marked inherited=true and their
 *     score is set to unit_score * INHERIT_DISCOUNT.
 */

const RETURN_PROPERTIES = [
  'chunk_id', 'repo_id', 'file_path', 'start_line', 'end_line',
  'unit_id', 'signature', 'is_signature_chunk', 'chunk_index',
  'token_count', 'text', 'repourl', 'userid',
];

/**
 * Fetch all chunks for a unit from Weaviate, sorted by chunk_index.
 */
async function fetchUnitChunks(unitId, collection) {
  const result = await collection.query.fetchObjects({
    filters: collection.filter.byProperty('unit_id').equal(unitId),
    returnProperties: RETURN_PROPERTIES,
    limit: 500, // hard cap — no unit should have > 500 chunks
  });

  const chunks = result.objects.map(obj => ({
    ...obj.properties,
    rerank_score: null,
    hybrid_score: 0,
    inherited: true,
  }));

  chunks.sort((a, b) => (a.chunk_index ?? 0) - (b.chunk_index ?? 0));
  return chunks;
}

/**
 * Merge a set of chunk_indices into minimal contiguous spans.
 * E.g. [0,1,3,4,5] → [[0,1],[3,5]]
 */
function buildSpans(indices) {
  if (indices.length === 0) return [];
  const sorted = [...new Set(indices)].sort((a, b) => a - b);
  const spans = [[sorted[0], sorted[0]]];
  for (let i = 1; i < sorted.length; i++) {
    if (sorted[i] === spans.at(-1)[1] + 1) {
      spans.at(-1)[1] = sorted[i];
    } else {
      spans.push([sorted[i], sorted[i]]);
    }
  }
  return spans;
}

/**
 * @param {object[]} retrievedChunks  Chunks from rerank stage (sorted by rerank_score desc).
 * @param {object}   config           RAG_CONFIG.
 * @param {object}   collection       Weaviate collection handle.
 * @returns {Promise<object[]>}       Expanded chunk list (may include inherited chunks).
 */
export async function expandToParent(retrievedChunks, config, collection) {
  const {
    REL_THRESHOLD,
    MAX_EXPANDED_UNITS,
    LARGE_UNIT_TOKENS,
    INHERIT_DISCOUNT,
  } = config;

  if (retrievedChunks.length === 0) return [];

  // ── 1. Group retrieved chunks by unit ──────────────────────────────────────
  const unitMap = new Map(); // unit_id → { score, chunks[] }

  for (const chunk of retrievedChunks) {
    const uid   = chunk.unit_id;
    const score = chunk.rerank_score ?? chunk.hybrid_score ?? 0;

    if (!unitMap.has(uid)) {
      unitMap.set(uid, { score: 0, chunks: [] });
    }
    const entry = unitMap.get(uid);
    entry.score = Math.max(entry.score, score);
    entry.chunks.push(chunk);
  }

  const topUnitScore = Math.max(...[...unitMap.values()].map(u => u.score));

  // ── 2. Select units to expand ──────────────────────────────────────────────
  const sortedUnits = [...unitMap.entries()]
    .filter(([, u]) => u.score >= REL_THRESHOLD * topUnitScore)
    .sort((a, b) => b[1].score - a[1].score)
    .slice(0, MAX_EXPANDED_UNITS);

  // ── 3–5. Expand each selected unit ────────────────────────────────────────
  const result = [];
  const retrievedIds = new Set(retrievedChunks.map(c => c.chunk_id));

  for (const [unitId, unit] of sortedUnits) {
    const unitScore = unit.score;

    // Fetch all chunks for this unit
    const allUnitChunks = await fetchUnitChunks(unitId, collection);
    if (allUnitChunks.length === 0) {
      // Unit chunks missing from Weaviate — include whatever we retrieved
      result.push(...unit.chunks);
      continue;
    }

    // Compute total unit token count
    const totalTokens = allUnitChunks.reduce((s, c) => s + (c.token_count ?? 0), 0);

    let includedIndices = new Set();

    if (totalTokens <= LARGE_UNIT_TOKENS) {
      // Small unit: include everything
      for (const c of allUnitChunks) includedIndices.add(c.chunk_index ?? 0);
    } else {
      // Large unit: signature + retrieved + 1 neighbour each side
      const maxIdx = allUnitChunks.length - 1;

      // Always include the signature chunk (index 0)
      includedIndices.add(0);

      // Include each retrieved chunk and its neighbours
      for (const rc of unit.chunks) {
        const idx = rc.chunk_index ?? 0;
        includedIndices.add(Math.max(0, idx - 1));
        includedIndices.add(idx);
        includedIndices.add(Math.min(maxIdx, idx + 1));
      }
    }

    // Merge into contiguous spans (for readability — not strictly required)
    const spans = buildSpans([...includedIndices]);
    const indexSet = new Set(includedIndices);

    for (const chunk of allUnitChunks) {
      const idx = chunk.chunk_index ?? 0;
      if (!indexSet.has(idx)) continue;

      const isRetrieved = retrievedIds.has(chunk.chunk_id);
      result.push({
        ...chunk,
        rerank_score: isRetrieved
          ? (chunk.rerank_score ?? unitScore)
          : unitScore * INHERIT_DISCOUNT,
        hybrid_score: chunk.hybrid_score ?? 0,
        inherited: !isRetrieved,
      });
    }
  }

  return result;
}
