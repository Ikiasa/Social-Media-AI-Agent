# Phase 6 Specification — Web Portal, Content Workflow & Calendar

## Overview
Phase 6 connects the backend foundation (Domain Models, Mongoose Repositories, RAG Knowledge Engine, AI Provider, and Agent Orchestrator) to a production Web Portal (`apps/web`) and a Timezone-Aware Calendar Scheduler Engine (`services/scheduler`).

## Key Deliverables

### 1. Web Portal (`apps/web/`)
- `/dashboard`: Real-time workspace stats, recent execution feeds, upcoming schedule.
- `/assistant`: Interactive Agent chat interface with execution trace inspection & approval workflow.
- `/content`: Content management list, state machine transitions (`DRAFT` $\rightarrow$ `APPROVED` $\rightarrow$ `SCHEDULED`), and content editor.
- `/calendar`: Visual Calendar grid (Month, Week, List views) displaying status color badges.
- `/knowledge`: Ingestion document manager (upload file, web/YouTube URL, reprocess, delete cascade).
- `/brands`: Brand profile management and brand context selection.
- `/agent/executions`: Audit trace viewer for agent execution runs.

### 2. Timezone-Aware Calendar & Scheduler Engine (`services/scheduler/`)
- `SchedulerEngine`: Processes due scheduled posts.
- Enforces strict idempotency (`workspaceId + contentId + scheduledAt + platform`).
- Transitions due posts to `READY_TO_PUBLISH` without reporting fake social media publishing success.

### 3. Backend Endpoints
- `GET /api/dashboard`
- `GET /api/calendar`
- `POST /api/calendar/schedule`
- `PATCH /api/calendar/schedule/:id`
- `DELETE /api/calendar/schedule/:id`
- `GET /api/agent/executions`
