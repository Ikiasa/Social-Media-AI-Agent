# X (Twitter) API v2 Integration Specification

This document details the X API v2 integration, OAuth 2.0 PKCE authentication flow, text length validation rules, media upload specs, rate limit handling, reconciliation, operational cost considerations, and testing procedures.

---

## 1. API Interface & Authentication

- **API Version**: X API v2 REST Interface
- **Base Endpoint (`X_API_BASE_URL`)**: `https://api.x.com`
- **Media Upload Endpoint (`X_MEDIA_UPLOAD_URL`)**: `https://api.x.com/2/media/upload`
- **Primary Post Endpoint**: `POST https://api.x.com/2/tweets`
- **Reconciliation Endpoint**: `GET https://api.x.com/2/tweets/{id}`
- **User Identity Endpoint**: `GET https://api.x.com/2/users/me`

---

## 2. OAuth 2.0 + PKCE Authentication Flow

- **Authorization Endpoint**: `https://twitter.com/i/oauth2/authorize`
- **Token Endpoint**: `https://api.x.com/2/oauth2/token`
- **Flow**: OAuth 2.0 Authorization Code Flow with PKCE (Proof Key for Code Exchange).
- **PKCE Parameters**:
  - `code_challenge`: SHA-256 hash of random 64-byte `code_verifier`, base64url encoded.
  - `code_challenge_method`: `S256`
- **OAuth Scopes**: `tweet.read`, `tweet.write`, `users.read`, `media.write`, `offline.access`.
- **Token Storage**: Access tokens and refresh tokens encrypted at rest via AES-256-GCM. Never logged or exposed in traces.

---

## 3. Text Validation & Weighted Character Counting

X enforces a 280 weighted-character limit per tweet. Character counting follows special rules:
- **URLs**: Transformed to `t.co` short links, counting as exactly **23 weighted characters** regardless of URL length.
- **CJK Characters & Emojis**: Count as **2 weighted characters** each.
- **Standard ASCII / Latin Characters**: Count as **1 weighted character** each.
- **Fail-Fast Safety**: Content exceeding 280 weighted characters is rejected locally with a `VALIDATION` error prior to network execution.

---

## 4. Media Upload (v2) & Pre-Request Validation

- **v2 Media Upload Endpoint**: `POST https://api.x.com/2/media/upload`
- **Supported Media Types**: JPEG (`image/jpeg`), PNG (`image/png`), WEBP (`image/webp`).
- **Upload Request Schema**:
  ```json
  {
    "media": {
      "media_category": "tweet_image",
      "media_type": "image/jpeg"
    }
  }
  ```
- **Image Size Limit**: Maximum **5MB (5,242,880 bytes)** per image.
- **Pre-Request Size Check**: If image size exceeds 5MB, fails fast locally with `VALIDATION` error (`MEDIA_SIZE_EXCEEDED`).
- **Video Restrictions**: Video publishing is unsupported in the current release. Posts containing video URLs fail fast with a `VALIDATION` error (`UNSUPPORTED_MEDIA_TYPE`).

---

## 5. Rate Limit & Error Handling

- **Rate Limit Headers**: Inspects `x-rate-limit-limit`, `x-rate-limit-remaining`, and `x-rate-limit-reset`.
- **HTTP 429 Rate Limits**: Classified as `RATE_LIMIT` and returned as `status: 'RETRY_WAIT'`, `shouldRetry: true`. The worker schedules exponential backoff retries.
- **HTTP 401/403**: Classified as `AUTHENTICATION`/`AUTHORIZATION` with `isPermanentAuthFailure: true`.
- **HTTP 5xx / Network Errors**: Classified as `TRANSIENT` with `shouldRetry: true`.

---

## 6. Reconciliation & Idempotency Safety

- **Provider ID**: Extracted as opaque string `data.data.id` from successful `POST /2/tweets` responses (stored in `Publication.providerPostId`).
- **Malformed Response Safety**: If X returns an HTTP 2xx success status but no provider tweet ID can be extracted, `XPublisher` returns `outcome: 'UNKNOWN'`, `shouldRetry: false`, `errorCode: 'MALFORMED_RESPONSE'` to prevent duplicate re-submissions.
- **Reconciliation Lookup**: `getPublishStatus` queries `GET /2/tweets/{postId}`:
  - `HTTP 200` $\rightarrow$ `status: 'PUBLISHED'`
  - `HTTP 404` $\rightarrow$ `status: 'NOT_FOUND'`
  - `HTTP 5xx / Timeout` $\rightarrow$ `status: 'UNKNOWN'`

---

## 7. Operational Cost Considerations

- **API Pricing**: The X API v2 operates under pay-per-use tier pricing. Application logic enforces pre-request text validation, image size checks, and rate limit tracking to minimize unnecessary API calls and operational overhead.

---

## 8. Legacy API Audit Results

Repository-wide audit confirms **0 production runtime usage** of legacy endpoints:
- `upload.twitter.com`: **0 production usage**
- `/1.1/media/upload`: **0 production usage**
- `media_id_string`: **0 production usage**
- `media/upload.json`: **0 production usage**
- `POST /1.1/statuses/update`: **0 production usage**
- `POST /statuses/update`: **0 production usage**
- OAuth 1.0a runtime: **0 production usage**
