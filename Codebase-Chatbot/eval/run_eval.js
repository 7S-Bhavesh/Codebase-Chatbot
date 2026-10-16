#!/usr/bin/env node
/**
 * eval/run_eval.js — RAG pipeline evaluation harness
 *
 * Usage:
 *   node eval/run_eval.js [--questions path/to/questions.json] [--mode all|baseline|hybrid|rerank|expand|threshold]
 *
 * For each ablation mode the script calls generation() directly (bypassing
 * HTTP) with the appropriate config overrides, then computes:
 *   - recall@1 and recall@5 (by file and by function name)
 *   - avg token usage
 *   - top-1 reranker score (for ABS_FLOOR calibration)
 *   - low_confidence flag distribution
 *
 * Results are written to eval/results_<timestamp>.json and printed as a
 * markdown table to stdout.
 *
 * Prerequisites:
 *   - Main server env vars must be set (WEAVIATE_*, GEMINI_API_KEY, RERANKER_URL)
 *   - Run from the "Main server" directory: node ../eval/run_eval.js
 */

import 'dotenv/config';
import { readFileSync, writeFileSync } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { generation } from '../util/ragOutput.js';
import { RAG_CONFIG } from '../config/rag.config.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// ── CLI args ──────────────────────────────────────────────────────────────────
const args = process.argv.slice(2);
const questionsFile = args[args.indexOf('--questions') + 1]
  ?? path.join(__dirname, 'questions.json');
const modeArg = args[args.indexOf('--mode') + 1] ?? 'all';

const questions = JSON.parse(readFileSync(questionsFile, 'utf8'));

// ── Ablation configurations ───────────────────────────────────────────────────
// Each entry: { name, overrides } — overrides are merged on top of RAG_CONFIG.
const ABLATIONS = [
  {
    name: 'baseline (top-5 nearText)',
    overrides: {
      K_RETRIEVE: 5,
      ENABLE_RERANK: false,
      ENABLE_EXPAND: false,
      ENABLE_DEDUPE: false,
      ENABLE_THRESHOLD: false,
      ALPHA: 0,            // pure dense — mimics old nearText behaviour
      FUSION_TYPE: 'relativeScore',
    },
  },
  {
    name: 'hybrid only',
    overrides: {
      ENABLE_RERANK: false,
      ENABLE_EXPAND: false,
      ENABLE_DEDUPE: false,
      ENABLE_THRESHOLD: false,
    },
  },
  {
    name: '+rerank',
    overrides: {
      ENABLE_EXPAND: false,
      ENABLE_DEDUPE: false,
      ENABLE_THRESHOLD: false,
    },
  },
  {
    name: '+expansion',
    overrides: {
      ENABLE_THRESHOLD: false,
    },
  },
  {
    name: '+threshold (full pipeline)',
    overrides: {},   // all defaults
  },
];

// ── Helpers ───────────────────────────────────────────────────────────────────
function overlap(arr1 = [], arr2 = []) {
  const s = new Set(arr1.map(x => x.toLowerCase()));
  return arr2.filter(x => s.has(x.toLowerCase())).length;
}

function recall(retrieved, expected) {
  if (!expected || expected.length === 0) return null;
  const hits = overlap(retrieved, expected);
  return hits / expected.length;
}

// Approximate token count for a response string (used when tiktoken is absent)
function approxTokens(text) {
  return Math.ceil((text ?? '').length / 4);
}

// ── Run a single question against one ablation ────────────────────────────────
async function evalOne(question, ablation) {
  const { question: q, repo_id, expected_files = [], expected_functions = [] } = question;
  const config = { ...RAG_CONFIG, ...ablation.overrides };

  let result;
  try {
    // generation() accepts optional 4th (repoId) and 5th (configOverrides) args
    result = await generation(q, '', '', repo_id, ablation.overrides);
  } catch (err) {
    return {
      question: q,
      ablation: ablation.name,
      error: err.message,
      recall_files_at_1: null,
      recall_files_at_5: null,
      recall_fns_at_1:   null,
      recall_fns_at_5:   null,
      top1_reranker_score: null,
      low_confidence: null,
      tokens_approx: null,
    };
  }

  const sources     = result.sources ?? [];
  const files_at_5  = sources.slice(0, 5).map(s => s.file_path ?? '').filter(Boolean);
  const files_at_1  = sources.slice(0, 1).map(s => s.file_path ?? '').filter(Boolean);
  const sigs_at_5   = sources.slice(0, 5).map(s => s.signature ?? '').filter(Boolean);
  const sigs_at_1   = sources.slice(0, 1).map(s => s.signature ?? '').filter(Boolean);

  return {
    question: q,
    ablation: ablation.name,
    recall_files_at_1:   recall(files_at_1, expected_files),
    recall_files_at_5:   recall(files_at_5, expected_files),
    recall_fns_at_1:     recall(sigs_at_1,  expected_functions),
    recall_fns_at_5:     recall(sigs_at_5,  expected_functions),
    top1_reranker_score: null,   // populated post-hoc from pipeline logs
    low_confidence:      result.low_confidence ?? false,
    tokens_approx:       approxTokens(result.answer),
    answer_excerpt:      (result.answer ?? '').slice(0, 120),
  };
}

// ── Main ──────────────────────────────────────────────────────────────────────
const ablationsToRun = modeArg === 'all'
  ? ABLATIONS
  : ABLATIONS.filter(a => a.name.toLowerCase().includes(modeArg.toLowerCase()));

if (ablationsToRun.length === 0) {
  console.error(`No ablations matched mode "${modeArg}". Valid values: all, baseline, hybrid, rerank, expand, threshold`);
  process.exit(1);
}

console.log(`\nRunning ${questions.length} questions × ${ablationsToRun.length} ablation(s)...\n`);

const allResults = [];

for (const ablation of ablationsToRun) {
  console.log(`── Ablation: ${ablation.name}`);
  const ablationResults = [];

  for (const q of questions) {
    process.stdout.write(`   ${q.question.slice(0, 60)}… `);
    const r = await evalOne(q, ablation);
    ablationResults.push(r);
    allResults.push(r);
    process.stdout.write(`files@5=${r.recall_files_at_5?.toFixed(2) ?? 'n/a'} | lowConf=${r.low_confidence}\n`);
  }

  // Print per-ablation summary
  const validFileR5 = ablationResults.filter(r => r.recall_files_at_5 !== null);
  const avgFileR5   = validFileR5.length
    ? validFileR5.reduce((s, r) => s + r.recall_files_at_5, 0) / validFileR5.length
    : null;
  const avgTokens   = ablationResults.reduce((s, r) => s + (r.tokens_approx ?? 0), 0) / ablationResults.length;
  const lowConfRate = ablationResults.filter(r => r.low_confidence).length / ablationResults.length;

  console.log(`\n   recall@5(files)=${avgFileR5?.toFixed(3) ?? 'n/a'} | avg_tokens=${avgTokens.toFixed(0)} | low_conf_rate=${lowConfRate.toFixed(2)}\n`);
}

// ── Write results ─────────────────────────────────────────────────────────────
const ts = new Date().toISOString().replace(/[:.]/g, '-');
const outFile = path.join(__dirname, `results_${ts}.json`);
writeFileSync(outFile, JSON.stringify(allResults, null, 2));
console.log(`\nResults written to ${outFile}`);

// ── Markdown summary table ────────────────────────────────────────────────────
const grouped = {};
for (const r of allResults) {
  if (!grouped[r.ablation]) grouped[r.ablation] = [];
  grouped[r.ablation].push(r);
}

console.log('\n| Ablation | Recall@1(files) | Recall@5(files) | Avg tokens | Low-conf rate |');
console.log('|---|---|---|---|---|');
for (const [abl, rows] of Object.entries(grouped)) {
  const valid = rows.filter(r => r.recall_files_at_5 !== null);
  const r1 = valid.length ? (valid.reduce((s,r)=>s+r.recall_files_at_1,0)/valid.length).toFixed(3) : 'n/a';
  const r5 = valid.length ? (valid.reduce((s,r)=>s+r.recall_files_at_5,0)/valid.length).toFixed(3) : 'n/a';
  const tok = (rows.reduce((s,r)=>s+(r.tokens_approx??0),0)/rows.length).toFixed(0);
  const lc  = (rows.filter(r=>r.low_confidence).length/rows.length).toFixed(2);
  console.log(`| ${abl} | ${r1} | ${r5} | ${tok} | ${lc} |`);
}
