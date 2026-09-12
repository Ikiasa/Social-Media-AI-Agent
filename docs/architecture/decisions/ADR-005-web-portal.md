# ADR-005: Web Portal Architecture & Frontend Integration

## Context
Phase 6 introduces the web-based user interface for the AI Social Media Agent platform. The portal must provide workspace-scoped management of Brands, Knowledge Base documents, Content drafts, AI Agent conversations, Execution traces, and a Visual Calendar.

## Options Considered

1. **Option A: Next.js App Router (Selected)**
   - *Pros*: Full-stack React framework, fast page routing, SSR/CSR capabilities, native TypeScript integration, clean component architecture with Tailwind CSS.
   - *Cons*: Slightly larger bundle size than lightweight Vite SPA.
2. **Option B: Vite React SPA**
   - *Pros*: Fast HMR, minimal setup.
   - *Cons*: Requires separate routing configuration and client-side setup for multi-page SaaS navigation.

## Decision
We select **Option A (Next.js / React + Tailwind CSS Application)** located under `apps/web/`.

## Rationale
- Standardized modular structure (`apps/web` alongside `services/` and `packages/`).
- Seamless integration with typed API client (`apps/web/src/lib/api/client.ts`).
- Workspace context is injected via `AuthProvider` and HTTP development headers (`X-Dev-User-Id`, `X-Dev-Workspace-Id`), allowing seamless transition to OAuth/SSO authentication in future phases without modifying UI components.
