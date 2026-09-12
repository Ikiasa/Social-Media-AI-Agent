import pytest
from app.config import Settings


def test_default_development_config():
    cfg = Settings(ENVIRONMENT="development")
    assert cfg.ENVIRONMENT == "development"
    assert cfg.CREWAI_SERVICE_PORT == 8000
    assert cfg.LLM_PROVIDER == "gemini"
    # Should not raise in development mode
    cfg.validate_production_readiness()


def test_production_config_validation_success():
    cfg = Settings(
        ENVIRONMENT="production",
        RIONA_API_URL="http://riona-api.internal:3001",
        INTERNAL_API_KEY="prod-secret-key-1234567890",
    )
    # Should pass validation
    cfg.validate_production_readiness()


def test_production_config_fails_closed_missing_key():
    cfg = Settings(
        ENVIRONMENT="production",
        RIONA_API_URL="http://riona-api.internal:3001",
        INTERNAL_API_KEY="",
    )
    with pytest.raises(ValueError, match="Production mode requires a strong INTERNAL_API_KEY"):
        cfg.validate_production_readiness()


def test_production_config_fails_closed_localhost_url():
    cfg = Settings(
        ENVIRONMENT="production",
        RIONA_API_URL="http://localhost:3001",
        INTERNAL_API_KEY="prod-secret-key-1234567890",
    )
    with pytest.raises(ValueError, match="non-localhost RIONA_API_URL"):
        cfg.validate_production_readiness()
