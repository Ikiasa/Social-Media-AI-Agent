from app.health import get_liveness_status, get_readiness_status
from app.config import settings


def test_liveness_probe():
    res = get_liveness_status()
    assert res["status"] == "UP"
    assert res["service"] == "riona-crewai"


def test_readiness_probe_development():
    res = get_readiness_status()
    assert res["status"] == "READY"
    assert "riona_api_url" in res


def test_readiness_probe_failure_mode(monkeypatch):
    monkeypatch.setattr(settings, "ENVIRONMENT", "production")
    monkeypatch.setattr(settings, "INTERNAL_API_KEY", "")
    res = get_readiness_status()
    assert res["status"] == "NOT_READY"
    assert "error" in res
