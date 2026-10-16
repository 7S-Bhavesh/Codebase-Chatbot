// Run inside the backend container: node scripts/smoke-test.js
// Exercises real services, then removes only the records created by this run.
// Weaviate cleanup requires delete_data permission on RepoCodeChunk.
import 'dotenv/config';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { setTimeout as delay } from 'node:timers/promises';
import { Queue } from 'bullmq';
import connection from '../config/bullmq.config.js';
import client from '../client/weaviate.client.js';
import sequelize from '../db/sequelize.js';
import Auth from '../models/authModel.js';
import RepoInput from '../models/repoInputModel.js';

const email = `smoke-${randomUUID()}@example.invalid`;
const password = randomUUID();
const queue = new Queue('repo-index-queue', { connection });
let token, repo, job;

async function request(path, body) {
  const response = await fetch(`http://localhost:5000/api${path}`, {
    method: body ? 'POST' : 'GET',
    headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
    body: body ? JSON.stringify(body) : undefined,
    signal: AbortSignal.timeout(30000),
  });
  const data = await response.json();
  assert.ok(response.ok, `${path}: HTTP ${response.status} ${JSON.stringify(data)}`);
  return data;
}

try {
  await request('/auth/register', { name: 'Temporary smoke test', email, password });
  ({ token } = await request('/auth/login', { email, password }));
  assert.ok(token);
  console.log('PASS: registration and login');

  repo = await request('/repo/save-repo', { email, repo_url: 'https://github.com/octocat/Spoon-Knife.git' });
  const jobs = await queue.getJobs(['wait', 'active', 'completed', 'failed', 'delayed'], 0, 1000);
  job = jobs.find(candidate => candidate.data.email === email && candidate.data.repo_id === repo.repo_id);
  assert.ok(job, 'Indexing job must be queued');
  const deadline = Date.now() + 180000;
  let state;
  while (Date.now() < deadline) {
    state = await job.getState();
    if (state === 'completed' || state === 'failed') break;
    await delay(2000);
  }
  const finishedJob = await queue.getJob(job.id);
  assert.equal(state, 'completed', finishedJob?.failedReason || `Indexing ended in ${state}`);
  console.log('PASS: repository clone, chunking, embeddings, and vector storage');

  const rerankerDeadline = Date.now() + 300000;
  while (true) {
    try {
      const health = await fetch(`${process.env.RERANKER_URL}/health`, { signal: AbortSignal.timeout(5000) });
      if (health.ok) break;
    } catch { /* The model container may still be starting. */ }
    assert.ok(Date.now() < rerankerDeadline, 'Reranker did not become ready');
    await delay(5000);
  }
  const reranker = await fetch(`${process.env.RERANKER_URL}/rerank`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ query: 'How do I clone a Git repository?', texts: ['Use git clone followed by the repository URL.', 'Bananas are yellow fruit.'] }),
    signal: AbortSignal.timeout(120000),
  });
  assert.equal(reranker.status, 200);
  const { scores } = await reranker.json();
  assert.ok(scores.length === 2 && scores.every(Number.isFinite) && scores[0] > scores[1]);
  console.log('PASS: reranker scores relevant text higher');

  const prompt = await request('/prompt/save-prompt', {
    chat_id: -1, repo_id: repo.repo_id, prompt: 'What text does index.html display on the page?',
  });
  let result;
  const answerDeadline = Date.now() + 120000;
  while (Date.now() < answerDeadline) {
    result = await request(`/prompt/get-prompt-status/${prompt.prompt_id}`);
    if (result.status === 'done') break;
    await delay(2000);
  }
  assert.equal(result?.status, 'done');
  assert.ok(result.response && !/^Error|^Failed/i.test(result.response), result.response);
  assert.ok(result.sources?.length > 0, 'Answer must cite repository sources');
  console.log('PASS: retrieval, chat generation, polling, and source citations');
  console.log('Answer:', result.response);
  console.log('ALL END-TO-END CHECKS PASSED');
} finally {
  const active = job && await job.getState() === 'active';
  if (!active) {
    if (repo && client) {
      try {
        const collection = client.collections.use('RepoCodeChunk');
        const objects = await collection.query.fetchObjects({ filters: collection.filter.byProperty('repo_id').equal(repo.repo_id), limit: 1000 });
        for (const object of objects.objects) {
          if (object.properties.userid === email) await collection.data.deleteById(object.uuid);
        }
      } catch (error) {
        console.warn(`Vector cleanup incomplete for repo_id=${repo.repo_id}, userid=${email}: ${error.message}`);
      }
      await RepoInput.destroy({ where: { repo_id: repo.repo_id, email } });
    }
    if (job) await job.remove();
    await Auth.destroy({ where: { email } });
    console.log('Temporary local smoke-test records removed');
  } else {
    console.log('Indexing still active; test records retained for diagnosis:', email);
  }
  await queue.close();
  await sequelize.close();
  await client?.close();
}
