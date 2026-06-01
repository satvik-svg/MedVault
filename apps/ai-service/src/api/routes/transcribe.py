import tempfile
from pathlib import Path

from fastapi import APIRouter, File, UploadFile
from pydantic import BaseModel

from ...models import whisper_service

router = APIRouter()


class Base64TranscriptionInput(BaseModel):
    audio_base64: str
    language: str = "en"


@router.post("/transcribe")
async def transcribe(audio: UploadFile = File(...), language: str = "en") -> dict[str, object]:
    suffix = Path(audio.filename or "audio.wav").suffix or ".wav"
    with tempfile.NamedTemporaryFile(suffix=suffix, delete=False) as tmp:
        tmp.write(await audio.read())
        tmp.flush()
        path = Path(tmp.name)
    try:
        return whisper_service.transcribe(str(path), language)
    finally:
        path.unlink(missing_ok=True)


@router.post("/transcribe/base64")
async def transcribe_base64(payload: Base64TranscriptionInput) -> dict[str, object]:
    return whisper_service.transcribe_base64(payload.audio_base64, payload.language)
