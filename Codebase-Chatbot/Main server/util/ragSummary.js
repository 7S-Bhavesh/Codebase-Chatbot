// Formats both live events and existing JSONL traces without calling any service.
export function formatRagSummary(events) {
  const find = event => events.find(entry => entry.event === event);
  const start = find('request_started');
  const retrieved = find('retrieved_chunks');
  const ranked = find('reranked_chunks');
  const selected = find('selected_context');
  const prompt = find('final_prompt');
  const last = events.at(-1);
  const result = find('completed') || find('failed');
  const count = value => Number.isFinite(value) ? value : 'not reached';
  const seconds = milliseconds => `${(milliseconds / 1000).toFixed(2)} seconds`;
  const scored = ranked?.data.chunks?.filter(chunk => chunk.score_source === 'cross_encoder').length ?? 0;
  const fallback = ranked?.data.chunks?.filter(chunk => chunk.score_source === 'hybrid_fallback').length ?? 0;
  const disabled = ranked?.data.chunks?.filter(chunk => chunk.score_source === 'hybrid_rerank_disabled').length ?? 0;
  const retries = events.filter(entry => entry.event === 'generation_retry').length;
  const question = String(start?.data.query ?? '(not recorded)').replace(/\s+/g, ' ').trim();
  const lines = [
    `[rag-summary] Request #${last?.prompt_id ?? last?.request_id ?? 'unknown'}`,
    `Question: ${question}`,
    `Chunks retrieved: ${count(retrieved?.data.count)}`,
    `Chunks scored by the reranker: ${ranked ? scored : 'not reached'}`,
  ];
  if (fallback) lines.push(`Reranker unavailable: ${fallback} chunks used search scores instead.`);
  if (disabled) lines.push(`Reranking disabled: ${disabled} chunks used search scores.`);
  if (selected) {
    const data = selected.data;
    lines.push(`Chunks after context expansion: ${data.expanded_count}`);
    lines.push(`Duplicate chunks removed: ${data.expanded_count - data.deduped_count}`);
    lines.push(`Unique chunks remaining: ${data.deduped_count}`);
    lines.push(`Chunks selected for the LLM: ${data.count}`);
    const tokenCounts = data.chunks?.map(chunk => chunk.token_count) ?? [];
    if (tokenCounts.length === data.count && tokenCounts.every(Number.isFinite)) {
      lines.push(`Estimated code-context tokens: ${tokenCounts.reduce((sum, tokens) => sum + tokens, 0)} (excludes question and instructions)`);
    }
    lines.push(`Retrieval confidence: ${data.low_confidence ? 'low; the model was instructed to avoid guessing' : 'passed the configured threshold'}`);
  }
  lines.push(`Chunks included in the final LLM prompt: ${prompt ? count(selected?.data.count) : 'not reached'}`);
  lines.push(`Model: ${prompt?.data.model ?? 'not reached'}`);
  if (prompt) lines.push(`Final prompt size: ${prompt.data.prompt_chars} characters`);
  if (ranked && retrieved) lines.push(`Reranking stage time: approximately ${seconds(ranked.elapsed_ms - retrieved.elapsed_ms)}`);
  lines.push(`Retries: ${retries}`);
  if (result?.event === 'completed') lines.push('Result: answer generated successfully');
  else if (result?.event === 'failed') lines.push(`Result: failed at ${result.data.stage} (${result.data.error_code ?? 'unknown error'})`);
  else lines.push('Result: incomplete; no completion or failure event recorded');
  lines.push(`Total recorded processing time: ${seconds(last?.elapsed_ms ?? 0)}`);
  if (retrieved && ranked && selected && prompt) {
    lines.push(`Flow: ${retrieved.data.count} retrieved -> ${scored} reranked${fallback ? ` (${fallback} search-score fallbacks)` : ''}${disabled ? ' (reranking disabled)' : ''} -> ${selected.data.deduped_count} unique -> ${selected.data.count} in LLM prompt -> ${result?.event === 'completed' ? 'answer generated' : result?.event === 'failed' ? 'failed' : 'incomplete'}`);
  }
  return lines.join('\n') + '\n';
}
