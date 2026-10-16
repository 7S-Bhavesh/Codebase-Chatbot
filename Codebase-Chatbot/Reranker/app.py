"""
Reranker micro-service — cross-encoder scoring for RAG pipeline.

POST /rerank
  Body: { "query": str, "texts": [str], "model": str }
  Response: { "scores": [float] }

The model is loaded lazily on first request and cached for the lifetime
of the process. Texts are truncated to the model's max_length before scoring.

Run with:
  uvicorn app:app --host 0.0.0.0 --port 8000
"""

from __future__ import annotations

import os
from typing import List

from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
from sentence_transformers import CrossEncoder

app = FastAPI(title="Cross-Encoder Reranker", version="1.0.0")

# ── Model cache ──────────────────────────────────────────────────────────────
_model_cache: dict[str, CrossEncoder] = {}
_DEFAULT_MODEL = os.getenv(
    "RERANKER_MODEL", "cross-encoder/ms-marco-MiniLM-L-6-v2"
)


def _load_model(model_name: str) -> CrossEncoder:
    if model_name not in _model_cache:
        print(f"[reranker] Loading model: {model_name}")
        _model_cache[model_name] = CrossEncoder(model_name, max_length=512)
        print(f"[reranker] Model loaded: {model_name}")
    return _model_cache[model_name]


# ── Request / response schemas ────────────────────────────────────────────────
class RerankRequest(BaseModel):
    query: str
    texts: List[str]
    model: str = _DEFAULT_MODEL


class RerankResponse(BaseModel):
    scores: List[float]


# ── Endpoints ─────────────────────────────────────────────────────────────────
@app.get("/health")
def health():
    return {"status": "ok"}


@app.post("/rerank", response_model=RerankResponse)
def rerank(req: RerankRequest):
    if not req.texts:
        raise HTTPException(status_code=400, detail="texts must be non-empty")

    model = _load_model(req.model)

    # Build (query, passage) pairs
    pairs = [(req.query, text) for text in req.texts]

    # predict() returns raw logits (no sigmoid) — consistent across models
    scores: list[float] = model.predict(pairs).tolist()

    return RerankResponse(scores=scores)
