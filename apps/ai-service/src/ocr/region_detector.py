from typing import Any


def init() -> None:
    return None


def detect_regions(image: Any) -> list[dict[str, Any]]:
    return [{"class": "MEDICATIONS", "confidence": 0.0, "bbox": [0, 0, 0, 0], "image_crop": image}]
