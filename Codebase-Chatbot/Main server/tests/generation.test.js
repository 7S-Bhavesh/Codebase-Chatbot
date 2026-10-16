import test from 'node:test';
import assert from 'node:assert/strict';
import { generateWithRetry, generationErrorMessage } from '../util/generateWithRetry.js';
import { promptState } from '../util/promptState.js';

test('retries provider overload and returns the successful answer', async () => {
  let calls = 0;
  const waits = [];
  const ai = { models: { generateContent: async request => {
    assert.equal(request.config.httpOptions.timeout, 30000);
    if (++calls < 3) throw Object.assign(new Error('busy'), { status: 503 });
    return { text: 'An answer' };
  } } };
  assert.equal((await generateWithRetry(ai, { model: 'test' }, { sleep: async ms => waits.push(ms) })).text, 'An answer');
  assert.deepEqual(waits, [1000, 2000]);
});

test('persistent overload has bounded attempts and a useful failure message', async () => {
  let calls = 0;
  const error = Object.assign(new Error('busy'), { status: 503 });
  const ai = { models: { generateContent: async () => { calls++; throw error; } } };
  await assert.rejects(generateWithRetry(ai, {}, { sleep: async () => {} }), error);
  assert.equal(calls, 3);
  assert.match(generationErrorMessage(error), /temporarily unavailable/);
});

test('does not retry invalid credentials or accept empty responses', async () => {
  let calls = 0;
  const ai = { models: { generateContent: async () => { calls++; throw Object.assign(new Error('invalid key'), { status: 401 }); } } };
  await assert.rejects(generateWithRetry(ai, {}), /invalid key/);
  assert.equal(calls, 1);
  await assert.rejects(generateWithRetry({ models: { generateContent: async () => ({ text: ' ' }) } }, {}), /empty response/);
});

test('existing responses and legacy failures survive the status migration', () => {
  assert.equal(promptState({ status: 'processing', response: 'Saved answer' }), 'done');
  assert.equal(promptState({ status: 'processing', response: 'Failed to generate response' }), 'failed');
  assert.equal(promptState({ status: 'failed', response: 'Temporary outage' }), 'failed');
  assert.equal(promptState({ response: null }), 'processing');
});

test('daily quota exhaustion is not retried and reports the provider wait time', async () => {
  let calls = 0;
  const error = Object.assign(new Error(JSON.stringify({ error: {
    code: 429, details: [
      { '@type': 'type.googleapis.com/google.rpc.QuotaFailure', violations: [{ quotaId: 'GenerateRequestsPerDayPerProjectPerModel-FreeTier' }] },
      { '@type': 'type.googleapis.com/google.rpc.RetryInfo', retryDelay: '25059s' },
    ],
  } })), { status: 429 });
  await assert.rejects(generateWithRetry({ models: { generateContent: async () => { calls++; throw error; } } }, {}), error);
  assert.equal(calls, 1);
  assert.match(generationErrorMessage(error), /daily request quota is exhausted/);
  assert.match(generationErrorMessage(error), /7 hours/);
});
