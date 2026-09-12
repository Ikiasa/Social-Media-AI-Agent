import re
import json
import logging
from datetime import datetime, timezone
from typing import Any, Dict


SECRET_PATTERNS = [
    (r"(?i)(authorization\s*:\s*bearer\s+)[^\s,]+", r"\1[REDACTED]"),
    (r"(?i)(api[_-]?key\s*[:=]\s*)[^\s,&\"]+", r"\1[REDACTED]"),
    (r"(?i)(secret\s*[:=]\s*)[^\s,&\"]+", r"\1[REDACTED]"),
    (r"(?i)(token\s*[:=]\s*)[^\s,&\"]+", r"\1[REDACTED]"),
    (r"(?i)(password\s*[:=]\s*)[^\s,&\"]+", r"\1[REDACTED]"),
]


def redact_secrets(text: str) -> str:
    """
    Sanitizes string data by redacting sensitive tokens, API keys, and authorization credentials.
    """
    if not text:
        return text
    sanitized = str(text)
    for pattern, replacement in SECRET_PATTERNS:
        sanitized = re.sub(pattern, replacement, sanitized)
    return sanitized


class StructuredJsonFormatter(logging.Formatter):
    """
    Structured JSON log formatter meeting Riona production logging & secret redaction standards.
    """

    def format(self, record: logging.LogRecord) -> str:
        log_obj: Dict[str, Any] = {
            "timestamp": datetime.now(timezone.utc).isoformat(),
            "level": record.levelname.lower(),
            "service": "riona-crewai",
            "environment": getattr(record, "environment", "development"),
            "requestId": getattr(record, "requestId", None),
            "workspaceId": getattr(record, "workspaceId", None),
            "crew": getattr(record, "crew", None),
            "agent": getattr(record, "agent", None),
            "executionId": getattr(record, "executionId", None),
            "durationMs": getattr(record, "durationMs", None),
            "status": getattr(record, "status", None),
            "message": redact_secrets(record.getMessage()),
        }

        # Filter out None values for clean JSON output
        log_obj = {k: v for k, v in log_obj.items() if v is not None}

        if record.exc_info:
            log_obj["exception"] = redact_secrets(self.formatException(record.exc_info))

        return json.dumps(log_obj)


def setup_logger(name: str = "riona-crewai", level: str = "INFO") -> logging.Logger:
    logger = logging.getLogger(name)
    logger.setLevel(getattr(logging, level.upper(), logging.INFO))
    logger.propagate = False

    if not logger.handlers:
        handler = logging.StreamHandler()
        handler.setFormatter(StructuredJsonFormatter())
        logger.addHandler(handler)

    return logger


logger = setup_logger()
