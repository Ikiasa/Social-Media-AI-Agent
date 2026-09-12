from typing import Dict, Any
from .config import settings


def get_liveness_status() -> Dict[str, Any]:
    """
    Returns basic service liveness status.
    """
    return {
        "status": "UP",
        "service": "riona-crewai",
        "environment": settings.ENVIRONMENT,
    }


def get_readiness_status() -> Dict[str, Any]:
    """
    Returns service readiness status after verifying configuration integrity.
    """
    try:
        settings.validate_production_readiness()
        return {
            "status": "READY",
            "service": "riona-crewai",
            "riona_api_url": settings.RIONA_API_URL,
            "llm_provider": settings.LLM_PROVIDER,
            "environment": settings.ENVIRONMENT,
        }
    except Exception as e:
        return {
            "status": "NOT_READY",
            "service": "riona-crewai",
            "error": str(e),
        }
