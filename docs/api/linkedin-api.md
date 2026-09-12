# LinkedIn REST API Integration Specification

This document details the LinkedIn API integration, centralized version configuration, header specifications, post ID extraction rules, and legacy API audit results.

---

## 1. API Version & Configuration

- **Centralized Configuration Location**: [LinkedInConfig.ts](file:///d:/Optimalisasi%20Sosmed/Social-Media-AI-Agent/platforms/linkedin/src/LinkedInConfig.ts)
- **Configured API Version (`LINKEDIN_API_VERSION`)**: Default `202608` (Format: `YYYYMM`, validated strictly via `/^\d{6}$/`).
- **Base URL (`LINKEDIN_API_BASE_URL`)**: `https://api.linkedin.com`
- **Source & Reasoning**: Uses LinkedIn's versioned REST API specifications (Community Management & Posts APIs, 2026). Version strings are configured centrally via environment variables (`LINKEDIN_API_VERSION`) to allow seamless YYYYMM upgrades without modifying provider source code.

### Version Maintenance Procedure
LinkedIn Marketing API versions are subject to periodic sunsetting by Meta/LinkedIn (typically retaining support for 1-2 years).
When upgrading to a newer version:
1. Update `process.env.LINKEDIN_API_VERSION` or the default fallback string in [LinkedInConfig.ts](file:///d:/Optimalisasi%20Sosmed/Social-Media-AI-Agent/platforms/linkedin/src/LinkedInConfig.ts).
2. Run `npx tsc --noEmit` and `npm test` to verify API header propagation and payload schema compatibility.

---

## 2. Mandatory HTTP Headers

All LinkedIn REST API requests include the following standard headers:

```http
Authorization: Bearer <access_token>
Linkedin-Version: 202608
X-Restli-Protocol-Version: 2.0.0
Content-Type: application/json
```

---

## 3. Endpoints & Schemas

### A. Post Creation (`POST /rest/posts`)
- **Text Post Payload**:
  ```json
  {
    "author": "urn:li:person:<sub_id>",
    "commentary": "Caption text",
    "visibility": "PUBLIC",
    "distribution": {
      "feedDistribution": "MAIN_FEED",
      "targetEntities": [],
      "thirdPartyDistributionChannels": []
    },
    "lifecycleState": "PUBLISHED",
    "isReshareDisabledByAuthor": false
  }
  ```

### B. Image Upload (`POST /rest/images?action=initializeUpload`)
- **Initialization Request**:
  ```json
  {
    "initializeUploadRequest": {
      "owner": "urn:li:person:<sub_id>"
    }
  }
  ```
- **Response Handling**: Parses `value.uploadUrl` and `value.image` URN (`urn:li:image:...`). Binary image buffer is uploaded via HTTP `PUT` to `uploadUrl` before post creation.

### C. Post Reconciliation (`GET /rest/posts/{postId}`)
- **Lookup Request**: Queries `GET /rest/posts/{encodeURIComponent(postId)}` with `Linkedin-Version` and `X-Restli-Protocol-Version` headers.
- **State Normalization**:
  - `HTTP 200` $\rightarrow$ `status: 'PUBLISHED'`
  - `HTTP 404` $\rightarrow$ `status: 'NOT_FOUND'`
  - `HTTP 5xx / Network Timeout` $\rightarrow$ `status: 'UNKNOWN'`

---

## 4. Provider Post ID Extraction & Safety

- **Primary Identifier Header**: `x-restli-id` (e.g. `urn:li:share:123456789` or `urn:li:post:123456789`).
- **Secondary Fallback**: `location` HTTP header.
- **Tertiary Fallback**: Response body `id` property.
- **Malformed Response Safety**: If LinkedIn returns an HTTP 2xx success status but no provider ID can be extracted, the worker classifies the outcome as `UNKNOWN` with `shouldRetry: false` (preventing blind duplicate re-submissions).

---

## 5. Legacy API & Version Audit Results

A full repository audit confirmed **0 production runtime usage** of legacy endpoints and deprecated version strings:
- `/v2/shares`: **0 production usage**
- `/v2/ugcPosts`: **0 production usage**
- `/v2/assets`: **0 production usage**
- `registerUpload`: **0 production usage**
- `x-linkedin-id`: **0 production usage**
- Deprecated version literals (`202401`..`202411`, `202405`): **0 production usage**
