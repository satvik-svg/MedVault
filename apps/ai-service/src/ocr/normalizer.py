from typing import Any


class DrugNormalizer:
    async def normalize(self, drug_name: str) -> dict[str, Any]:
        raw = drug_name.strip()
        return {
            "raw_input": raw,
            "rxnorm_cui": None,
            "generic_name": raw or None,
            "matched_brand": None,
            "is_indian_brand": False,
            "match_confidence": 0.0 if not raw else 0.4,
            "match_method": "FALLBACK_NAME_ONLY",
        }
