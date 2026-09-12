import os
from typing import Optional
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    ENVIRONMENT: str = "development"
    RIONA_API_URL: str = "http://localhost:3001"
    CREWAI_SERVICE_PORT: int = 8000
    LLM_PROVIDER: str = "gemini"
    REQUEST_TIMEOUT_SECONDS: int = 30
    MAX_TASK_EXECUTION_TIME_SECONDS: int = 120
    LOG_LEVEL: str = "INFO"
    INTERNAL_API_KEY: Optional[str] = None

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore",
    )

    def validate_production_readiness(self) -> None:
        """
        In production environment, fails closed if critical settings or secrets are missing.
        """
        if self.ENVIRONMENT.lower() == "production":
            if not self.RIONA_API_URL or "localhost" in self.RIONA_API_URL:
                raise ValueError("Production mode requires a valid non-localhost RIONA_API_URL.")
            if not self.INTERNAL_API_KEY or len(self.INTERNAL_API_KEY) < 16:
                raise ValueError("Production mode requires a strong INTERNAL_API_KEY (minimum 16 characters).")


settings = Settings()
