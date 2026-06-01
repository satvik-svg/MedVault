from typing import Any

from fastapi import APIRouter
from pydantic import BaseModel

from ...models import llm_service

router = APIRouter()


class PatientDataInput(BaseModel):
    patient_id: str | None = None
    age: int | None = None
    sex: str | None = None
    allergies: list[dict[str, Any]] = []
    chronicConditions: list[dict[str, Any]] = []
    activeMedications: list[dict[str, Any]] = []
    labTrends: dict[str, Any] = {}
    stats: dict[str, Any] = {}
    currentSymptoms: str | None = None


@router.post("/summarize/patient")
async def summarize_patient(payload: PatientDataInput) -> dict[str, str]:
    return {"summary": llm_service.generate_patient_summary(payload.model_dump())}
