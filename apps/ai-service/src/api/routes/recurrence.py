from typing import Any

from fastapi import APIRouter
from pydantic import BaseModel

from ...models.embedding_service import embed_symptom_set

router = APIRouter()


class RecurrenceInput(BaseModel):
    patient_id: str
    current_entities: list[dict[str, Any]]
    past_presentations: list[dict[str, Any]] = []


def cosine(a: list[float], b: list[float]) -> float:
    return sum(x * y for x, y in zip(a, b))


@router.post("/recurrence")
async def check_recurrence(payload: RecurrenceInput) -> dict[str, Any]:
    current = embed_symptom_set(payload.current_entities)
    matches: list[dict[str, Any]] = []
    for presentation in payload.past_presentations:
        entities = presentation.get("entities", [])
        if not isinstance(entities, list):
            continue
        score = cosine(current, embed_symptom_set(entities))
        if score >= 0.85:
            matches.append({**presentation, "similarity": score})
    return {"recurring_presentations": sorted(matches, key=lambda item: item["similarity"], reverse=True)[:3]}
