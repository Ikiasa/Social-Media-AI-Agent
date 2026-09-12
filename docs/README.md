# Riona Documentation Index 📚

Welcome to the documentation repository for **Riona — Social Media AI Agent**. This directory contains architectural specifications, API documentation, operational policies, production readiness checklists, and phase audit reports.

---

## 📁 Documentation Map

```
docs/
├── README.md                           # Master Documentation Index (this file)
├── api/                                # API & Integration Specifications
│   ├── API.md                          # REST API Endpoints & Contract
│   ├── linkedin-api.md                 # LinkedIn API Integration Specification
│   ├── x-api.md                        # X (Twitter) API Integration Specification
│   └── x-text-validation.md            # X Text Character Weighting & Validation
├── architecture/                       # System Design & Decision Records
│   ├── ARCHITECTURE.md                 # Core System Architecture & Layering
│   ├── MIGRATION.md                    # Codebase Migration & Disposition Matrix
│   ├── provider-capability-matrix.md   # Social Media Provider Capability Matrix
│   └── decisions/                      # Architecture Decision Records (ADRs)
│       ├── ADR-004-vector-store.md     # Vector Store Selection
│       ├── ADR-005-web-portal.md       # Web Portal Architecture
│       └── ADR-006-scheduler.md        # Background Scheduler & Lock Strategy
├── operations/                         # Operations, Security & Governance
│   ├── configuration.md                # Environment Configuration Specification
│   ├── dependency-security.md          # Dependency Security & Vulnerability Audit
│   ├── logging-policy.md               # Structured Logging & Secret Redaction Policy
│   ├── observability.md                # OpenTelemetry & Tracing Setup
│   ├── rate-limits.md                  # Application Rate Limiting Policy
│   ├── secrets.md                      # Secret Management & Encryption Policy
│   └── security-baseline.md            # OWASP ASVS Security Baseline Audit
├── production/                         # Production Readiness & Release
│   ├── production-readiness.md         # Production Readiness Verification Gate
│   ├── production-release-checklist.md # Production Deployment Checklist & Runbook
│   └── production-truthfulness.md      # Real Implementation vs Mock Audit
└── audits/                             # Historical Phase Reports & Integrations
    ├── PHASE-6.md                      # Phase 6 Web Portal Audit Report
    ├── PHASE-7.md                      # Phase 7 Hardening & Worker Audit Report
    ├── PHASE-7.1-AUDIT.md              # Phase 7.1 Production Audit Report
    ├── langchain-integration-audit.md  # LangChain Integration Audit Report
    ├── live-integration-report.md      # Live Integration Audit Report
    ├── zero-dummy-audit.md             # Non-Mock Implementation Audit
    └── zero-dummy-removal-report.md    # Zero Dummy Code Removal Summary
```

---

## 📑 Categories Breakdown

### 1. 🔌 API & Integrations ([`docs/api/`](./api/))
- [**API Specification**](./api/API.md) — Complete REST API contract, request/response schemas, and authentication headers.
- [**LinkedIn API Specification**](./api/linkedin-api.md) — LinkedIn API v202608 post creation and asset uploading protocol.
- [**X (Twitter) API Specification**](./api/x-api.md) — X API v2 Tweet posting, media upload, and rate limit handling.
- [**X Text Validation**](./api/x-text-validation.md) — Weighted character count rules (280 max, CJK, emoji, URL t.co shortener handling).

### 2. 🏛️ Architecture & Design ([`docs/architecture/`](./architecture/))
- [**Architecture Guide**](./architecture/ARCHITECTURE.md) — Monorepo design, layer separation, domain models, and service boundaries.
- [**Migration Guide**](./architecture/MIGRATION.md) — Phase-by-phase migration matrix from foundation repository to modular architecture.
- [**Provider Capability Matrix**](./architecture/provider-capability-matrix.md) — Comparative breakdown of capabilities across social platforms (Instagram, LinkedIn, X).
- [**Architecture Decision Records (ADRs)**](./architecture/decisions/) — ADR-004 (Vector Store), ADR-005 (Web Portal), ADR-006 (Scheduler).

### 3. 🛡️ Operations & Security ([`docs/operations/`](./operations/))
- [**Configuration Spec**](./operations/configuration.md) — Environment variables, default values, and production validation.
- [**Dependency Security**](./operations/dependency-security.md) — Dependency audit, runtime vulnerability check (0 runtime issues), and risk classification.
- [**Logging Policy**](./operations/logging-policy.md) — Winston structured logging, contextual IDs (`workspace_id`), and token redaction rules.
- [**Observability**](./operations/observability.md) — Metrics, health endpoints (`/health/liveness`, `/health/readiness`), and OpenTelemetry tracing.
- [**Rate Limits**](./operations/rate-limits.md) — Application rate limiting tiers per endpoint category.
- [**Secrets Management**](./operations/secrets.md) — AES-256-GCM token encryption at rest, key rotation, and secret scanning.
- [**Security Baseline**](./operations/security-baseline.md) — OWASP ASVS compliance matrix, CSRF nonces, and tenant isolation evidence.

### 4. 🚀 Production & Release ([`docs/production/`](./production/))
- [**Production Readiness Gate**](./production/production-readiness.md) — Verification gate criteria for production sign-off.
- [**Production Release Checklist**](./production/production-release-checklist.md) — Deployment runbook, pre-flight checks, and rollback procedures.
- [**Production Truthfulness Audit**](./production/production-truthfulness.md) — Independent verification confirming zero mock/placeholder usage in production code.

### 5. 🔍 Audits & Reports ([`docs/audits/`](./audits/))
- Historical phase audit reports detailing system evolution from Phase 1 through Phase 7.1, integration verification, and removal of dead code.
