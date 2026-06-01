import base64
import tempfile
from pathlib import Path

from fastapi import APIRouter, File, UploadFile
from pydantic import BaseModel

from ...ocr.pipeline import OCRPipeline

router = APIRouter()


class Base64OCRInput(BaseModel):
    image_base64: str


@router.post("/ocr/prescription")
async def ocr_prescription(image: UploadFile = File(...)) -> dict[str, object]:
    suffix = Path(image.filename or "prescription.jpg").suffix or ".jpg"
    with tempfile.NamedTemporaryFile(suffix=suffix, delete=False) as tmp:
        tmp.write(await image.read())
        tmp.flush()
        path = Path(tmp.name)
    try:
        return await OCRPipeline().process_prescription(str(path))
    finally:
        path.unlink(missing_ok=True)


@router.post("/ocr/prescription/base64")
async def ocr_prescription_base64(payload: Base64OCRInput) -> dict[str, object]:
    with tempfile.NamedTemporaryFile(suffix=".jpg", delete=False) as tmp:
        tmp.write(base64.b64decode(payload.image_base64))
        tmp.flush()
        path = Path(tmp.name)
    try:
        return await OCRPipeline().process_prescription(str(path))
    finally:
        path.unlink(missing_ok=True)
