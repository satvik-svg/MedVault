from hashlib import sha256
from math import sqrt
from typing import Any

_model: Any = None


def init(model_path: str | None = None) -> None:
    global _model
    if not model_path:
        _model = None
        return
    try:
        from sentence_transformers import SentenceTransformer

        _model = SentenceTransformer(model_path)
    except Exception:
        _model = None


def embed_symptom_set(entities: list[dict[str, Any]]) -> list[float]:
    text = ", ".join(str(entity.get("raw_text", "")) for entity in entities if not entity.get("negated")) or "no symptoms"
    if _model is not None:
        return _model.encode(text, normalize_embeddings=True).tolist()

    buckets = [0.0] * 32
    for token in text.lower().split():
        digest = sha256(token.encode()).digest()
        buckets[digest[0] % len(buckets)] += 1.0
    norm = sqrt(sum(value * value for value in buckets)) or 1.0
    return [value / norm for value in buckets]
