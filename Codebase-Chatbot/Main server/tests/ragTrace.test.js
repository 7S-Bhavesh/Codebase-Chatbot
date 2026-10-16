import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { createRagTrace, traceChunks } from '../util/ragTrace.js';

test('simultaneous requests keep separate ordered traces and exact multiline prompts', async () => {
  const directory = await mkdtemp(path.join(tmpdir(), 'rag-trace-test-'));
  try {
    const a = createRagTrace({ promptId: 10, chatId: 20, repoId: 30 }, { directory });
    const b = createRagTrace({ promptId: 11, chatId: 21, repoId: 30 }, { directory });
    const prompt = 'Question: "why?"\n```js\nconst value = "Ω";\n```';
    await Promise.all([
      a.write('request_started', { query: 'why?' }), b.write('request_started', { query: 'where?' }),
      a.write('final_prompt', { prompt }), b.write('failed', { stage: 'retrieval' }),
      a.write('completed', { answer: 'answer' }),
    ]);
    const eventsA = (await readFile(a.file, 'utf8')).trim().split('\n').map(JSON.parse);
    const eventsB = (await readFile(b.file, 'utf8')).trim().split('\n').map(JSON.parse);
    assert.deepEqual(eventsA.map(e => e.event), ['request_started', 'final_prompt', 'completed']);
    assert.deepEqual(eventsB.map(e => e.event), ['request_started', 'failed']);
    assert.equal(eventsA[1].data.prompt, prompt);
    assert.ok(eventsA.every(e => e.prompt_id === 10 && e.chat_id === 20 && e.repo_id === 30));
    assert.notEqual(eventsA[0].request_id, eventsB[0].request_id);
    assert.match(await readFile(a.summaryFile, 'utf8'), /Request #10\nQuestion: why\?/);
    assert.match(await readFile(b.summaryFile, 'utf8'), /Request #11\nQuestion: where\?/);
  } finally { await rm(directory, { recursive: true, force: true }); }
});

test('chunk traces preserve code and negative scores without copying unrelated metadata', () => {
  const [chunk] = traceChunks([{ text: 'code\ntext', rerank_score: -5.25, hybrid_score: 0.7, score_source: 'cross_encoder', userid: 'private@example.com', apiKey: 'secret' }]);
  assert.equal(chunk.text, 'code\ntext');
  assert.equal(chunk.rerank_score, -5.25);
  assert.equal(chunk.score_source, 'cross_encoder');
  assert.ok(!('userid' in chunk));
  assert.ok(!('apiKey' in chunk));
});

test('unwritable trace destination reports failures without rejecting generation work', async t => {
  const directory = await mkdtemp(path.join(tmpdir(), 'rag-trace-test-'));
  try {
    const blockedPath = path.join(directory, 'file');
    await writeFile(blockedPath, 'not a directory');
    const errors = [];
    t.mock.method(console, 'error', message => errors.push(message));
    const trace = createRagTrace({}, { directory: blockedPath });
    await assert.doesNotReject(trace.write('request_started', { query: 'question' }));
    await assert.doesNotReject(trace.write('completed', { answer: 'answer' }));
    assert.equal(errors.length, 2);
    assert.ok(errors.every(message => message.includes('write_failed')));
  } finally { await rm(directory, { recursive: true, force: true }); }
});
