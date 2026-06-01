from pydantic import Field
from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    service_name: str = "MedVault AI"
    model_mode: str = Field(default="fallback", validation_alias="AI_MODEL_MODE")
    whisper_model_path: str | None = Field(default=None, validation_alias="WHISPER_MODEL_PATH")
    ner_model_path: str | None = Field(default=None, validation_alias="NER_MODEL_PATH")
    classifier_model_path: str | None = Field(default=None, validation_alias="CLASSIFIER_MODEL_PATH")
    embedding_model_path: str | None = Field(default=None, validation_alias="EMBEDDING_MODEL_PATH")
    anthropic_api_key: str | None = Field(default=None, validation_alias="ANTHROPIC_API_KEY")


settings = Settings()
