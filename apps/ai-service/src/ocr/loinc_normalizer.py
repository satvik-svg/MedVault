from difflib import SequenceMatcher
from typing import Any


LOINC_ALIASES: dict[str, dict[str, str]] = {
    "haemoglobin": {"loinc_code": "718-7", "standard_name": "Hemoglobin [Mass/volume] in Blood"},
    "hemoglobin": {"loinc_code": "718-7", "standard_name": "Hemoglobin [Mass/volume] in Blood"},
    "hb": {"loinc_code": "718-7", "standard_name": "Hemoglobin [Mass/volume] in Blood"},
    "fasting blood sugar": {"loinc_code": "1558-6", "standard_name": "Glucose [Mass/volume] in Serum or Plasma -- fasting"},
    "fbs": {"loinc_code": "1558-6", "standard_name": "Glucose [Mass/volume] in Serum or Plasma -- fasting"},
    "blood sugar fasting": {"loinc_code": "1558-6", "standard_name": "Glucose [Mass/volume] in Serum or Plasma -- fasting"},
    "post prandial blood sugar": {"loinc_code": "1521-4", "standard_name": "Glucose [Mass/volume] in Serum or Plasma -- 2 hours post meal"},
    "ppbs": {"loinc_code": "1521-4", "standard_name": "Glucose [Mass/volume] in Serum or Plasma -- 2 hours post meal"},
    "hba1c": {"loinc_code": "4548-4", "standard_name": "Hemoglobin A1c/Hemoglobin.total in Blood"},
    "glycated hemoglobin": {"loinc_code": "4548-4", "standard_name": "Hemoglobin A1c/Hemoglobin.total in Blood"},
    "total cholesterol": {"loinc_code": "2093-3", "standard_name": "Cholesterol [Mass/volume] in Serum or Plasma"},
    "triglycerides": {"loinc_code": "2571-8", "standard_name": "Triglyceride [Mass/volume] in Serum or Plasma"},
    "creatinine": {"loinc_code": "2160-0", "standard_name": "Creatinine [Mass/volume] in Serum or Plasma"},
    "tsh": {"loinc_code": "3016-3", "standard_name": "Thyrotropin [Units/volume] in Serum or Plasma"},
    "vitamin d": {"loinc_code": "1989-3", "standard_name": "25-hydroxyvitamin D3 [Mass/volume] in Serum or Plasma"},
}


def _clean(value: str) -> str:
    return " ".join(value.lower().replace("_", " ").replace("-", " ").split())


class LoincNormalizer:
    async def normalize(self, test_name: str) -> dict[str, Any]:
        raw = test_name.strip()
        cleaned = _clean(raw)
        if not cleaned:
            return {"loinc_code": None, "standard_name": None, "match_confidence": 0.0}

        if cleaned in LOINC_ALIASES:
            return {**LOINC_ALIASES[cleaned], "match_confidence": 1.0}

        best_alias = ""
        best_score = 0.0
        for alias in LOINC_ALIASES:
            score = SequenceMatcher(None, cleaned, alias).ratio()
            if score > best_score:
                best_alias = alias
                best_score = score

        if best_score < 0.78:
            return {"loinc_code": None, "standard_name": raw, "match_confidence": round(best_score, 2)}

        return {**LOINC_ALIASES[best_alias], "match_confidence": round(best_score, 2)}
