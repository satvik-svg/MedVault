import json
from pathlib import Path


def main() -> None:
    results = {
        "ner": {"status": "requires_i2b2_dataset"},
        "classifier": {"status": "requires_ddxplus_checkpoints"},
        "whisper": {"status": "requires_whisper_test_clips"},
        "ocr": {
            "prescriptions": {"status": "requires_annotated_prescriptions"},
            "lab_reports": {"status": "requires_annotated_lab_reports"},
        },
        "end_to_end": {"status": "run_after_services_are_deployed"},
    }
    out = Path("evaluation_results.json")
    out.write_text(json.dumps(results, indent=2))
    print("MedVault Comprehensive Evaluation")
    print("[1/5] NER pipeline")
    print("[2/5] Differential diagnosis classifier")
    print("[3/5] Whisper LoRA")
    print("[4/5] OCR pipeline: prescriptions + lab reports")
    print("[5/5] End-to-end pipeline")
    print(f"Results scaffold written to {out}")


if __name__ == "__main__":
    main()
