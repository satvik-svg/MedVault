from fastapi import APIRouter
from pydantic import BaseModel

from ...pipelines.symptom_pipeline import process_clinical_text

router = APIRouter()


class NERInput(BaseModel):
    text: str


@router.post("/ner")
async def extract_entities(payload: NERInput) -> dict[str, object]:
    return process_clinical_text(payload.text)
