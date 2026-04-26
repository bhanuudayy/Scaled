import os
from dataclasses import dataclass
from dotenv import load_dotenv

load_dotenv(override=True)

@dataclass(frozen=True)
class Settings:
    groq_api_key: str | None = os.getenv("GROQ_API_KEY")
    groq_model: str = os.getenv("GROQ_MODEL", "llama-3.3-70b-versatile")
    ai_auditor_model: str = os.getenv("AI_AUDITOR_MODEL", "llama-3.3-70b-versatile")
    llm_timeout_seconds: float = float(os.getenv("LLM_TIMEOUT_SECONDS", "45.0"))


settings = Settings()
