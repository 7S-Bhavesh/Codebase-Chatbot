/**
 * buildAugmentedPrompt — constructs the LLM prompt from packed context chunks.
 *
 * Each context block is prefixed with its file path and line range so the LLM
 * can cite exact locations in its answer.
 *
 * When lowConfidence is true the LLM is instructed to surface that fact and
 * fall back to "not found in the repository" rather than hallucinating.
 */

/**
 * @param {string}   userQuery    The user's original question.
 * @param {object[]} chunks       Final packed+sorted chunks from the pipeline.
 * @param {boolean}  lowConfidence Whether the retrieval confidence floor was not met.
 * @returns {string}  Prompt string ready to send to the LLM.
 */
export function buildAugmentedPrompt(userQuery, chunks, lowConfidence = false) {
  // ── No context at all ─────────────────────────────────────────────────────
  if (!chunks || chunks.length === 0) {
    return `User Question:\n${userQuery}\n\n` +
      `No relevant code was found in the repository. ` +
      `Answer: "not found in the repository".`;
  }

  // ── Build context blocks ──────────────────────────────────────────────────
  let contextText = '';

  for (const chunk of chunks) {
    const filePath  = chunk.file_path  || 'unknown file';
    const startLine = chunk.start_line ?? '?';
    const endLine   = chunk.end_line   ?? '?';
    const signature = chunk.signature  ? ` — ${chunk.signature}` : '';
    const inherited = chunk.inherited  ? ' (context)' : '';

    contextText +=
      `### ${filePath} · Lines ${startLine}–${endLine}${signature}${inherited}\n` +
      '```\n' +
      (chunk.text ?? '') + '\n' +
      '```\n\n';
  }

  // ── Confidence guidance ───────────────────────────────────────────────────
  const confidenceNote = lowConfidence
    ? `\n⚠ RETRIEVAL CONFIDENCE IS LOW — the snippets below may not be closely ` +
      `related to the question. If the context is insufficient, say ` +
      `"not found in the repository" rather than guessing.\n`
    : '';

  // ── Final prompt ──────────────────────────────────────────────────────────
  return `User question:
${userQuery}
${confidenceNote}
Below are relevant code snippets retrieved from the repository. Each block
shows the file path and line range. Cite them when explaining your answer.

${contextText}
INSTRUCTIONS:
- Answer using ONLY the context above.
- When referencing code, mention the file name and line range (e.g. "in \`src/foo.py\` lines 10–45").
- If the context does not contain enough information to answer, respond with:
  "not found in the repository"
- Answer in clear, concise language. Do not fabricate code or behaviour not shown above.
`;
}
