from typing import Any

from fastapi import APIRouter
from pydantic import BaseModel

from ...data.red_flags import detect_red_flags
from ...models import classifier_service

router = APIRouter()


class DiagnoseInput(BaseModel):
    entities: list[dict[str, Any]]
    age: int
    sex: str


@router.post("/diagnose")
async def diagnose(payload: DiagnoseInput) -> dict[str, Any]:
    result = classifier_service.diagnose(payload.entities, payload.age, payload.sex)
    result["red_flags"] = detect_red_flags(payload.entities, payload.age)
    return result
