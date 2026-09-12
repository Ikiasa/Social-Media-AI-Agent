# Riona Production Truthfulness Policy & Architecture Guidelines

## Executive Summary
This document establishes Riona's strict **Production Truthfulness Policy**, defining failure semantics, mock isolation boundaries, and data integrity gates across all social media AI agent services.

---

## 1. Core Mandates

> **The Zero-Dummy Policy:**  
> Production failure must fail honestly. Never fabricate business data, social comments, sentiment analytics, trend sources, or generated posts to make an endpoint or service appear successful.

### Standardized Semantic States
All Riona microservices must return clear, truthful status codes:

- `SUCCESS` — Real data retrieved or operation executed successfully.
- `PARTIAL` — Subset of data retrieved; unavailable portions explicitly marked as `null` or `[]`.
- `NO_DATA` — No records found in DB or external provider.
- `UNAVAILABLE` — External API, LLM, or scraper endpoint unavailable.
- `NOT_CONFIGURED` — Mandatory credentials/API keys missing.
- `RATE_LIMITED` — HTTP 429 encountered; retry scheduled.
- `AUTH_FAILED` — Provider OAuth token invalid/revoked.
- `TIMEOUT` — Request execution exceeded maximum bounded deadline.
- `FAILED` — Fatal execution error; error details recorded in JSON response.

---

## 2. Component Truthfulness Gates

### A. Audience Analysis Crew (`services/crewai-service`)
- **Missing API Keys:** If `GEMINI_API_KEY` is invalid or missing, CrewAI execution fails immediately with `CONFIGURATION_ERROR` / HTTP 500. No synthetic sentiment numbers (e.g. 65%/25%/10%) are ever generated.
- **Background Jobs:** Analysis jobs are persisted to file/disk storage (`FileJobStorage` under `./data/jobs/`), ensuring jobs survive container restarts.

### B. Social Scraper Tools (`scraper_tool.py`)
- **Instagram Comments:** When live Graph API access tokens or authenticated sessions are not provided, `scrape_instagram_comments_tool` returns `comments: []` and `status: "UNAVAILABLE"`. Fake comments (e.g. `user_sample1`, `user_sample2`, `c_live_101`) are prohibited.

### C. Trend-to-Content Pipeline (`crew_trend.py`)
- **Source Validation:** If all trend URLs fail scraping or SSRF security checks, `run_trend_to_content_pipeline` returns `status: "NO_SOURCE"`, `source_count: 0`, and `generated_posts: []`. Fictional starter documents (e.g., `src_default`) are prohibited.
- **LLM Post Generation:** If LLM output parsing fails after bounded retries (max 2 attempts), the pipeline returns `status: "GENERATION_FAILED"` and `generated_posts: []`. Default fallback post templates (e.g., `"🚀 Rahasia Tren Baru..."`) are prohibited.

### D. Knowledge RAG Store (`llamaindex_tool.py` & `knowledge_service.py`)
- **Empty Knowledge State:** An empty knowledge directory returns status `NO_KNOWLEDGE` or empty document records. Automatic creation of synthetic files (e.g., `brand_guidelines.txt`) is prohibited.
- **Embedding Vectors (`packages/knowledge`):** `GeminiEmbeddingProvider` throws explicit `AIError` when embedding calls fail. Fallback character-math vector generation is prohibited.

### E. Social Platform Publishers (`platforms/`)
- **Mock Token Isolation:** Publishers (`InstagramPublisher`, `LinkedInPublisher`, `XPublisher`) check `process.env.NODE_ENV === 'test'` before processing `mock_` prefix access tokens. In production (`NODE_ENV === 'production'`), `mock_` tokens are passed to real provider APIs or rejected with `401_UNAUTHORIZED`.

---

## 3. Configuration & Startup Mandates
In production mode (`NODE_ENV=production`), missing required secrets (`GEMINI_API_KEY`, `INTERNAL_API_KEY`, `JWT_SECRET`, `ENCRYPTION_SECRET`) cause immediate startup failure to prevent silent degradation into mock modes.
