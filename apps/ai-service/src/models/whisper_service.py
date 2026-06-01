import base64
import tempfile
from pathlib import Path
from typing import Any

_model: Any = None


def init(model_path: str | None = None) -> None:
    global _model
    if not model_path:
        _model = None
        return
    try:
        from faster_whisper import WhisperModel

        _model = WhisperModel(model_path, device="auto", compute_type="auto")
    except Exception:
        _model = None


def transcribe(audio_path: str, language: str = "en") -> dict[str, Any]:
    if _model is None:
        return {"text": "", "language": language, "duration": 0, "segments": [], "model": "fallback"}

    segments, info = _model.transcribe(audio_path, language=language, beam_size=5, vad_filter=True)
    segment_list = [{"start": seg.start, "end": seg.end, "text": seg.text.strip()} for seg in segments]
    return {
        "text": " ".join(seg["text"] for seg in segment_list).strip(),
        "language": info.language,
        "duration": info.duration,
        "segments": segment_list,
        "model": "faster-whisper",
    }


def transcribe_base64(audio_base64: str, language: str = "en") -> dict[str, Any]:
    with tempfile.NamedTemporaryFile(suffix=".wav", delete=False) as tmp:
        tmp.write(base64.b64decode(audio_base64))
        tmp.flush()
        path = Path(tmp.name)
    try:
        return transcribe(str(path), language)
    finally:
        path.unlink(missing_ok=True)
