import json
import logging
from app.logging import redact_secrets, StructuredJsonFormatter


def test_redact_secrets_bearer_token():
    raw = "Header Authorization: Bearer secret_access_token_12345"
    sanitized = redact_secrets(raw)
    assert "[REDACTED]" in sanitized
    assert "secret_access_token_12345" not in sanitized


def test_redact_secrets_api_key():
    raw = "Request params GEMINI_API_KEY=AIzaSyA123456789 secret string"
    sanitized = redact_secrets(raw)
    assert "[REDACTED]" in sanitized
    assert "AIzaSyA123456789" not in sanitized


def test_structured_json_formatter():
    formatter = StructuredJsonFormatter()
    record = logging.LogRecord(
        name="test_logger",
        level=logging.INFO,
        pathname="test.py",
        lineno=10,
        msg="Executing task for user with api_key=super_secret_key_123",
        args=(),
        exc_info=None,
    )
    record.requestId = "req_999"
    record.workspaceId = "ws-test-123"

    formatted = formatter.format(record)
    log_data = json.loads(formatted)

    assert log_data["level"] == "info"
    assert log_data["service"] == "riona-crewai"
    assert log_data["requestId"] == "req_999"
    assert log_data["workspaceId"] == "ws-test-123"
    assert "super_secret_key_123" not in log_data["message"]
    assert "[REDACTED]" in log_data["message"]
