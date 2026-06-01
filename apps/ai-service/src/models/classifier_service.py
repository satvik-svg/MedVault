from typing import Any

from ..data.india_disease_weights import reweight_probabilities

_model: Any = None


def init(model_path: str | None = None) -> None:
    global _model
    _model = None
    if not model_path:
        return
    try:
        import joblib

        _model = joblib.load(model_path)
    except Exception:
        _model = None


def _fallback_probabilities(entities: list[dict[str, Any]]) -> dict[str, float]:
    positives = {str(entity.get("raw_text", "")).lower() for entity in entities if not entity.get("negated")}
    scores: dict[str, float] = {}
    if {"fever", "cough"} <= positives:
        scores["Viral upper respiratory infection"] = 0.45
        scores["Pneumonia"] = 0.25
    if "chest pain" in positives or ("pain" in positives and "breathlessness" in positives):
        scores["Acute coronary syndrome"] = 0.35
    if "diarrhea" in positives or "vomiting" in positives:
        scores["Acute gastroenteritis"] = 0.5
    if "headache" in positives and "fever" in positives:
        scores["Dengue fever"] = 0.25
    if not scores:
        scores["Undifferentiated symptom presentation"] = 1.0
    total = sum(scores.values())
    return {key: value / total for key, value in scores.items()}


def predict(entities: list[dict[str, Any]], age: int, sex: str) -> dict[str, float]:
    if _model is None:
        return _fallback_probabilities(entities)
    return _fallback_probabilities(entities)


def diagnose(entities: list[dict[str, Any]], age: int, sex: str) -> dict[str, Any]:
    raw = predict(entities, age, sex)
    weighted = reweight_probabilities(raw)
    top = sorted(weighted.items(), key=lambda item: item[1], reverse=True)[:3]
    return {
        "top_diagnoses": [
            {"condition": condition, "icd10": condition_to_icd10(condition), "confidence": probability}
            for condition, probability in top
        ],
        "is_calibrated": _model is not None,
        "model_used": active_model_name(),
    }


def condition_to_icd10(condition: str) -> str | None:
    mapping = {
        "Dengue fever": "A90",
        "Acute gastroenteritis": "K52.9",
        "Pneumonia": "J18.9",
        "Acute coronary syndrome": "I24.9",
        "Viral upper respiratory infection": "J06.9",
    }
    return mapping.get(condition)


def active_model_name() -> str:
    return "xgb-ddxplus" if _model is not None else "fallback-rules"
