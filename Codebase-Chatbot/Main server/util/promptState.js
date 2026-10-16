export function promptState(prompt) {
  // Older rows predate the status column and stored errors as response text.
  if (prompt.status === 'failed' || prompt.response === 'Failed to generate response' || prompt.response === 'Error generating response') return 'failed';
  if (prompt.response) return 'done';
  return 'processing';
}
