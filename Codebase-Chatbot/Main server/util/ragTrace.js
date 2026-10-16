import { appendFile, mkdir, writeFile } from 'node:fs/promises';
import { randomUUID } from 'node:crypto';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { formatRagSummary } from './ragSummary.js';

const defaultDirectory = fileURLToPath(new URL('../logs/rag/', import.meta.url));

// Explicit fields keep credentials, HTTP headers, and user emails out of metadata.
// Code and question text are intentionally recorded in full for RAG debugging.
export function traceChunks(chunks) {
  return chunks.map((chunk, index) => ({
    rank: index + 1,
    chunk_id: chunk.chunk_id ?? null,
    unit_id: chunk.unit_id ?? null,
    file_path: chunk.file_path ?? null,
    start_line: chunk.start_line ?? null,
    end_line: chunk.end_line ?? null,
    signature: chunk.signature ?? null,
    chunk_index: chunk.chunk_index ?? null,
    is_signature_chunk: chunk.is_signature_chunk ?? false,
    hybrid_score: chunk.hybrid_score ?? null,
    rerank_score: chunk.rerank_score ?? null,
    score_source: chunk.score_source ?? null,
    inherited: chunk.inherited ?? false,
    token_count: chunk._packed_tokens ?? chunk.token_count ?? null,
    text: chunk.text ?? '',
  }));
}

export function createRagTrace({ promptId = null, chatId = null, repoId = null } = {}, {
  directory = process.env.RAG_TRACE_DIR || defaultDirectory,
} = {}) {
  const requestId = randomUUID();
  const started = Date.now();
  const prefix = Number.isSafeInteger(promptId) ? `prompt-${promptId}` : 'request';
  const file = path.join(directory, `${prefix}-${requestId}.jsonl`);
  const summaryFile = path.join(directory, `${prefix}-${requestId}.summary.txt`);
  const identity = { request_id: requestId, prompt_id: promptId, chat_id: chatId, repo_id: repoId };
  let queue = Promise.resolve();
  let announced = false;
  const events = [];

  function write(event, data = {}) {
    // Serialise immediately: subsequent pipeline mutations cannot alter this snapshot.
    const line = JSON.stringify({ ...identity, timestamp: new Date().toISOString(), elapsed_ms: Date.now() - started, event, data }) + '\n';
    events.push(JSON.parse(line));
    const summary = event === 'completed' || event === 'failed' ? formatRagSummary(events) : null;
    queue = queue.then(async () => {
      // One console write keeps each request's summary together, even if disk logging fails.
      if (summary) console.log(summary);
      await mkdir(directory, { recursive: true });
      await appendFile(file, line, { encoding: 'utf8', mode: 0o600 });
      if (summary) await writeFile(summaryFile, summary, { encoding: 'utf8', mode: 0o600 });
      if (!announced) {
        console.log(`[rag-trace] request=${requestId} prompt=${promptId ?? 'none'} file=${file}`);
        announced = true;
      }
      console.log(`[rag-trace] request=${requestId} prompt=${promptId ?? 'none'} event=${event}`);
    }).catch(error => {
      // Trace storage failures must not prevent the user from receiving an answer.
      console.error(`[rag-trace] request=${requestId} event=${event} write_failed code=${error.code || 'unknown'}`);
    });
    return queue;
  }

  return { requestId, file, summaryFile, write };
}
