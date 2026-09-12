# ADR-006: Timezone-Aware Calendar Scheduler Strategy

## Context
Content scheduling requires transitioning approved drafts into a scheduled queue and processing due posts at their target publish timestamp. Actual social media platform publishing (Instagram Graph API, LinkedIn API) is disabled until Phase 7.

## Decision
1. **Timezone Handling**: All scheduled timestamps are stored in UTC in `ScheduledPostModel` while recording the original user timezone (e.g. `Asia/Jakarta`).
2. **Scheduler Engine**: Implemented in `services/scheduler/SchedulerEngine.ts`.
3. **Idempotency Strategy**: Scheduler queries pending posts where `scheduledAt <= now` and status is `SCHEDULED`. Deduplication is enforced via unique key `{ workspaceId, contentId, scheduledAt, platform }`.
4. **Publishing Status Transition**: When a scheduled post reaches its publish time without active production OAuth credentials, the scheduler transitions the post to `READY_TO_PUBLISH` or `BLOCKED`, recording the reason in execution logs. **It NEVER returns fake success or claims real social media publishing occurred.**
