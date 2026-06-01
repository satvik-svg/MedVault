import re
from typing import Any

_pipeline: Any = None


def init(model_path: str | None = None) -> None:
    global _pipeline
    if not model_path:
        _pipeline = None
        return
    try:
        from transformers import pipeline

        _pipeline = pipeline("ner", model=model_path, tokenizer=model_path, aggregation_strategy="simple")
    except Exception:
        _pipeline = None


def extract_entities(text: str) -> list[dict[str, Any]]:
    if _pipeline is not None:
        raw = _pipeline(text)
        return [
            {
                "raw_text": item.get("word", ""),
                "category": item.get("entity_group", "PROBLEM"),
                "start": item.get("start"),
                "end": item.get("end"),
                "confidence": item.get("score"),
                "negated": False,
                "temporal": {},
                "cui": None,
            }
            for item in raw
        ]

    entities: list[dict[str, Any]] = []
    for match in re.finditer(r"\b(fever|cough|pain|headache|vomiting|diarrhea|dizziness|breathlessness|chest pain|rash)\b", text, re.I):
        window = text[max(0, match.start() - 20):match.start()].lower()
        entities.append(
            {
                "raw_text": match.group(0),
                "category": "PROBLEM",
                "start": match.start(),
                "end": match.end(),
                "confidence": 0.65,
                "negated": any(token in window.split() for token in ["no", "not", "denies", "without"]),
                "temporal": {},
                "cui": None,
            }
        )
    return entities
