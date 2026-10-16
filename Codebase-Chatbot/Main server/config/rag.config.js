// ─── RAG Pipeline Configuration ───────────────────────────────────────────────
// Single source of truth for all pipeline knobs.
// Override individual keys via process.env where indicated.
// Stage flags can all be set to false for the "baseline (old top-5)" ablation.

export const RAG_CONFIG = {
  // ── Retrieval ────────────────────────────────────────────────────────────────
  /** Number of candidates fetched from Weaviate before reranking. */
  K_RETRIEVE: 30,

  /** Hybrid-search balance: 0 = BM25 only, 1 = dense only, 0.5 = equal. */
  ALPHA: 0.5,

  /**
   * Weaviate fusion algorithm.
   * 'relativeScore' — normalises dense + BM25 scores then combines.
   * 'rankedFusion'  — reciprocal-rank fusion (RRF).
   */
  FUSION_TYPE: 'relativeScore', // 'relativeScore' | 'rankedFusion'

  // ── Reranker ─────────────────────────────────────────────────────────────────
  /** URL of the cross-encoder sidecar. Overridable via env. */
  RERANKER_URL: process.env.RERANKER_URL || 'http://reranker:8000',

  /** HuggingFace model name passed to the sidecar on each request. */
  RERANKER_MODEL: process.env.RERANKER_MODEL || 'cross-encoder/ms-marco-MiniLM-L-6-v2',

  // ── Confidence ───────────────────────────────────────────────────────────────
  /**
   * Absolute floor on the top reranker score (logit, not probability).
   * If top score < ABS_FLOOR the LLM is told retrieval confidence is low.
   * Calibrate by inspecting eval/results_*.json top-1 scores.
   */
  ABS_FLOOR: 0.1,

  // ── Parent expansion ─────────────────────────────────────────────────────────
  /**
   * A unit is expanded only if its score >= REL_THRESHOLD * top_unit_score.
   * Also applied as unit-level cut in the packing stage.
   */
  REL_THRESHOLD: 0.6,

  /** Hard cap on how many units may be expanded. */
  MAX_EXPANDED_UNITS: 5,

  /**
   * Units with token_count <= LARGE_UNIT_TOKENS get all their chunks included.
   * Larger units get: signature chunk + retrieved chunks + 1 neighbor each side.
   */
  LARGE_UNIT_TOKENS: 900,

  /**
   * Score multiplier applied to expanded (non-directly-retrieved) chunks.
   * Ensures directly-retrieved chunks outrank inherited ones when packing.
   */
  INHERIT_DISCOUNT: 0.8,

  // ── Packing ───────────────────────────────────────────────────────────────────
  /** Always include at least this many units even if below REL_THRESHOLD. */
  MIN_UNITS: 2,

  /**
   * Maximum tokens to pack into the context window (prompt side only).
   * Uses cl100k_base token counts as a proxy for Gemini tokenisation.
   */
  TOKEN_BUDGET: 8000,

  // ── Stage feature flags ───────────────────────────────────────────────────────
  // Set any to false to disable that stage (used for ablation in eval/).
  ENABLE_RERANK: true,
  ENABLE_EXPAND: true,
  ENABLE_DEDUPE: true,
  ENABLE_THRESHOLD: true,
};
