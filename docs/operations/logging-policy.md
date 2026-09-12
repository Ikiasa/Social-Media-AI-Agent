# Riona Logging & Secret Redaction Policy

This document defines the production logging policy, machine-readable format, allowed metadata, and forbidden sensitive fields.

---

## Machine-Readable Log Format

All production logs are formatted as structured JSON containing standard correlation attributes:

```json
{
  "timestamp": "2026-09-02T10:30:00.000Z",
  "level": "info",
  "service": "riona-agent",
  "environment": "production",
  "requestId": "req_123456789",
  "traceId": "trace_987654321",
  "workspaceId": "ws-123",
  "userId": "user-456",
  "operation": "PUBLISH_POST",
  "durationMs": 420,
  "status": "SUCCESS",
  "message": "PublishingWorker: Successfully published post sched-1 to instagram"
}
```

---

## Field Category Rules

### Allowed Metadata Fields
- `timestamp` (UTC ISO-8601 string)
- `level` (`info`, `warn`, `error`, `debug`)
- `service` (`riona-agent`, `riona-api`, `riona-scheduler`)
- `environment` (`production`, `staging`, `development`)
- `requestId`, `traceId`, `workspaceId`, `userId`, `executionId`, `scheduledPostId`, `publicationId`
- `provider` (`instagram`, `linkedin`, `x`)
- `operation`, `status`, `durationMs`, `errorCode`, `providerRequestId`

### Forbidden Sensitive Fields (Redacted Automatically)
- Access tokens (`access_token`, `encryptedAccessToken`)
- Refresh tokens (`refresh_token`, `encryptedRefreshToken`)
- Client secrets (`client_secret`, `LINKEDIN_CLIENT_SECRET`, `X_CLIENT_SECRET`)
- JWTs & `Authorization` HTTP headers
- OAuth authorization codes & PKCE `code_verifier` strings
- Passwords, cookies, & raw uploaded media buffers
