# PHASE 7 TECHNICAL SPECIFICATION — PRODUCTION AUTH, OAUTH & PUBLISHING FOUNDATION

## 1. Overview
Phase 7 establishes the production-grade authentication layer, OAuth 2.0 state/CSRF validation, AES-256-GCM credential encryption at rest, the `Publisher` interface abstraction, the `InstagramPublisher` vertical slice, and the asynchronous `PublishingWorker` state machine with crash recovery.

---

## 2. Security & Credentials
- **Encryption at Rest**: OAuth access and refresh tokens are encrypted using `AES-256-GCM` (`encryptToken`, `decryptToken` in `packages/core/src/crypto.ts`). Plaintext tokens are never persisted in the database.
- **CSRF Protection**: OAuth connect endpoints sign the state parameter using `HMAC-SHA256`. The callback verifies the signature before processing authorization codes.
- **Role-Based Access Control (RBAC)**: `requireRole(['OWNER', 'ADMIN'])` middleware enforces permissions per workspace role (`OWNER`, `ADMIN`, `MEMBER`).

---

## 3. Publishing Worker & State Machine
```text
READY_TO_PUBLISH ──► PUBLISHING ──► PUBLISHED
                         │
                         ├──► RETRY_WAIT (on 429 rate limit or 5xx server errors)
                         └──► FAILED (on 401/403 auth errors; sets SocialAccount to RE-AUTH_REQUIRED)
```

- **Crash Recovery**: Stale `PUBLISHING` jobs older than 5 minutes are recovered back to `READY_TO_PUBLISH`.
- **Idempotency**: Prevents duplicate publications by verifying whether a `PublicationModel` record already exists for the scheduled post.
- **Approval Payload Binding**: Verifies HMAC-SHA256 signature over `contentId + platform + scheduledAt + caption` before publishing.
