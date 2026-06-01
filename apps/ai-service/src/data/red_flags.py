from typing import Any

RED_FLAGS: dict[str, dict[str, Any]] = {
    "cardiac_emergency": {
        "patterns": [["chest pain"], ["breathlessness", "pain"]],
        "alert": "Possible acute coronary syndrome. Consider ECG, troponin, and urgent referral.",
    },
    "sepsis": {
        "patterns": [["fever", "confusion"], ["fever", "breathlessness"]],
        "alert": "Possible sepsis. Consider urgent vitals, cultures, lactate, and antibiotics.",
    },
    "anaphylaxis": {
        "patterns": [["rash", "breathlessness"], ["swelling", "breathlessness"]],
        "alert": "Possible anaphylaxis. Immediate emergency management may be indicated.",
    },
}


def detect_red_flags(entities: list[dict[str, Any]], age: int | None = None) -> list[dict[str, Any]]:
    entity_texts = {str(entity.get("raw_text", "")).lower() for entity in entities if not entity.get("negated")}
    triggered: list[dict[str, Any]] = []
    for category, config in RED_FLAGS.items():
        for pattern in config["patterns"]:
            if all(any(term.lower() in entity for entity in entity_texts) for term in pattern):
                triggered.append(
                    {
                        "category": category,
                        "alert": config["alert"],
                        "matched_pattern": pattern,
                        "age": age,
                    }
                )
                break
    return triggered
