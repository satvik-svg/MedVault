import re
from typing import Any


LAB_EXTRACTION_PROMPT = """You are a medical lab report parser specialized in Indian diagnostic reports.

Extract test results as JSON with lab_name, report_date, collection_date, patient_info, and results.
Each result should include test_name, value, unit, reference_range, method, comments, and confidence.
Output JSON only."""


TEST_LINE_RE = re.compile(
    r"^(?P<name>[A-Za-z][A-Za-z0-9 /().,%+-]{2,}?)\s+"
    r"(?P<value>[<>]?\d+(?:\.\d+)?|positive|negative|reactive|non-reactive)\s*"
    r"(?P<unit>[A-Za-z/%0-9^.-]+)?\s*"
    r"(?P<range>(?:\d+(?:\.\d+)?\s*[-–]\s*\d+(?:\.\d+)?)|(?:[<>]=?\s*\d+(?:\.\d+)?))?",
    re.I,
)


def _parse_number(value: str) -> float | str:
    cleaned = value.strip().lstrip("<>")
    try:
        return float(cleaned)
    except ValueError:
        return value.strip()


def _parse_reference_range(value: str | None) -> dict[str, float] | str | None:
    if not value:
        return None
    range_match = re.search(r"(?P<low>\d+(?:\.\d+)?)\s*[-–]\s*(?P<high>\d+(?:\.\d+)?)", value)
    if range_match:
        return {"low": float(range_match.group("low")), "high": float(range_match.group("high"))}
    return value.strip()


def extract_lab_results(ocr_text: str) -> dict[str, Any]:
    results: list[dict[str, Any]] = []
    lines = [line.strip(" \t:|") for line in ocr_text.splitlines() if line.strip()]

    for line in lines:
        match = TEST_LINE_RE.search(line)
        if not match:
            continue
        name = " ".join(match.group("name").split())
        if name.lower() in {"test", "result", "unit", "reference range"}:
            continue
        results.append(
            {
                "test_name": name,
                "value": _parse_number(match.group("value")),
                "unit": match.group("unit") or None,
                "reference_range": _parse_reference_range(match.group("range")),
                "method": None,
                "comments": line,
                "confidence": 0.65,
            }
        )

    return {
        "lab_name": None,
        "report_date": None,
        "collection_date": None,
        "patient_info": {},
        "results": results,
        "raw": ocr_text,
    }
