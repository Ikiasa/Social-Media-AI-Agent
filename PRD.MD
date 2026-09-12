content = r"""# PRD — AI Social Media Agent

**Version:** 1.0  
**Status:** Ready for Development  
**Product Type:** Web-based AI Social Media Management Platform  
**Foundation:** `harshmriduhash/Social-Media-AI-Agent`  
**Initial Platform:** Instagram  
**Future Platforms:** LinkedIn, X, Facebook, TikTok  
**Primary Stack:** TypeScript / Node.js / Next.js

---

## 1. Product Overview

AI Social Media Agent adalah web portal yang menggunakan `harshmriduhash/Social-Media-AI-Agent` sebagai fondasi untuk membangun platform AI Social Media Management yang lebih terstruktur, scalable, dan production-ready.

Repository foundation menyediakan konsep dan implementasi awal untuk:

- AI-generated content
- Instagram automation
- posting
- liking
- commenting
- cookie/session persistence
- proxy support
- MongoDB
- training/context dari beberapa sumber

Versi produk ini mempertahankan dan mengembangkan kemampuan tersebut, tetapi memisahkan **AI Core**, **Social Platform**, **Knowledge**, **Web Portal**, **Scheduler**, **Worker**, **Approval**, dan **Analytics** agar dapat berkembang menjadi SaaS multi-user dan multi-platform.

### Product Vision

> Menjadikan AI sebagai Social Media Manager virtual yang memahami brand, membantu merencanakan strategi, menghasilkan konten, mengelola publishing, dan memberikan rekomendasi berdasarkan performa konten.

---

# 2. Problem Statement

Pengelolaan social media membutuhkan waktu dan konsistensi tinggi.

Pengguna menghadapi masalah:

1. Sulit membuat ide konten secara konsisten.
2. Content planning masih manual.
3. Caption dan konten yang dihasilkan AI sering generik.
4. AI tidak memahami brand secara mendalam.
5. Scheduling dan publishing membutuhkan banyak pekerjaan manual.
6. Analytics hanya memberikan angka tanpa rekomendasi strategis.
7. Pengguna sulit mengetahui jenis konten yang harus dibuat berikutnya.
8. Agency harus mengelola banyak brand dan akun secara terpisah.

Produk ini menyelesaikan masalah tersebut melalui workflow:

```text
Brand Knowledge
      +
Audience
      +
Business Goal
      +
Historical Content
      +
Analytics
      ↓
AI Agent
      ↓
Strategy
      ↓
Content Plan
      ↓
Content
      ↓
Human Approval
      ↓
Schedule
      ↓
Publish
      ↓
Analytics
      ↓
AI Insights
3. Product Goals
3.1 Primary Goals
G1 — Brand-aware AI

AI harus memahami:

identitas brand
produk/service
target audience
brand voice
content pillars
business goals
brand guidelines
G2 — Content Generation

AI dapat menghasilkan:

content ideas
hooks
captions
CTA
hashtags
content briefs
platform-specific variants
G3 — Content Planning

AI dapat membuat content plan berdasarkan:

business goals
target audience
content pillars
platform
frequency
historical performance
G4 — Human-in-the-loop

User tetap memiliki kontrol terhadap publishing.

Default MVP:

AI Generate
    ↓
Human Review
    ↓
Approve
    ↓
Schedule
    ↓
Publish
G5 — Multi-platform Architecture

Platform harus menggunakan adapter/interface sehingga penambahan platform baru tidak mengubah AI Core.

G6 — Analytics-driven AI

Performa konten harus dapat digunakan sebagai input untuk menghasilkan insight dan rekomendasi berikutnya.

4. Non-Goals — MVP

Fitur berikut tidak menjadi prioritas MVP:

fully autonomous publishing
mass liking
mass following
mass commenting
large-scale scraping
AI video generation
advanced image generation
influencer marketplace
advanced social listening
enterprise SSO
complex billing
multi-platform publishing penuh

Fitur existing seperti like/comment dapat tetap berada di Core Engine, tetapi tidak wajib diekspos melalui UI MVP.

5. Target Users
5.1 Individual Creator

Kebutuhan:

ide konten
caption
content calendar
scheduling
analytics
5.2 Small Business

Kebutuhan:

brand-aware content
Instagram management
content planning
analytics
AI recommendations
5.3 Personal Brand

Kebutuhan:

consistent tone
educational content
content planning
platform adaptation
5.4 Social Media Agency

Kebutuhan:

multiple workspaces
multiple brands
multiple social accounts
approval workflow
content calendar
analytics
6. Product Scope

Produk terdiri dari modul:

Web Portal
├── Dashboard
├── AI Assistant
├── Strategy
├── Content
├── Calendar
├── Knowledge Base
├── Social Accounts
├── Analytics
├── Brand
└── Settings

Backend
├── API
├── Agent Orchestrator
├── AI Provider
├── Knowledge/RAG
├── Content Service
├── Scheduler
├── Approval
└── Analytics

Infrastructure
├── Database
├── Vector Store
├── Queue
├── Worker
└── Object Storage

Platform
└── Instagram
7. Foundation Strategy

harshmriduhash/Social-Media-AI-Agent diperlakukan sebagai Foundation/Core Engine, bukan sebagai keseluruhan aplikasi final.

7.1 Existing Components

Konsep/implementasi yang akan dievaluasi dan dimanfaatkan:

AI integration
Instagram actions
Puppeteer
session/cookie handling
content generation
training/context
MongoDB
proxy support
existing utilities
existing schemas
7.2 Refactoring Principle

Jangan membuat Web Portal bergantung langsung pada implementation detail existing repository.

Target:

Web Portal
    ↓
Backend API
    ↓
Application Services
    ↓
Agent / Platform Interfaces
    ↓
Existing Core Implementation
8. Target Architecture
                         WEB PORTAL
                             │
                             ▼
                        BACKEND API
                             │
             ┌───────────────┼────────────────┐
             ▼               ▼                ▼
        AI Assistant      Content          Calendar
             │               │                │
             └───────────────┼────────────────┘
                             ▼
                    AGENT ORCHESTRATOR
                             │
             ┌───────────────┼────────────────┐
             ▼               ▼                ▼
       Strategy Agent   Content Agent   Analytics Agent
             │               │                │
             └───────────────┼────────────────┘
                             ▼
                           TOOLS
                             │
        ┌────────────────────┼────────────────────┐
        ▼                    ▼                    ▼
 Knowledge/RAG          Database              Scheduler
        │                                         │
        └────────────────────┬────────────────────┘
                             ▼
                           QUEUE
                             │
                             ▼
                           WORKER
                             │
                             ▼
                    SOCIAL PLATFORM
                             │
                             ▼
                         Instagram
                             │
                             ▼
                         Analytics
                             │
                             └──────────► AI Insights
9. Web Portal
9.1 Navigation
Dashboard
AI Assistant
Strategy
Content
Calendar
Knowledge Base
Social Accounts
Analytics
Brand
Settings
10. Dashboard

Dashboard menampilkan ringkasan:

total drafts
scheduled posts
published posts
engagement
recent activity
AI recommendations
upcoming content
Example
┌─────────────────────────────────────────┐
│ Dashboard                               │
├──────────┬──────────┬───────────────────┤
│ Drafts   │ Scheduled│ Published         │
│ 12       │ 5        │ 24                │
├──────────┴──────────┴───────────────────┤
│ AI Recommendations                      │
│                                         │
│ • Educational content is performing     │
│   better this week.                     │
│                                         │
│ • Tuesday is a strong posting day.      │
└─────────────────────────────────────────┘
11. AI Assistant

AI Assistant adalah interface natural-language utama.

User Examples

Buatkan 5 ide konten tentang AI Agent.

Buatkan content plan untuk minggu depan.

Ubah konten nomor 2 menjadi lebih casual.

Buat versi LinkedIn dari konten ini.

Kenapa engagement minggu ini turun?

Output

AI harus menghasilkan structured result bila melakukan action.

Contoh:

{
  "type": "content_draft",
  "title": "...",
  "hook": "...",
  "caption": "...",
  "cta": "...",
  "hashtags": []
}
12. Brand Management
12.1 Brand Information

Field:

brand name
description
industry
website
location
target audience
products
services
12.2 Brand Voice

Contoh:

Professional
Friendly
Educational
Technical
Casual
Humorous
12.3 Brand Restrictions
words to avoid
topics to avoid
claims restrictions
formatting rules
emoji preferences
brand guidelines

Brand data menjadi context utama AI.

13. Knowledge Base

Knowledge Base mengembangkan konsep training/context dari foundation menjadi sistem knowledge ingestion dan RAG.

Supported Sources
PDF
DOC
DOCX
TXT
Website
URL
Audio
YouTube
Manual text
Pipeline
Source
  ↓
Parser
  ↓
Text Extraction
  ↓
Chunking
  ↓
Embedding
  ↓
Vector Store
  ↓
Retriever
Retrieval
User Request
     ↓
Retriever
     ↓
Relevant Brand Knowledge
     ↓
AI Agent
Important

Upload dokumen tidak otomatis berarti model AI di-fine-tune.

Default architecture menggunakan RAG.

14. Content Management

Content object minimal memiliki:

id
workspace_id
brand_id
platform
title
content_type
content_pillar
hook
body
caption
cta
hashtags
media
status
created_by
created_at
updated_at
Content Types
educational
promotional
storytelling
engagement
announcement
product
case study
user-generated-content
15. Content Lifecycle
IDEA
  ↓
DRAFT
  ↓
REVIEW
  ↓
APPROVED
  ↓
SCHEDULED
  ↓
PUBLISHED
  ↓
ANALYZED

Additional states:

REJECTED
FAILED
ARCHIVED
16. Content Generation

AI dapat menghasilkan:

Content Idea
Topic
Angle
Hook
Audience
Content Pillar
Caption
Hook
Body
CTA
Hashtags
Platform Adaptation
One Content Idea
       │
       ├── Instagram
       ├── LinkedIn
       └── X

Setiap platform harus memiliki style adaptation tersendiri.

17. Content Editor

User dapat:

edit title
edit caption
edit CTA
edit hashtags
regenerate section
regenerate full content
duplicate
approve
reject
schedule
archive
18. Content Calendar

Calendar mendukung:

daily view
weekly view
monthly view

User dapat:

melihat scheduled content
memindahkan jadwal
membuka content editor
mengubah platform
mengubah status

AI dapat memberikan recommendation terhadap slot kosong.

19. Scheduling

Scheduling harus asynchronous.

Flow:

User
 ↓
Web Portal
 ↓
API
 ↓
Database
 ↓
Scheduler
 ↓
Queue
 ↓
Worker
 ↓
Platform Adapter
 ↓
Publish

Jangan membuat HTTP request menunggu sampai waktu publish.

20. Queue & Worker

Recommended:

Redis
+
BullMQ

Worker bertugas:

publish scheduled content
retry failed jobs
fetch analytics
process knowledge ingestion
execute long-running AI tasks

Job minimal:

PUBLISH_CONTENT
FETCH_ANALYTICS
INGEST_KNOWLEDGE
GENERATE_CONTENT
GENERATE_STRATEGY
21. Approval Workflow

Default MVP:

AI
 ↓
Generate
 ↓
Quality Check
 ↓
Review Required
 ↓
Human
 ├── Edit
 ├── Reject
 └── Approve
        ↓
     Schedule
        ↓
      Publish

Fully autonomous publishing tidak menjadi default MVP.

22. Social Platform Architecture

Gunakan adapter pattern.

interface SocialPlatform {
  authenticate(): Promise<void>;
  publishPost(input: PublishPostInput): Promise<PublishResult>;
  getProfile(): Promise<Profile>;
  getAnalytics(input: AnalyticsInput): Promise<AnalyticsResult>;
}

Implementation:

SocialPlatform
   │
   ├── InstagramAdapter
   ├── LinkedInAdapter
   └── XAdapter

Instagram menjadi implementation pertama.

23. Instagram Integration

Existing Instagram functionality dari foundation dipetakan ke adapter.

Target:

InstagramAdapter
├── authenticate()
├── restoreSession()
├── publishPost()
├── getProfile()
├── getAnalytics()
└── healthCheck()

Existing Puppeteer logic dapat digunakan sebagai implementation awal setelah audit dan refactoring.

Jika official API menyediakan kemampuan yang dibutuhkan, official API/OAuth harus diprioritaskan untuk production.

24. Session Management

Session/token/cookie harus:

encrypted at rest
tidak disimpan plaintext
tidak masuk Git
tidak ditampilkan di log
memiliki ownership berdasarkan workspace/account

Target:

Social Account
    ↓
Encrypted Credential/Token
    ↓
Session Manager
    ↓
Platform Adapter
25. AI Architecture

Gunakan abstraction:

interface AIProvider {
  generate(input: GenerateInput): Promise<GenerateOutput>;
}

Provider dapat berupa:

AIProvider
├── OpenAI
├── Gemini
└── Anthropic

AI provider tidak boleh tersebar di business logic.

26. Agent Architecture

Jangan membuat satu giant agent.

Gunakan:

Agent Orchestrator
       │
       ├── Strategy Agent
       ├── Content Agent
       └── Analytics Agent
Strategy Agent

Menentukan:

Apa yang harus dibuat?

Content Agent

Menentukan:

Bagaimana membuat konten?

Analytics Agent

Menentukan:

Apa yang berhasil dan apa yang perlu diperbaiki?

Orchestrator

Menentukan:

Agent/tool apa yang harus digunakan?

27. Agent Tools

Tools minimal:

get_brand()
search_knowledge()
get_recent_content()
get_analytics()
create_content()
update_content()
schedule_content()
publish_content()

AI tidak boleh mengakses database atau browser secara langsung.

Pattern:

LLM
 ↓
Tool
 ↓
Validated Service
 ↓
Database / Platform
28. Tool Permissions

Tools memiliki permission.

READ
WRITE
PUBLISH
ADMIN

Contoh:

Content Agent
├── READ knowledge
├── READ analytics
├── WRITE draft
└── NO publish

Publisher Worker:

PUBLISH permission
29. Agent Execution Logging

Setiap execution harus dicatat.

Field:

execution_id
workspace_id
agent
input
plan
tools_used
result
duration
status
error
created_at

Contoh:

User Request
     ↓
Planner
     ↓
get_brand
     ↓
search_knowledge
     ↓
get_analytics
     ↓
Generate Strategy
     ↓
Generate Content
     ↓
Return Result
30. Memory

Sistem memiliki tiga kategori memory.

Short-term Memory

Percakapan aktif.

Brand Memory
brand voice
audience
products
guidelines
Long-term Memory
previous content
user preferences
successful patterns
historical decisions
useful agent observations
31. Analytics

MVP metrics:

posts
likes
comments
shares
saves
reach
impressions
engagement rate

Analytics disimpan berdasarkan:

workspace
brand
social account
platform
content
publication
date
32. AI Analytics Agent

Flow:

Content
+
Performance
+
Audience
+
Timing
+
Platform
    ↓
Analytics Agent
    ↓
Pattern Detection
    ↓
Insight
    ↓
Recommendation

Example:

Educational content menghasilkan engagement lebih tinggi dibanding promotional content dalam periode terakhir.

AI kemudian memberikan rekomendasi strategy.

33. Feedback Loop

Target jangka panjang:

Brand
 ↓
Strategy
 ↓
Content
 ↓
Publish
 ↓
Performance
 ↓
Analytics
 ↓
AI Insights
 ↓
Updated Strategy
 ↓
Next Content

Produk harus berkembang dari content generator menjadi closed-loop AI system.

34. Database
Recommended

PostgreSQL + pgvector.

Core Entities
users
workspaces
brands
social_accounts
knowledge_documents
knowledge_chunks
content
content_variants
content_calendar
scheduled_posts
publications
analytics
agent_executions
agent_memory
conversations
Relationship
User
 │
 └── Workspace
       │
       ├── Brand
       ├── Social Accounts
       ├── Knowledge
       ├── Content
       ├── Calendar
       ├── Publications
       └── Analytics
35. Multi-tenancy

Semua business data harus memiliki workspace ownership.

Minimal:

workspace_id

harus tersedia pada seluruh resource tenant-scoped.

Rule:

Agent hanya boleh membaca knowledge, content, analytics, dan social accounts dari workspace yang sedang aktif.

Cross-workspace access harus ditolak pada application/service layer.

36. Recommended Tech Stack
Frontend
Next.js
TypeScript
Tailwind CSS
shadcn/ui
Backend
Node.js
TypeScript
REST API
Existing Core
harshmriduhash/Social-Media-AI-Agent
refactor existing AI/Instagram implementation
Database
PostgreSQL
pgvector
Queue
Redis
BullMQ
Storage
S3-compatible object storage
Browser Automation
Puppeteer hanya sebagai implementation layer bila dibutuhkan
37. Proposed Repository Structure
ai-social-media-agent/
│
├── apps/
│   └── web/
│       ├── app/
│       ├── components/
│       └── features/
│
├── services/
│   ├── api/
│   ├── agent/
│   └── worker/
│
├── packages/
│   ├── ai/
│   ├── core/
│   ├── database/
│   ├── knowledge/
│   ├── content/
│   └── scheduler/
│
├── platforms/
│   └── instagram/
│
├── legacy/
│   └── Social-Media-AI-Agent/
│
└── docs/
    ├── PRD.md
    ├── ARCHITECTURE.md
    └── MIGRATION.md
38. Migration Strategy
Phase 0 — Repository Audit

Audit source:

src/
├── Agent
├── client
├── config
├── schema
├── utils
└── test

Output:

File
 ↓
Function
 ↓
Dependency
 ↓
Purpose
 ↓
Keep / Refactor / Replace / Remove
Phase 1 — Existing System Validation

Test:

AI generation
Instagram authentication
posting
liking
commenting
cookie/session
database
training/context
Phase 2 — Core Extraction

Extract:

AI Core
Instagram Core
Session Manager
Knowledge
Database
Phase 3 — API Layer

Convert direct/CLI execution into API services.

Example:

POST /api/content/generate
POST /api/content/publish
POST /api/social/connect
POST /api/knowledge/upload
POST /api/schedule
Phase 4 — Web Portal

Implement:

Dashboard
Brand
Knowledge Base
AI Assistant
Content
Phase 5 — Scheduler & Worker

Implement:

Calendar
Queue
Scheduler
Worker
Retry
Phase 6 — Analytics

Implement:

analytics ingestion
dashboards
AI insights
Phase 7 — Multi-platform

Add additional platform adapters.

39. MVP Scope

MVP v0.1 harus memungkinkan user:

Register
Create Workspace
Create Brand
Connect Instagram
Add Knowledge
Chat with AI
Generate Content
Edit Content
Approve Content
Schedule Content
Publish Content
View basic analytics
40. MVP Acceptance Criteria
Authentication
User dapat register/login.
User dapat membuat workspace.
User hanya dapat mengakses workspace miliknya.
Brand
User dapat membuat brand profile.
AI menggunakan brand profile sebagai context.
Knowledge
User dapat upload dokumen.
Dokumen diproses asynchronous.
Knowledge dapat dicari oleh AI.
Knowledge antar workspace terisolasi.
AI
User dapat meminta content ideas.
User dapat meminta caption.
AI dapat menggunakan brand context.
AI dapat menggunakan retrieved knowledge.
Output content memiliki struktur yang dapat diproses aplikasi.
Content
User dapat membuat draft.
User dapat edit.
User dapat regenerate.
User dapat approve/reject.
Calendar
User dapat menjadwalkan content.
Scheduled content muncul di calendar.
Schedule dapat diubah.
Publishing
Approved content dapat masuk queue.
Worker menjalankan publish job.
Failed job memiliki status error.
Job dapat retry secara aman.
Analytics
Publication memiliki status.
Basic performance metrics dapat ditampilkan.
Analytics Agent dapat memberikan insight sederhana.
41. Security Requirements
Credentials

Tidak boleh menyimpan plaintext:

passwords
API keys
OAuth tokens
cookies
session credentials
Secrets

Gunakan environment variables/secret manager.

Logs

Jangan mencatat:

password
access token
cookies
sensitive session data
Authorization

Setiap request harus divalidasi berdasarkan:

user
 ↓
workspace
 ↓
resource
42. Reliability Requirements

Scheduled publishing harus memiliki:

idempotency
retry
timeout
failure state
logging
job history

Example:

PENDING
 ↓
PROCESSING
 ↓
SUCCESS

atau:

PROCESSING
 ↓
FAILED
 ↓
RETRY
 ↓
SUCCESS
43. Observability

Minimal logging:

timestamp
request_id
workspace_id
user_id
service
operation
status
duration
error

Agent execution juga memiliki execution ID.

Tujuan:

debugging
monitoring
audit
performance analysis
44. Compliance & Platform Safety

Produk harus memprioritaskan official platform APIs dan OAuth jika tersedia untuk kemampuan yang dibutuhkan.

Browser automation tidak boleh menjadi alasan untuk mengabaikan:

platform terms
rate limits
account safety
user consent
API policies

MVP sebaiknya menghindari aggressive automation seperti mass follow, mass like, mass comment, atau aktivitas yang dapat dianggap spam/abusive.

45. Success Metrics
Activation

Target:

≥60% user baru menyelesaikan Brand Setup.

Content Generation

Target:

≥70% activated users menghasilkan minimal 3 content pieces.

Approval Rate

Target:

≥40% AI-generated content di-approve.

Retention

Target:

≥30% user kembali dalam 7 hari.

Content Quality

Target:

≥4/5 average user rating.

46. Product Roadmap
Phase 1 — AI Content Assistant
AI
 ↓
Content
 ↓
Human
 ↓
Publish
Phase 2 — AI Content Copilot
AI
 ↓
Strategy
 ↓
Content
 ↓
Calendar
 ↓
Publish
Phase 3 — AI Social Media Manager
Brand
 ↓
Strategy
 ↓
Content
 ↓
Schedule
 ↓
Publish
 ↓
Analytics
 ↓
Recommendation
Phase 4 — Autonomous AI Agent
Business Goal
 ↓
Research
 ↓
Strategy
 ↓
Content
 ↓
Approval Policy
 ↓
Publish
 ↓
Observe
 ↓
Analytics
 ↓
Learn
 ↓
Next Strategy
47. Architecture Principles

Produk harus mengikuti prinsip berikut:

Existing repository adalah foundation, bukan final architecture.
AI tidak memegang business logic utama.
LLM menghasilkan structured output untuk action.
AI berinteraksi dengan sistem melalui tools terkontrol.
Human approval adalah default untuk action berisiko.
Social platform menggunakan adapter pattern.
Knowledge terisolasi per workspace.
Credentials dan session data harus secured.
Long-running tasks dijalankan melalui worker/queue.
Analytics menjadi feedback loop untuk AI.
Official platform APIs diprioritaskan jika tersedia.
Existing implementation dipertahankan hanya jika memenuhi kebutuhan dan dapat diisolasi dengan baik.
48. Definition of Done — MVP

MVP dinyatakan selesai apabila:

 Authentication bekerja
 Workspace bekerja
 Brand profile bekerja
 Existing AI functionality berhasil diintegrasikan
 Knowledge ingestion bekerja
 RAG retrieval bekerja
 AI Assistant bekerja
 Content generation bekerja
 Content CRUD bekerja
 Approval workflow bekerja
 Calendar bekerja
 Scheduler bekerja
 Queue/worker bekerja
 Instagram integration bekerja
 Basic analytics bekerja
 Workspace isolation diuji
 Secrets tidak tersimpan plaintext
 Agent execution logging tersedia
 Failed jobs memiliki retry/failure handling
 Existing foundation code memiliki migration documentation
49. First Development Milestone

Development pertama bukan membuat dashboard.

Urutan:

1. Clone / obtain foundation repository
          ↓
2. Run existing project
          ↓
3. Audit source code
          ↓
4. Map dependencies
          ↓
5. Test existing functionality
          ↓
6. Identify reusable modules
          ↓
7. Define migration boundaries
          ↓
8. Extract Core
          ↓
9. Build API
          ↓
10. Build Web Portal

Output pertama yang wajib dibuat:

docs/
├── PRD.md
├── ARCHITECTURE.md
└── MIGRATION.md
50. Final Product Definition

AI Social Media Agent bukan sekadar:

Prompt → Caption

Target final:

                    BUSINESS GOAL
                         ↓
                       BRAND
                         ↓
                  KNOWLEDGE BASE
                         ↓
                   AI ORCHESTRATOR
                         ↓
                    STRATEGY
                         ↓
                     CONTENT
                         ↓
                  HUMAN APPROVAL
                         ↓
                    SCHEDULER
                         ↓
                      QUEUE
                         ↓
                      WORKER
                         ↓
                 SOCIAL PLATFORM
                         ↓
                    PERFORMANCE
                         ↓
                  ANALYTICS AGENT
                         ↓
                     INSIGHTS
                         ↓
                  UPDATED STRATEGY
                         ↺

Fondasi harshmriduhash/Social-Media-AI-Agent menjadi starting point untuk AI dan Instagram automation, sedangkan layer baru menjadikannya platform web yang modular, observable, multi-tenant, dan siap dikembangkan menjadi SaaS.