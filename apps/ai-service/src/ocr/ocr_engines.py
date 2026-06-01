from typing import Any


def init_vision() -> None:
    return None


def ocr_printed(image: Any) -> dict[str, Any]:
    return {"text": "", "words": [], "avg_confidence": 0.0}


def ocr_handwritten(image: Any) -> dict[str, Any]:
    return {"text": "", "confidence": 0.0}
