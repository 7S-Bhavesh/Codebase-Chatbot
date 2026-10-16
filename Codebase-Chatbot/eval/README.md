# Eval Harness

## Purpose

Measures retrieval quality across five ablation modes to compare the upgraded
pipeline against the old top-5 baseline and to calibrate `ABS_FLOOR`.

## Quick start

```bash
# From the "Main server" directory (env vars must be set)
node ../eval/run_eval.js
```

```bash
# Run a specific ablation only
node ../eval/run_eval.js --mode rerank

# Use a custom questions file
node ../eval/run_eval.js --questions ./my_questions.json
```

## Ablation modes

| Mode flag | What runs |
|---|---|
| `baseline` | Old top-5 dense nearText (no hybrid, no rerank, no expand) |
| `hybrid` | Hybrid k=30, no rerank, no expand |
| `rerank` | Hybrid + cross-encoder rerank |
| `expand` | Hybrid + rerank + parent expansion |
| `threshold` / `full` | Full pipeline (all stages on) |

## Questions file format

```json
[
  {
    "question": "How does X work?",
    "repo_id": 42,
    "expected_files": ["src/foo.py"],
    "expected_functions": ["foo", "bar"]
  }
]
```

`repo_id` must match an integer PK in the PostgreSQL `REPO_INPUT` table.
`expected_files` and `expected_functions` are partial match lists — lowercase
comparison, so `"authController.js"` matches `"controllers/authController.js"`.

## Output

Each run writes a timestamped JSON file (`eval/results_<ts>.json`) and prints
a markdown summary table:

```
| Ablation            | Recall@1(files) | Recall@5(files) | Avg tokens | Low-conf rate |
|---------------------|-----------------|-----------------|------------|---------------|
| baseline (top-5)    | 0.400           | 0.600           | 312        | 0.00          |
| hybrid only         | 0.500           | 0.700           | 810        | 0.00          |
| +rerank             | 0.600           | 0.800           | 810        | 0.20          |
| +expansion          | 0.700           | 0.900           | 1840       | 0.20          |
| +threshold (full)   | 0.700           | 0.900           | 1680       | 0.20          |
```

## Calibrating ABS_FLOOR

1. Run `node ../eval/run_eval.js --mode rerank`.
2. Inspect `results_*.json` — look at `top1_reranker_score` for known-good
   (correctly retrieved) vs. known-bad (unrelated) questions.
3. Set `ABS_FLOOR` in `config/rag.config.js` between the two score clusters.
4. Re-run `--mode threshold` and verify that `low_conf_rate` captures only
   the truly off-topic questions.
