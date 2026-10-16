// Local fixtures only: no database changes or calls to external providers.
// Run with node --experimental-test-module-mocks --test tests/ragTrace.integration.test.js
import { test, mock } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, readdir, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';

const calls = [];
mock.module('@google/genai', { namedExports: { GoogleGenAI: class {
  models = { generateContent: async request => {
    calls.push(request);
    if (request.contents.includes('provider failure')) throw Object.assign(new Error('fixture failure'), { status: 401 });
    return { text: 'The fixture provisions infrastructure with Terraform.' };
  } };
} } });
mock.module('../client/weaviate.client.js', { defaultExport: { collections: { use: () => ({}) } } });
mock.module('../util/pipeline/retrieve.js', { namedExports: { hybridRetrieve: async query => {
  if (query === 'retrieval failure') throw new Error('fixture retrieval failure');
  return [{ chunk_id: 'fixture-chunk', unit_id: 'fixture-unit', file_path: 'main.tf', start_line: 1, end_line: 2, text: 'resource "aws_instance" "example" {}\n', hybrid_score: 0.8, token_count: 10, inherited: false }];
} } });
const { generation } = await import('../util/ragOutput.js');

test('pipeline traces match real call arguments and retain evidence for failures', async t => {
  const directory = await mkdtemp(path.join(tmpdir(), 'rag-pipeline-test-'));
  const previousDirectory = process.env.RAG_TRACE_DIR;
  process.env.RAG_TRACE_DIR = directory;
  t.mock.method(globalThis, 'fetch', async () => new Response(JSON.stringify({ scores: [2.5] }), { status: 200 }));
  try {
    const invoke = (query, promptId) => generation(query, 'fixture@example.invalid', 'fixture', 1, { ENABLE_EXPAND: false }, async () => {}, { promptId, chatId: 2 });
    const success = await invoke('Which provisioning tool?', 901);
    const providerFailure = await invoke('provider failure', 902);
    const retrievalFailure = await invoke('retrieval failure', 903);
    // Exercise the real rerank fallback, including its score provenance.
    t.mock.method(globalThis, 'fetch', async () => new Response('unavailable', { status: 503 }));
    const fallback = await invoke('Which provisioning tool with fallback?', 904);
    assert.equal(success.success, true);
    assert.equal(providerFailure.error_code, 'GEMINI_ERROR');
    assert.equal(retrievalFailure.error_code, 'RETRIEVAL_FAILED');
    assert.equal(fallback.success, true);
    const files = (await readdir(directory)).filter(name => name.endsWith('.jsonl'));
    assert.equal(files.length, 4);
    async function eventsFor(promptId) {
      const file = files.find(name => name.startsWith(`prompt-${promptId}-`));
      return (await readFile(path.join(directory, file), 'utf8')).trim().split('\n').map(JSON.parse);
    }
    const events = await eventsFor(901);
    assert.equal(events.find(e => e.event === 'final_prompt').data.prompt, calls[0].contents);
    assert.equal(events.find(e => e.event === 'final_prompt').data.model, calls[0].model);
    assert.equal(events.find(e => e.event === 'retrieved_chunks').data.chunks[0].text, 'resource "aws_instance" "example" {}\n');
    const ranked = events.find(e => e.event === 'reranked_chunks').data.chunks[0];
    assert.equal(ranked.rerank_score, 2.5);
    assert.equal(ranked.score_source, 'cross_encoder');
    assert.equal(events.at(-1).event, 'completed');
    const failed = await eventsFor(902);
    assert.equal(failed.find(e => e.event === 'final_prompt').data.prompt, calls[1].contents);
    assert.equal(failed.at(-1).event, 'failed');
    const earlyFailure = await eventsFor(903);
    assert.equal(earlyFailure.at(-1).data.stage, 'retrieval');
    assert.ok(!earlyFailure.some(e => e.event === 'final_prompt'));
    const fallbackEvents = await eventsFor(904);
    const fallbackChunk = fallbackEvents.find(e => e.event === 'reranked_chunks').data.chunks[0];
    assert.equal(fallbackChunk.score_source, 'hybrid_fallback');
    assert.equal(fallbackChunk.rerank_score, 0.8);
    const fallbackFile = files.find(name => name.startsWith('prompt-904-'));
    const fallbackSummary = await readFile(path.join(directory, fallbackFile.replace(/\.jsonl$/, '.summary.txt')), 'utf8');
    assert.match(fallbackSummary, /Chunks scored by the reranker: 0/);
    assert.match(fallbackSummary, /1 chunks used search scores instead/);
    assert.match(fallbackSummary, /Chunks included in the final LLM prompt: 1/);
    const earlyFile = files.find(name => name.startsWith('prompt-903-'));
    const earlySummary = await readFile(path.join(directory, earlyFile.replace(/\.jsonl$/, '.summary.txt')), 'utf8');
    assert.match(earlySummary, /Chunks retrieved: not reached/);
    assert.match(earlySummary, /Result: failed at retrieval/);
  } finally {
    if (previousDirectory === undefined) delete process.env.RAG_TRACE_DIR;
    else process.env.RAG_TRACE_DIR = previousDirectory;
    await rm(directory, { recursive: true, force: true });
  }
});
