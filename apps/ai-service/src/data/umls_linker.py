def init() -> None:
    return None


def link_to_umls(text: str) -> list[dict[str, object]]:
    return [{"text": text, "cui": None, "score": 0.0}] if text.strip() else []
