# Application Rate Limiting Policy

This document details Riona's window-based rate limiting architecture across HTTP endpoint categories.

---

## Rate Limit Categories & Limits

| Endpoint Category | Max Requests | Window (Ms) | Scope | HTTP Response |
|---|---|---|---|---|
| `auth` | 10 | 60,000 (1 min) | IP / Workspace | 429 Too Many Requests |
| `oauth` | 20 | 60,000 (1 min) | IP / Workspace | 429 Too Many Requests |
| `content_generation` | 15 | 60,000 (1 min) | Workspace ID | 429 Too Many Requests |
| `knowledge_ingestion` | 10 | 60,000 (1 min) | Workspace ID | 429 Too Many Requests |
| `publishing` | 30 | 60,000 (1 min) | Workspace ID | 429 Too Many Requests |
| `general_api` | 100 | 60,000 (1 min) | IP / Workspace | 429 Too Many Requests |

---

## HTTP Rate Limit Headers

Every rate-limited response includes standard RFC-compliant headers:

```http
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 99
X-RateLimit-Reset: 1700000060
Retry-After: 60
```
