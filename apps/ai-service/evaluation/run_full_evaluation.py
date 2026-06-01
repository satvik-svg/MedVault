import json
from pathlib import Path


def main() -> None:
    results = {
        "ner": {"status": "requires_i2b2_dataset"},
        "classifier": {"status": "requires_ddxplus_checkpoints"},
        "whisper": {"status": "requires_whisper_test_clips"},
        "ocr": {"status": "requires_annotated_prescriptions"},
        "security": {"status": "run_backend_unit_security_tests"},
        "end_to_end": {"status": "run_after_services_are_deployed"},
    }
    out = Path("evaluation_results.json")
    out.write_text(json.dumps(results, indent=2))
    print(f"Results scaffold written to {out}")


if __name__ == "__main__":
    main()
