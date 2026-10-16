import weaviate from 'weaviate-client';
import client from '../config/vectordb.config.js';

const COLLECTION_NAME = 'RepoCodeChunk';

/**
 * Idempotently ensures the RepoCodeChunk Weaviate collection exists with
 * the full new schema (all metadata fields + BM25 + JinaAI vectoriser).
 *
 * Call this once at worker startup before processing any jobs.
 */
export async function ensureSchema() {
  try {
    const schema = {
      name: COLLECTION_NAME,

      // JinaAI vectoriser (same key header already configured in the client)
      vectorizers: weaviate.configure.vectorizer.text2VecJinaAI({
        model: 'jina-embeddings-v2-base-code',
        // Only the 'text' property is vectorised.
        sourceProperties: ['text'],
      }),

      // BM25 configuration for keyword side of hybrid search
      invertedIndexConfig: {
        bm25: { b: 0.75, k1: 1.2 },
      },

      properties: [
        // ── Identity ──────────────────────────────────────────────────────────
        {
          name: 'chunk_id',
          dataType: weaviate.configure.dataType.TEXT,
          description: 'SHA-256(repo_id:file_path:start_line) — deterministic, stable across re-ingests',
          skipVectorization: true,
          moduleConfig: { 'text2vec-jinaai': { skip: true } },
        },
        {
          name: 'repo_id',
          dataType: weaviate.configure.dataType.INT,
          description: 'Integer PK from PostgreSQL REPO_INPUT table — used as the primary filter',
        },
        {
          name: 'repourl',
          dataType: weaviate.configure.dataType.TEXT,
          description: 'Repository URL (kept for backward compatibility)',
          skipVectorization: true,
          moduleConfig: { 'text2vec-jinaai': { skip: true } },
        },
        {
          name: 'userid',
          dataType: weaviate.configure.dataType.TEXT,
          description: 'User email (kept for backward compatibility)',
          skipVectorization: true,
          moduleConfig: { 'text2vec-jinaai': { skip: true } },
        },

        // ── Location ──────────────────────────────────────────────────────────
        {
          name: 'file_path',
          dataType: weaviate.configure.dataType.TEXT,
          description: 'Relative path from repo root (e.g. src/foo.py)',
          skipVectorization: true,
          moduleConfig: { 'text2vec-jinaai': { skip: true } },
        },
        {
          name: 'start_line',
          dataType: weaviate.configure.dataType.INT,
          description: '1-indexed first line of this chunk',
        },
        {
          name: 'end_line',
          dataType: weaviate.configure.dataType.INT,
          description: '1-indexed last line of this chunk',
        },

        // ── Unit (parent) ─────────────────────────────────────────────────────
        {
          name: 'unit_id',
          dataType: weaviate.configure.dataType.TEXT,
          description: 'SHA-256(repo_id:file_path:unit_name:start_line) — groups chunks that belong to the same function/class',
          skipVectorization: true,
          moduleConfig: { 'text2vec-jinaai': { skip: true } },
        },
        {
          name: 'signature',
          dataType: weaviate.configure.dataType.TEXT,
          description: 'First line / declaration of the parent unit — included in large-unit expansion',
          skipVectorization: true,
          moduleConfig: { 'text2vec-jinaai': { skip: true } },
        },
        {
          name: 'is_signature_chunk',
          dataType: weaviate.configure.dataType.BOOLEAN,
          description: 'True for the chunk that contains only the unit signature/header',
        },
        {
          name: 'chunk_index',
          dataType: weaviate.configure.dataType.INT,
          description: '0-based position of this chunk within its unit — used for neighbour expansion',
        },

        // ── Size ──────────────────────────────────────────────────────────────
        {
          name: 'token_count',
          dataType: weaviate.configure.dataType.INT,
          description: 'cl100k_base token count of the "text" field',
        },

        // ── Content ───────────────────────────────────────────────────────────
        {
          name: 'text',
          dataType: weaviate.configure.dataType.TEXT,
          description: 'The actual code/text content of this chunk — vectorised + BM25 indexed',
        },
      ],
    };

    if (await client.collections.exists(COLLECTION_NAME)) {
      const collection = client.collections.use(COLLECTION_NAME);
      const current = await collection.config.get();
      const existing = new Set(current.properties.map(property => property.name));
      for (const property of schema.properties) {
        if (!existing.has(property.name)) {
          await collection.config.addProperty(property);
          console.log(`[schema] Added missing property "${property.name}".`);
        }
      }
      return;
    }

    await client.collections.create(schema);

    console.log(`[schema] Collection "${COLLECTION_NAME}" created successfully.`);
  } catch (err) {
    console.error('[schema] ensureSchema error:', err.message || err);
    throw err;
  }
}
