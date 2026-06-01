from typing import Any

from .lab_llm_extractor import extract_lab_results
from .loinc_normalizer import LoincNormalizer
from .ocr_engines import ocr_printed
from .preprocessor import preprocess


def _flag_for_result(value: Any, reference_range: Any) -> str | None:
    if not isinstance(value, (int, float)) or not isinstance(reference_range, dict):
        return None
    low = reference_range.get("low")
    high = reference_range.get("high")
    if isinstance(low, (int, float)) and value < low * 0.5:
        return "CRITICAL_LOW"
    if isinstance(low, (int, float)) and value < low:
        return "LOW"
    if isinstance(high, (int, float)) and value > high * 1.5:
        return "CRITICAL_HIGH"
    if isinstance(high, (int, float)) and value > high:
        return "HIGH"
    if isinstance(low, (int, float)) or isinstance(high, (int, float)):
        return "NORMAL"
    return None


class LabReportOCRPipeline:
    def __init__(self) -> None:
        self.normalizer = LoincNormalizer()

    async def process_lab_report(self, image_path: str) -> dict[str, Any]:
        processed = preprocess(image_path)
        ocr_result = ocr_printed(processed["original_path"])
        extracted = extract_lab_results(str(ocr_result.get("text", "")))
        results = extracted.get("results", [])

        for result in results:
            normalized = await self.normalizer.normalize(str(result.get("test_name") or ""))
            result["loinc_code"] = normalized["loinc_code"]
            result["standard_name"] = normalized["standard_name"]
            result["loinc_confidence"] = normalized["match_confidence"]
            result["flag"] = _flag_for_result(result.get("value"), result.get("reference_range"))

        return {
            "lab_name": extracted.get("lab_name"),
            "report_date": extracted.get("report_date"),
            "collection_date": extracted.get("collection_date"),
            "patient_info": extracted.get("patient_info", {}),
            "results": results,
            "raw_ocr": ocr_result,
            "needs_review": any(float(result.get("confidence", 0.0)) < 0.75 for result in results),
        }
