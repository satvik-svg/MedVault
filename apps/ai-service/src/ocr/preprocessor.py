from pathlib import Path


def preprocess(image_path: str) -> dict[str, object]:
    path = Path(image_path)
    return {"original_path": str(path), "enhanced_path": str(path), "shadow_removed_path": str(path)}
