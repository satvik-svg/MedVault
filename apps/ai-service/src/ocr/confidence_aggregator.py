from typing import Any


def aggregate_confidence(medication: dict[str, Any], ocr_conf: float, llm_conf: float, normalize_conf: float) -> dict[str, Any]:
    overall = min(ocr_conf, llm_conf, normalize_conf)
    medication["confidence"] = {
        "drug_name": min(ocr_conf, llm_conf, normalize_conf),
        "strength": min(ocr_conf, llm_conf),
        "frequency": min(ocr_conf, llm_conf),
        "duration": min(ocr_conf, llm_conf),
        "overall": overall,
        "needs_review": overall < 0.85,
    }
    return medication
