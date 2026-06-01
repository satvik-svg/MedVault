from typing import Any

from .confidence_aggregator import aggregate_confidence
from .llm_extractor import extract_medications
from .normalizer import DrugNormalizer
from .ocr_engines import ocr_handwritten
from .preprocessor import preprocess
from .region_detector import detect_regions


class OCRPipeline:
    def __init__(self) -> None:
        self.normalizer = DrugNormalizer()

    async def process_prescription(self, image_path: str) -> dict[str, Any]:
        processed = preprocess(image_path)
        regions = detect_regions(processed["shadow_removed_path"])
        ocr_results: dict[str, Any] = {}
        for region in regions:
            if region["class"] == "MEDICATIONS":
                ocr_results["MEDICATIONS"] = ocr_handwritten(region["image_crop"])

        meds_text = ocr_results.get("MEDICATIONS", {}).get("text", "")
        extracted = extract_medications(meds_text)
        ocr_conf = float(ocr_results.get("MEDICATIONS", {}).get("confidence", 0.0))
        medications = extracted.get("medications", [])
        for medication in medications:
            normalization = await self.normalizer.normalize(str(medication.get("drug_name") or medication.get("drug_raw") or ""))
            medication["rxnorm_cui"] = normalization["rxnorm_cui"]
            medication["generic_name"] = normalization["generic_name"]
            medication["matched_brand"] = normalization["matched_brand"]
            medication["is_indian_brand"] = normalization["is_indian_brand"]
            aggregate_confidence(medication, ocr_conf, float(medication.get("confidence", 0.5)), float(normalization["match_confidence"]))
        return {
            "header": {},
            "patient_info": {},
            "medications": medications,
            "needs_review": any(medication.get("confidence", {}).get("needs_review", True) for medication in medications),
            "raw_ocr": ocr_results,
        }
