from typing import Any

_client: Any = None


def init(api_key: str | None = None) -> None:
    global _client
    if not api_key:
        _client = None
        return
    try:
        import anthropic

        _client = anthropic.Anthropic(api_key=api_key)
    except Exception:
        _client = None


def generate_patient_summary(patient_data: dict[str, Any]) -> str:
    if _client is None:
        age = patient_data.get("age", "Unknown-age")
        sex = patient_data.get("sex", "patient")
        conditions = patient_data.get("chronicConditions") or []
        medications = patient_data.get("activeMedications") or []
        symptoms = patient_data.get("currentSymptoms") or "No current presenting concern documented"
        return (
            f"{age}-year-old {sex} with {len(conditions)} chronic condition entries and "
            f"{len(medications)} active medication entries in MedVault. "
            f"Current presenting concern: {symptoms}."
        )

    response = _client.messages.create(
        model="claude-sonnet-4-5",
        max_tokens=200,
        system=(
            "You are a medical summarization assistant. Write a factual 2-3 sentence "
            "clinical summary. Do not invent information or provide diagnostic opinions."
        ),
        messages=[{"role": "user", "content": str(patient_data)}],
    )
    return response.content[0].text.strip()
