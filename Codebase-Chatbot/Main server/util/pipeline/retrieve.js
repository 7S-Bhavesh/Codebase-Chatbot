/**
 * Pipeline stage 1 — Hybrid Retrieval
 *
 * Pure function: (query, repoId, config, collection) → Chunk[]
 *
 * Uses Weaviate hybrid search (dense BM25 fusion) filtered by repo_id.
 * Returns raw Weaviate objects normalised to a plain chunk dict.
 */

const RETURN_PROPERTIES = [
  'chunk_id', 'repo_id', 'file_path', 'start_line', 'end_line',
  'unit_id', 'signature', 'is_signature_chunk', 'chunk_index',
  'token_count', 'text', 'repourl', 'userid',
];

/**
 * @param {string}   query       User question.
 * @param {number}   repoId      Integer repo_id to filter on.
 * @param {object}   config      RAG_CONFIG (K_RETRIEVE, ALPHA, FUSION_TYPE).
 * @param {object}   collection  Weaviate collection handle from client.collections.use().
 * @returns {Promise<object[]>}  Array of chunk dicts with a `.hybrid_score` field.
 */
export async function hybridRetrieve(query, repoId, config, collection) {
  const { K_RETRIEVE, ALPHA, FUSION_TYPE } = config;

  const fusionType = FUSION_TYPE === 'rankedFusion'
    ? 'rankedFusion'       // RRF — Weaviate enum value
    : 'relativeScore';     // default — normalised score fusion

  const result = await collection.query.hybrid(query, {
    limit: K_RETRIEVE,
    alpha: ALPHA,
    fusionType,
    filters: collection.filter.byProperty('repo_id').equal(repoId),
    returnProperties: RETURN_PROPERTIES,
    returnMetadata: ['score'],
  });

  return result.objects.map(obj => ({
    ...obj.properties,
    hybrid_score: obj.metadata?.score ?? 0,
    rerank_score: null,   // populated by rerank stage
    inherited:    false,  // set by expand stage
  }));
}
