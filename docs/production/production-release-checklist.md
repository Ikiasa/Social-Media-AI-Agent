# Riona Production Release Checklist & Operational Runbook

This document details the mandatory checklist required prior to deploying Riona to production environments.

---

## 1. Security Baseline
- [x] JWT signature, issuer (`riona-api`), audience, and expiry validated in `jwtAuthSecurity.test.ts`.
- [x] Dev headers (`X-Dev-User-Id`, `X-Dev-Workspace-Id`) rejected in production mode (`NODE_ENV === 'production'`).
- [x] RBAC permissions (`OWNER`, `ADMIN`, `MEMBER`) verified at API boundaries.
- [x] Multi-tenant cross-workspace data isolation verified in `tenantIsolation.test.ts`.
- [x] OAuth state/nonce protection verified (single-use, 10-min TTL, timing-safe equality).
- [x] Token encryption at rest (AES-256-GCM) verified in `crypto.test.ts`.
- [x] SSRF outbound URL safety filter verified in `ssrfProtection.test.ts`.
- [x] Secret scanning clean. `.env.example` verified with placeholders only.

---

## 2. Dependencies
- [x] `npm audit fix` executed.
- [x] 0 runtime vulnerabilities verified in `../operations/dependency-security.md`.
- [x] 29 dev-only/tooling vulnerabilities documented and classified as accepted risks.

---

## 3. Social Media Providers
- [x] **Instagram**: Graph API `POST /{ig_user_id}/media` & container status checking (`FINISHED`).
- [x] **LinkedIn**: Current Posts API (`POST /rest/posts`), version header `Linkedin-Version: 202608`, `x-restli-id` provider ID extraction.
- [x] **X (Twitter)**: API v2 Tweets endpoint (`POST /2/tweets`), Media Upload v2 (`POST /2/media/upload`), weighted text validator (280 max limit), 5MB pre-request image size check. Zero legacy v1.1 usage.

---

## 4. Scheduler & Worker Reliability
- [x] Atomic claim locks (`findOneAndUpdate`) verify zero duplicate job processing in `atomicWorkerConcurrency.test.ts`.
- [x] Exponential backoff retries for transient errors and HTTP 429 rate limits.
- [x] Stale worker recovery and idempotent `Publication` creation verified.

---

## 5. Operations, Health & Shutdown
- [x] Liveness (`/health/liveness`) and Readiness (`/health/readiness`) endpoints verified.
- [x] Graceful shutdown handler (`SIGTERM`/`SIGINT`) verified in `healthShutdown.test.ts`.
- [x] Startup validator (`validateProductionConfig()`) asserts strong `JWT_SECRET` and `ENCRYPTION_SECRET`.

---

## 6. Rollback Procedures
- **Application Rollback**: Revert container/deployment artifact to previous release tag.
- **Database Compatibility**: Model schemas maintain backwards-compatible optional fields.
- **Provider Credential Rollback**: Decryption service maintains fallback key support during secret rotation.
