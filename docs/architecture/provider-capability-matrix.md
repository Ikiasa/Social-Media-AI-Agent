# Riona Social Media Provider Capability Matrix

This matrix documents supported feature capabilities, API endpoints, and verification status across all integrated social platforms.

---

## Capability Matrix

| Capability | Instagram | LinkedIn | X (Twitter) |
|---|---|---|---|
| **OAuth 2.0 / PKCE** | **PASS** (Graph API OAuth) | **PASS** (PKCE Flow) | **PASS** (PKCE Flow) |
| **Text Post** | **PASS** (Caption) | **PASS** (`/rest/posts`) | **PASS** (`/2/tweets` 280 max) |
| **Image Post** | **PASS** (Container API) | **PASS** (Images API) | **PASS** (`/2/media/upload` 5MB max) |
| **Video Post** | **NOT IMPLEMENTED** | **NOT IMPLEMENTED** | **NOT IMPLEMENTED** |
| **Reconciliation** | **PASS** (Container Status) | **PASS** (`GET /rest/posts`) | **PASS** (`GET /2/tweets/{id}`) |
| **Re-auth Detection** | **PASS** (`RE-AUTH_REQUIRED`) | **PASS** (`RE-AUTH_REQUIRED`) | **PASS** (`RE-AUTH_REQUIRED`) |
| **Rate Limit Backoff** | **PASS** (`RETRY_WAIT`) | **PASS** (`RETRY_WAIT`) | **PASS** (`x-rate-limit-reset`) |
| **Member Post** | N/A | **PASS** (`/rest/posts`) | N/A |
| **Organization Post** | **NOT IMPLEMENTED** | **NOT IMPLEMENTED** | N/A |
| **Live Network Call** | **NOT VERIFIED** | **NOT VERIFIED** | **NOT VERIFIED** |

---

## Detailed Notes

- **Instagram**: Implemented via Meta Graph API v19.0 container creation and status checking. Supports single image posts and text captions.
- **LinkedIn**: Implemented via current REST Posts API (`/rest/posts`) with centralized `Linkedin-Version: 202608` and `X-Restli-Protocol-Version: 2.0.0`. Member profile posting is supported; organization company page posting is **NOT IMPLEMENTED**.
- **X (Twitter)**: Implemented via current X API v2 REST endpoints (`/2/tweets` and `/2/media/upload`). Text validation enforces 280 weighted characters. Media upload supports JPEG, PNG, WEBP up to 5MB. Video chunked upload is **NOT IMPLEMENTED**.
