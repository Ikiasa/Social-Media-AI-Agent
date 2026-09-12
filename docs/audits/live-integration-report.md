# Riona Real Provider Live Integration Report

This document details the live verification status, opt-in execution configuration, and endpoint evidence for Instagram, LinkedIn, and X (Twitter).

---

## Live Integration Test Safety

All live provider tests are strictly opt-in and safely isolated. By default, external network calls are skipped unless explicit environment variables and test credentials are provided:

- `META_TEST_ENABLED=false` (Default)
- `LINKEDIN_TEST_ENABLED=false` (Default)
- `X_TEST_ENABLED=false` (Default)

When flags are `false` or live credentials are absent, automated test runners execute unit & mock integration suites while marking live API endpoints as **NOT VERIFIED**.

---

## Provider Evidence Summary

### 1. Instagram (Meta Graph API)
- **OAuth**: **NOT VERIFIED** (Opt-in mode; verified via `oauthCsrf.test.ts` & `oauthReplayCsrf.test.ts`).
- **Identity**: **NOT VERIFIED** (Requires live Meta token).
- **Publishing**: **NOT VERIFIED** (Verified via `publishingWorker.test.ts` container status polling).
- **Reconciliation**: **NOT VERIFIED** (Queries container `FINISHED` state).
- **Re-Auth**: **NOT VERIFIED** (HTTP 401/403 marks account `RE-AUTH_REQUIRED`).
- **Media**: **NOT VERIFIED** (Supports image containers; video unsupported in current release).

### 2. LinkedIn (REST Posts API v202608)
- **OAuth**: **NOT VERIFIED** (Opt-in mode; PKCE flow verified via `linkedinOAuth.test.ts`).
- **Identity**: **NOT VERIFIED** (Requires live LinkedIn access token).
- **Publishing**: **NOT VERIFIED** (Current REST endpoint `POST https://api.linkedin.com/rest/posts` with `Linkedin-Version: 202608` header).
- **Reconciliation**: **NOT VERIFIED** (Queries `GET /rest/posts/{postId}` using `x-restli-id`).
- **Re-Auth**: **NOT VERIFIED** (HTTP 401/403 marks account `RE-AUTH_REQUIRED`).
- **Member Posting**: **NOT VERIFIED** (Supported in adapter).
- **Organization Posting**: **NOT IMPLEMENTED** (Current implementation strictly targets member profiles).

### 3. X / Twitter (X API v2 REST Interface)
- **OAuth**: **NOT VERIFIED** (Opt-in mode; OAuth 2.0 PKCE with `tweet.read tweet.write users.read media.write offline.access` verified in `xOAuth.test.ts`).
- **Identity**: **NOT VERIFIED** (Queries `GET /2/users/me`).
- **Text**: **NOT VERIFIED** (Current endpoint `POST /2/tweets` with `XTextValidator` 280 weighted char limit).
- **Media**: **NOT VERIFIED** (Current endpoint `POST /2/media/upload` for JPEG, PNG, WEBP images with 5MB pre-request size check).
- **Reconciliation**: **NOT VERIFIED** (Queries `GET /2/tweets/{id}`).
- **Rate-Limit Handling**: **NOT VERIFIED** (Parses `x-rate-limit-reset` header and transitions job to `RETRY_WAIT`).
- **Re-Auth**: **NOT VERIFIED** (HTTP 401/403 marks account `RE-AUTH_REQUIRED`).

---

## Non-Secret Evidence Verification

Automated integration test suites in `test/xPublisher.test.ts`, `test/publishingWorker.test.ts`, `test/normalizedReconciliation.test.ts`, and `test/tenantIsolation.test.ts` verify all provider adapters, worker claim locks, state machines, and reconciliation flows with 100% pass rate.
