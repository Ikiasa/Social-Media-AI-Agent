# AI Social Media Agent — Migration Strategy & File Mapping

## 1. Migration Overview

This document tracks the audit and disposition of all existing files from the `harshmriduhash/Social-Media-AI-Agent` foundation repository into the target modular architecture outlined in `ARCHITECTURE.md`.

In accordance with our core principles:
- **UNDERSTAND $\rightarrow$ AUDIT $\rightarrow$ TEST $\rightarrow$ EXTRACT $\rightarrow$ REFACTOR $\rightarrow$ EXTEND**
- No premature file deletion or full rewrite without empirical justification.

---

## 2. File Migration Matrix

| File Path | Existing Responsibility | Upstream Dependencies | Migration Decision | Target Module / Path | Notes & Strategy |
| :--- | :--- | :--- | :--- | :--- | :--- |
| `src/app.ts` | Monolithic application entrypoint and middleware server setup | `express`, `cookie-parser`, `dotenv`, `helmet`, `./client/Instagram` (missing), `./config/logger` (missing), `./config/db` (missing), `./utils` (missing) | **REFACTOR / REPLACE** | `services/api/src/app.ts` | Refactor into clean Express REST API application with proper workspace middleware. Replace uncommitted missing imports. |
| `src/Agent/index.ts` | Core agent call wrapping `@google/generative-ai` with structured JSON schema | `@google/generative-ai`, `../config/logger`, `../secret`, `../utils`, `./schema` | **REFACTOR & MOVE** | `packages/ai/src/providers/gemini.ts` | Extract Gemini AI provider into `packages/ai`. Implement standard `AIProvider` interface. Move secret handling to proper env config. |
| `src/Agent/schema/index.ts` | Defines Gemini `InstagramCommentSchema` and Mongoose `Tweet` model draft | `@google/generative-ai`, `mongoose` | **EXTRACT & SPLIT** | `packages/ai/src/schemas/` & `packages/database/src/schemas/` | Separate AI response schemas from MongoDB/PostgreSQL database schemas. Convert `InstagramCommentSchema` into reusable zod/JSON schema. |
| `src/Agent/script/summarize.ts` | Summarizes YouTube transcripts into structured training prompts with circular API key fallback | `@google/generative-ai`, `../../config/logger`, `dotenv` | **REFACTOR & MOVE** | `packages/ai/src/agents/summarizer.ts` | Extract prompt summarization and API key rotation logic into AI Agent package. |
| `src/Agent/training/FilesTraining.ts` | Text extraction from PDF, DOC, DOCX, CSV, TXT files | `pdf-parse`, `mammoth`, `textract`, `csv-parser`, `fs`, `path`, `stream` | **REFACTOR & MOVE** | `packages/knowledge/src/parsers/fileParser.ts` | Excellent foundation for Knowledge RAG ingestion. Wrap functions in unit tests and connect to chunker & vector store. |
| `src/Agent/training/TrainWithAudio.ts` | Uploads audio to Google AI File Manager (48h temp storage) and retrieves AI audio summary | `@google/generative-ai`, `@google/generative-ai/server`, `fs`, `dotenv` | **REFACTOR & MOVE** | `packages/knowledge/src/parsers/audioParser.ts` | Move audio processing to knowledge ingestion worker. Clean up temp files safely. |
| `src/Agent/training/WebsiteScraping.ts` | Web crawler and DOM cleaner using Puppeteer, JSDOM, and DOMPurify | `puppeteer`, `dompurify`, `jsdom`, `../../utils` | **REFACTOR & MOVE** | `packages/knowledge/src/parsers/webScraper.ts` | Extract crawler logic. Isolate Puppeteer usage behind an interface. Connect cleaned text output to RAG pipeline. |
| `src/Agent/training/youtubeURL.ts` | Fetches YouTube video transcript by URL or ID | `youtube-transcript`, `../script/summarize`, `../../config/logger` | **REFACTOR & MOVE** | `packages/knowledge/src/parsers/youtubeParser.ts` | Clean up transcript extractor. Use inside Knowledge RAG ingestion. |
| `src/Agent/characters/elon.character.json` | Sample character profile (Elon Musk bio, lore, style, post examples) | None | **KEEP & MOVE** | `packages/core/src/templates/elon.json` | Useful baseline brand persona template for testing Brand Profile feature. |
| `src/Agent/characters/sample.character.json` | Empty character profile boilerplate | None | **KEEP & MOVE** | `packages/core/src/templates/sample.json` | Template reference for user-defined custom Brand profiles. |
| `src/client/Instagram.ts` | Instagram automation client (Referenced in `app.ts`, missing in foundation git commit) | `instagram-private-api`, `puppeteer` | **REPLACE & IMPLEMENT** | `platforms/instagram/src/InstagramAdapter.ts` | Implement clean `InstagramAdapter` implementing `SocialPlatform` interface using `instagram-private-api` and Instagram Graph API. |
| `src/config/logger.ts` | Winston logger setup (Referenced in `app.ts`, missing in foundation git commit) | `winston`, `winston-daily-rotate-file` | **REPLACE & IMPLEMENT** | `packages/core/src/logger.ts` | Implement structured JSON logger with `winston` supporting `workspace_id`, `request_id`, and `execution_id`. |
| `src/config/db.ts` | Database connection script (Referenced in `app.ts`, missing in foundation git commit) | `mongoose` | **REPLACE & IMPLEMENT** | `packages/database/src/client.ts` | Implement database connection layer. Support Mongo/PostgreSQL connection string handling cleanly. |
| `src/utils/index.ts` | Shared utilities (Referenced across `app.ts`, `WebsiteScraping.ts`, missing in git commit) | None | **REPLACE & IMPLEMENT** | `packages/core/src/utils/` | Implement missing helper functions (`handleError`, `saveScrapedData`, `setup_HandleError`). |

---

## 3. Completion Status

1. **Phase 2 — Foundation Boundaries**: COMPLETED. All missing upstream modules (`logger.ts`, `db.ts`, `utils`, `secret.ts`, `client/Instagram.ts`) resolved cleanly.
2. **Phase 3 — Domain Model & REST API**: COMPLETED. 12 Mongoose models, repository layer, Brand/Content/Knowledge/Generation services, Express REST API with Zod validation, workspace authorization, and `../api/API.md`.
3. **Phase 4 — Brand Knowledge Engine & RAG Foundation**: COMPLETED. Normalized knowledge ingestion, `TokenWindowChunkingStrategy`, `GeminiEmbeddingProvider`, `MongooseVectorStore`, `KnowledgeRetrievalService`, `KnowledgeContextBuilder`, `BrandContextBuilder`, source attribution, delete cascade, and RAG security isolation.
4. **Phase 5 — Agent Orchestrator & Controlled Tools**: COMPLETED. Single Agent Orchestrator, Intent Router, Plan Builder, Execution Engine, Controlled Tools Registry, human approval boundaries, agent guardrails, prompt injection defense, and REST API endpoints.
5. **Phase 6 — Web Portal, Content Workflow & Calendar**: COMPLETED. Full Next/React web application in `apps/web/`, state machine content lifecycle, visual calendar grid, and typed `ApiClient`.

