from pydantic import BaseModel
import os


class Settings(BaseModel):
    ai_provider: str = os.getenv("AI_PROVIDER", "groq")
    ai_base_url: str = os.getenv("AI_BASE_URL", "https://api.groq.com/openai/v1")
    ai_api_key: str = os.getenv("AI_API_KEY", "")
    ai_model: str = os.getenv("AI_MODEL", "openai/gpt-oss-120b")
    ai_evaluator_model: str = os.getenv("AI_EVALUATOR_MODEL", "openai/gpt-oss-120b")
    stt_provider: str = os.getenv("STT_PROVIDER", "placeholder")
    tts_provider: str = os.getenv("TTS_PROVIDER", "placeholder")


settings = Settings()

if not settings.ai_api_key:
    raise RuntimeError("AI_API_KEY is required and must be provided via environment variables.")
