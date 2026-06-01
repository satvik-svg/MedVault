import re
from typing import Any

from ..data import umls_linker
from ..models import ner_service


def extract_temporal_modifiers(text: str, start: int, end: int) -> dict[str, str]:
    window = text[max(0, start - 50):min(len(text), end + 50)]
    patterns = [
        (r"(\d+)\s*(day|days|week|weeks|month|months|year|years)", "duration"),
        (r"(this morning|last night|yesterday|today)", "onset"),
    ]
    found: dict[str, str] = {}
    for pattern, label in patterns:
        match = re.search(pattern, window, re.I)
        if match:
            found[label] = match.group(0)
    return found


def process_clinical_text(text: str) -> dict[str, Any]:
    entities = ner_service.extract_entities(text)
    enriched: list[dict[str, Any]] = []
    for entity in entities:
        start = int(entity.get("start") or 0)
        end = int(entity.get("end") or start)
        links = umls_linker.link_to_umls(str(entity.get("raw_text", "")))
        enriched.append(
            {
                **entity,
                "temporal": extract_temporal_modifiers(text, start, end),
                "cui": links[0]["cui"] if links else None,
            }
        )
    return {"input_text": text, "entities": enriched}
