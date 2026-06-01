import json
import re
from typing import Any


def extract_medications(ocr_text: str) -> dict[str, Any]:
    medications: list[dict[str, Any]] = []
    for line in [part.strip() for part in ocr_text.splitlines() if part.strip()]:
        match = re.search(r"(?P<name>[A-Za-z][A-Za-z0-9 -]+)\s+(?P<strength>\d+\s?(mg|ml|mcg|g))?", line, re.I)
        if not match:
            medications.append({"drug_raw": line, "confidence": 0.2, "extraction_failed": True})
            continue
        medications.append(
            {
                "drug_raw": line,
                "drug_name": match.group("name").strip(),
                "strength": (match.group("strength") or "").replace(" ", ""),
                "frequency": "CUSTOM",
                "duration_value": 1,
                "duration_unit": "DAYS",
                "route": "ORAL",
                "confidence": 0.55,
                "notes": line,
            }
        )
    return {"medications": medications, "raw": json.dumps(medications)}
