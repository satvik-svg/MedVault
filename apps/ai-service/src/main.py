from contextlib import asynccontextmanager

from fastapi import FastAPI

from .api.routes import diagnose, ner, ocr, recurrence, summarize, transcribe
from .config import settings
from .models import classifier_service, embedding_service, llm_service, ner_service, whisper_service


@asynccontextmanager
async def lifespan(app: FastAPI):
    whisper_service.init(settings.whisper_model_path)
    ner_service.init(settings.ner_model_path)
    classifier_service.init(settings.classifier_model_path)
    embedding_service.init(settings.embedding_model_path)
    llm_service.init(settings.anthropic_api_key)
    yield


app = FastAPI(title=settings.service_name, lifespan=lifespan)
app.include_router(transcribe.router, prefix="/api/ai", tags=["transcription"])
app.include_router(ner.router, prefix="/api/ai", tags=["ner"])
app.include_router(diagnose.router, prefix="/api/ai", tags=["diagnosis"])
app.include_router(summarize.router, prefix="/api/ai", tags=["summary"])
app.include_router(recurrence.router, prefix="/api/ai", tags=["recurrence"])
app.include_router(ocr.router, prefix="/api/ai", tags=["ocr"])


@app.get("/health")
def health() -> dict[str, str]:
    return {"status": "ok", "mode": settings.model_mode}
