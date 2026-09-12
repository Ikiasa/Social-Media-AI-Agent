# OpenTelemetry & Observability Specification

This document details Riona's vendor-neutral observability instrumentation for traces, metrics, and log correlation.

---

## Metrics Collection (`TelemetryService`)

- `http_requests_total`: Total HTTP requests processed, tagged by `method`, `route`, `status_code`.
- `http_latency_ms`: HTTP response latency histogram in milliseconds.
- `agent_executions_total`: Agent Orchestrator execution attempts, tagged by `workspace_id`, `status`.
- `agent_execution_duration_ms`: Execution duration timer for AI agent workflows.
- `scheduler_jobs_claimed_total`: Jobs claimed by `PublishingWorker`.
- `publisher_attempts_total`: Total publish requests, tagged by `platform` (`instagram`, `linkedin`, `x`).
- `publisher_success_total`: Successful publications.
- `publisher_failure_total`: Failed publications, tagged by `error_category`.

---

## Log & Trace Correlation

Every request attaches standard correlation IDs:
- `requestId`: Generated per incoming HTTP request.
- `traceId`: OpenTelemetry trace context ID.
- `executionId`: Unique ID assigned to Agent Orchestrator runs.
- `scheduledPostId` & `publicationId`: Cross-references scheduler and publication audit records.
