/**
 * Pipeline stage 6 — Cut, Pack & Sort
 *
 * Pure function: (chunks, config) → Chunk[]
 *
 * Algorithm:
 *  1. Unit-level relative threshold cut (score >= REL_THRESHOLD * top),
 *     always keeping at least MIN_UNITS worth of chunks.
 *  2. Sort remaining chunks: directly-retrieved first (inherited last),
 *     then by rerank_score desc within each tier.
 *  3. Greedily pack into TOKEN_BUDGET.
 *  4. Re-sort selected chunks by (file_path, start_line) for prompt ordering.
 */

/**
 * Token counting: use js-tiktoken if available, else chars/4.
 */
let _enc = null;
async function getEncoder() {
  if (_enc !== undefined) return _enc;
  try {
    const { get_encoding } = await import('js-tiktoken');
    _enc = get_encoding('cl100k_base');
  } catch {
    _enc = null;
  }
  return _enc;
}

function tokenCount(text, enc) {
  if (enc) return enc.encode(text).length;
  return Math.ceil(text.length / 4);
}

/**
 * @param {object[]} chunks  De-duplicated chunks after dedupe stage.
 * @param {object}   config  RAG_CONFIG (REL_THRESHOLD, MIN_UNITS, TOKEN_BUDGET).
 * @returns {Promise<object[]>} Final packed+sorted chunk list for the prompt.
 */
export async function packAndSort(chunks, config) {
  const { REL_THRESHOLD, MIN_UNITS, TOKEN_BUDGET } = config;

  if (chunks.length === 0) return [];

  const enc = await getEncoder();

  // ── 1. Unit-level threshold cut ───────────────────────────────────────────
  // Compute max score per unit
  const unitMaxScore = new Map();
  for (const c of chunks) {
    const score = c.rerank_score ?? c.hybrid_score ?? 0;
    unitMaxScore.set(c.unit_id, Math.max(unitMaxScore.get(c.unit_id) ?? 0, score));
  }

  const topScore = Math.max(...unitMaxScore.values());
  const cutoff   = REL_THRESHOLD * topScore;

  // Sort units by score desc; take MIN_UNITS unconditionally, rest only if >= cutoff
  const sortedUnits = [...unitMaxScore.entries()].sort((a, b) => b[1] - a[1]);
  const keepUnits   = new Set();

  for (let i = 0; i < sortedUnits.length; i++) {
    const [uid, score] = sortedUnits[i];
    if (i < MIN_UNITS || score >= cutoff) {
      keepUnits.add(uid);
    }
  }

  const filtered = chunks.filter(c => keepUnits.has(c.unit_id));

  // ── 2. Sort: retrieved before inherited, then by score desc ───────────────
  const sorted = [...filtered].sort((a, b) => {
    if (a.inherited !== b.inherited) return a.inherited ? 1 : -1;
    const sa = a.rerank_score ?? a.hybrid_score ?? 0;
    const sb = b.rerank_score ?? b.hybrid_score ?? 0;
    return sb - sa;
  });

  // ── 3. Greedy token-budget packing ────────────────────────────────────────
  let usedTokens = 0;
  const selected = [];

  for (const chunk of sorted) {
    const t = chunk.token_count ?? tokenCount(chunk.text ?? '', enc);
    if (usedTokens + t > TOKEN_BUDGET) continue; // skip if won't fit
    selected.push({ ...chunk, _packed_tokens: t });
    usedTokens += t;
  }

  // ── 4. Re-sort by (file_path, start_line) for prompt readability ──────────
  selected.sort((a, b) => {
    const fp = (a.file_path ?? '').localeCompare(b.file_path ?? '');
    if (fp !== 0) return fp;
    return (a.start_line ?? 0) - (b.start_line ?? 0);
  });

  return selected;
}
