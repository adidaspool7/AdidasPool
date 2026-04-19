# System Architecture

## Talent Intelligence & Language Verification Platform

> **Last updated:** 2026-03-10 — reflects all features through internship enhancements, Groq LLM integration, and CV parser pipeline.

---

## Architecture Pattern: Onion Architecture

This project follows the **Onion Architecture** (also known as Clean Architecture / Ports & Adapters), which enforces a strict **separation of concerns** through layered boundaries where dependencies always point **inward**.

```
┌──────────────────────────────────────────────────────────────────┐
│                    PRESENTATION LAYER                            │
│         Next.js App Router (Pages, API Routes, UI)               │
│                                                                  │
│  ┌────────────────────────────────────────────────────────────┐  │
│  │                  APPLICATION LAYER                         │  │
│  │            Use Cases, DTOs, Orchestration                  │  │
│  │                                                            │  │
│  │  ┌──────────────────────────────────────────────────────┐  │  │
│  │  │                  DOMAIN LAYER                        │  │  │
│  │  │     Value Objects, Domain Services, Ports            │  │  │
│  │  │              (ZERO external deps)                    │  │  │
│  │  └──────────────────────────────────────────────────────┘  │  │
│  │                                                            │  │
│  └────────────────────────────────────────────────────────────┘  │
│                                                                  │
│  ┌────────────────────────────────────────────────────────────┐  │
│  │               INFRASTRUCTURE LAYER                         │  │
│  │    Database Repos, AI Services, Email (implements ports)   │  │
│  └────────────────────────────────────────────────────────────┘  │
│                                                                  │
└──────────────────────────────────────────────────────────────────┘
```

### Dependency Rule

> **Dependencies flow inward.** The Domain layer has zero external dependencies. The Application layer depends only on Domain. Infrastructure implements Domain ports. The Presentation layer delegates to the Application layer.

```
Presentation → Application → Domain ← Infrastructure
(API routes)   (use cases)   (ports)   (implements ports)
```

---

## Layer Breakdown

### 1. Domain Layer (`src/server/domain/`)

The **innermost layer** — contains pure business logic with absolutely **no external dependencies** (no database, no HTTP, no frameworks).

| File | Purpose |
|------|---------|
| `value-objects.ts` | Business constants: CEFR levels, CV scoring weights, education level scores, assessment weights, borderline thresholds, file limits, pagination defaults |
| `services/scoring.service.ts` | Pure CV scoring engine: `calculateCvScore()`, `calculateAssessmentScore()`, `estimateCefrLevel()`, `isBorderline()` |
| `services/matching.service.ts` | Pure job-candidate matching: `matchCandidateToJob()` with location, language, experience, and education criteria |
| `ports/repositories.ts` | Repository interfaces: `ICandidateRepository`, `IJobRepository`, `IAssessmentRepository`, `IDeduplicationRepository`, `IJobApplicationRepository`, `INotificationRepository` |
| `ports/services.ts` | External service interfaces: `ICvParserService`, `IEmailService`, `IStorageService`, `ITextExtractionService`, `IJobScraperService` |

**Key principle:** Domain services import ONLY from `@server/domain/*`. They are fully unit-testable without mocks.

### 2. Application Layer (`src/server/application/`)

Contains **use cases** (business operations) and **DTOs** (data validation schemas). Orchestrates domain services and repository calls.

| File | Purpose |
|------|---------|
| `dtos.ts` | Zod 4 validation schemas: `CvExtractionSchema`, `CreateJobSchema` (with internship fields), `UpdateJobSchema`, `CandidateFilterSchema`, `CreateAssessmentSchema`, `AssessmentScoringSchema`, `UpdateCandidateSchema` (with `.strict()`) |
| `index.ts` | Use case factory — creates pre-wired instances with injected dependencies. Re-exports `NotFoundError` and `ValidationError` for API routes. |
| `use-cases/candidate.use-cases.ts` | `listCandidates`, `getCandidateById`, `updateCandidate`, `addNote` |
| `use-cases/job.use-cases.ts` | `listJobs` (with `type`, `excludeType`, `internshipStatus` filters, multi-word search), `getJobById`, `createJob`, `updateJob`, `matchCandidatesToJob` (orchestrates matching service + repository persistence), `syncJobs` (scraper integration) |
| `use-cases/assessment.use-cases.ts` | `listAssessments`, `createAssessment` (magic link generation + candidate status update) |
| `use-cases/upload.use-cases.ts` | `processCandidateCv` (synchronous CV pipeline: validate → store → extract text → parse via LLM → validate → dedup → upsert candidate + relations → score), `processMotivationLetter` (file upload + link to candidate) |
| `use-cases/export.use-cases.ts` | `exportCandidatesCsv` (CSV generation via papaparse) |
| `use-cases/application.use-cases.ts` | `applyToJob`, `withdrawApplication`, `listByCandidateId`, `listAll` — candidate job application workflow with automatic HR notifications |
| `use-cases/notification.use-cases.ts` | `listAll`, `listUnread`, `create`, `markAsRead`, `markAllAsRead` — HR notification feed |

**Key principle:** Use cases receive repository/service interfaces via constructor injection. They never import infrastructure directly.

### 3. Infrastructure Layer (`src/server/infrastructure/`)

Implements domain ports using concrete technologies. This is the **only layer** that knows about PostgreSQL, OpenAI, Resend, etc.

| File | Purpose |
|------|---------|
| `database/prisma-client.ts` | Prisma singleton (lazy-loaded to avoid build-time errors) |
| `database/candidate.repository.ts` | `PrismaCandidateRepository` — implements `ICandidateRepository` with query building, pagination, includes, `createWithRelations`, `replaceRelatedRecords` |
| `database/job.repository.ts` | `PrismaJobRepository` — implements `IJobRepository` with match count aggregation, `type`/`excludeType`/`internshipStatus` filtering, multi-word AND-of-ORs search |
| `database/assessment.repository.ts` | `PrismaAssessmentRepository` — implements `IAssessmentRepository` with relation loading |
| `database/dedup.repository.ts` | `PrismaDeduplicationRepository` — implements `IDeduplicationRepository` with email/name matching |
| `database/application.repository.ts` | `PrismaJobApplicationRepository` — implements `IJobApplicationRepository` with candidate + job includes |
| `database/notification.repository.ts` | `PrismaNotificationRepository` — implements `INotificationRepository` with read/unread management |
| `ai/openai-client.ts` | LLM client singleton (lazy-loaded). Auto-detects provider: **Groq** (Llama 3.3 70B via OpenAI SDK + custom `baseURL`) if `GROQ_API_KEY` is set; falls back to **OpenAI GPT-4o** otherwise |
| `ai/cv-parser.service.ts` | `OpenAiCvParserService` — implements `ICvParserService` using the active LLM with JSON mode + Zod validation |
| `extraction/text-extraction.service.ts` | `TextExtractionService` — implements `ITextExtractionService` using `unpdf` for PDFs and `mammoth` for DOCX |
| `storage/local-storage.service.ts` | `LocalStorageService` — implements `IStorageService`, writes files to `public/uploads/` (default when `BLOB_READ_WRITE_TOKEN` is absent) |
| `storage/vercel-blob-storage.service.ts` | `VercelBlobStorageService` — implements `IStorageService` using Vercel Blob (production storage) |
| `email/resend.service.ts` | `ResendEmailService` — implements `IEmailService` using Resend |
| `scraping/adidas-job-scraper.service.ts` | `AdidasJobScraperService` — implements `IJobScraperService` using Cheerio to scrape all pages from adidas careers portal |

**Key principle:** All infrastructure classes implement domain port interfaces. Swapping Groq for another LLM, or LocalStorage for S3, requires changes ONLY in this layer.

### 4. Presentation Layer (`src/app/` + `src/client/components/`)

Next.js App Router pages and API routes. API routes are **thin controllers** that only handle:
- HTTP request parsing
- Input validation
- Delegating to use cases
- HTTP response formatting

| Directory | Purpose |
|-----------|---------|
| `app/api/candidates/` | REST endpoints for candidate CRUD |
| `app/api/jobs/` | REST endpoints for job management + matching (`GET/POST /api/jobs`, `GET/PATCH /api/jobs/[id]`) |
| `app/api/jobs/sync/` | Job scraper trigger endpoint |
| `app/api/jobs/[id]/match/` | Run matching engine for a specific job |
| `app/api/assessments/` | REST endpoints for assessment lifecycle |
| `app/api/upload/` | HR CV upload endpoint |
| `app/api/upload/candidate/` | Candidate self-upload (synchronous parse + preview) |
| `app/api/upload/motivation-letter/` | Motivation letter upload for candidates |
| `app/api/upload/learning-agreement/` | Erasmus learning agreement upload (per application) |
| `app/api/export/` | CSV export endpoint |
| `app/api/applications/` | Candidate job application endpoints (apply, withdraw, list) |
| `app/api/applications/all/` | HR endpoint — all received applications |
| `app/api/notifications/` | HR notification endpoints (list, mark read) |
| `app/api/me/` | Demo candidate auto-creation + profile update endpoint |
| `app/dashboard/` | Dashboard pages (role-aware: HR vs Candidate) |
| `app/dashboard/jobs/` | Job openings with create dialog, apply overlay, search, filters |
| `app/dashboard/internships/` | Internship management — create/edit (HR), apply + learning agreement upload (candidate), Erasmus badge, status filtering |
| `app/dashboard/upload/` | CV upload with drag-and-drop, parsed data preview, inline editing, save |
| `app/dashboard/settings/` | Profile settings (personal info, nationality combobox, availability, work model) |
| `app/dashboard/applications/` | Candidate "My Applications" page |
| `app/dashboard/received-applications/` | HR "Received Applications" page with search |
| `app/dashboard/notifications/` | HR notification feed with read/unread management |
| `app/dashboard/assessments/` | Assessment configuration and tracking |
| `app/dashboard/candidates/` | Candidate list (placeholder) |
| `app/dashboard/analytics/` | Analytics dashboard (placeholder) |
| `app/dashboard/improvement/` | Improvement tracks (placeholder) |
| `app/assess/[token]/` | Public assessment portal (magic link access) |
| `client/components/ui/` | shadcn/ui components (20+) |
| `client/components/layout/` | Layout components (role-based sidebar) |
| `client/components/providers/` | RoleProvider (candidate/hr), Providers wrapper |

### 5. Composition Root (`src/server/container.ts` + `src/server/application/index.ts`)

The **outermost wiring layer** where infrastructure implementations are bound to domain ports:

- `server/container.ts` — Instantiates all repositories and services with concrete implementations
- `server/application/index.ts` — Creates use case instances with injected dependencies

This is the **only place** in the codebase where infrastructure implementations are directly referenced. All other layers depend on abstractions.

### 6. Shared Utilities (`src/client/lib/utils.ts`)

Cross-cutting presentation utilities (`cn()` for Tailwind class merging, `formatDate()`, `formatDateTime()`, `truncate()`, `sleep()`). These are UI helpers used by components — not business logic.

---

## Directory Structure

```
src/
├── server/                                  # BACKEND (all server-side code)
│   ├── domain/                              #   Layer 1: Domain (innermost)
│   │   ├── value-objects.ts                 #     Business constants & configuration
│   │   ├── services/
│   │   │   ├── scoring.service.ts           #     CV scoring engine (pure logic)
│   │   │   └── matching.service.ts          #     Job-candidate matching (pure logic)
│   │   └── ports/
│   │       ├── repositories.ts              #     6 repository interfaces (contracts)
│   │       └── services.ts                  #     5 external service interfaces
│   │
│   ├── application/                         #   Layer 2: Application
│   │   ├── dtos.ts                          #     Zod 4 validation schemas
│   │   ├── index.ts                         #     Use case factory (composition)
│   │   └── use-cases/
│   │       ├── candidate.use-cases.ts       #     Candidate operations
│   │       ├── job.use-cases.ts             #     Job + internship CRUD, matching, scraping
│   │       ├── assessment.use-cases.ts      #     Assessment lifecycle
│   │       ├── upload.use-cases.ts          #     CV upload pipeline (extract → parse → validate → store)
│   │       ├── export.use-cases.ts          #     CSV export
│   │       ├── application.use-cases.ts     #     Job application workflow + notifications
│   │       └── notification.use-cases.ts    #     HR notification feed
│   │
│   ├── infrastructure/                      #   Layer 3: Infrastructure
│   │   ├── database/
│   │   │   ├── prisma-client.ts             #     Prisma ORM singleton
│   │   │   ├── candidate.repository.ts      #     ICandidateRepository impl
│   │   │   ├── job.repository.ts            #     IJobRepository impl (multi-word search, type/status filters)
│   │   │   ├── assessment.repository.ts     #     IAssessmentRepository impl
│   │   │   ├── dedup.repository.ts          #     IDeduplicationRepository impl
│   │   │   ├── application.repository.ts    #     IJobApplicationRepository impl
│   │   │   └── notification.repository.ts   #     INotificationRepository impl
│   │   ├── ai/
│   │   │   ├── openai-client.ts             #     LLM client: Groq (primary) / OpenAI (fallback)
│   │   │   └── cv-parser.service.ts         #     ICvParserService impl (LLM + JSON mode + Zod)
│   │   ├── extraction/
│   │   │   └── text-extraction.service.ts   #     ITextExtractionService impl (unpdf + mammoth)
│   │   ├── storage/
│   │   │   ├── local-storage.service.ts     #     IStorageService impl (public/uploads/ — dev default)
│   │   │   └── vercel-blob-storage.service.ts #   IStorageService impl (Vercel Blob — production)
│   │   ├── email/
│   │   │   └── resend.service.ts            #     IEmailService impl
│   │   └── scraping/
│   │       └── adidas-job-scraper.service.ts #    IJobScraperService impl (Cheerio)
│   │
│   └── container.ts                         #   Composition Root (11 DI bindings)
│
├── client/                                  # FRONTEND (all client-side code)
│   ├── components/
│   │   ├── ui/                              #   shadcn/ui primitives (20+ components)
│   │   ├── layout/
│   │   │   └── sidebar.tsx                  #   Role-based sidebar (candidate: 8 items, HR: 9 items)
│   │   └── providers/
│   │       ├── role-provider.tsx             #   Role context (candidate/hr) with localStorage
│   │       └── providers.tsx                #   Root providers wrapper
│   └── lib/
│       └── utils.ts                         #   cn(), formatDate(), truncate()
│
└── app/                                     # NEXT.JS ROUTING (glue layer)
    ├── layout.tsx                           #   Root layout
    ├── page.tsx                             #   Landing page
    ├── assess/[token]/page.tsx              #   Public assessment portal (magic link)
    ├── dashboard/
    │   ├── layout.tsx                       #   Dashboard shell (sidebar)
    │   ├── page.tsx                         #   Dashboard home (role-aware: HR stats / Candidate quick upload)
    │   ├── jobs/page.tsx                    #   Job openings (scraper + create + apply + filters)
    │   ├── internships/page.tsx             #   Internships (create/edit/apply + Erasmus + learning agreement)
    │   ├── upload/page.tsx                  #   CV Upload (drag-and-drop + parsed preview + inline edit)
    │   ├── settings/page.tsx                #   Profile settings (personal info, nationality, bio)
    │   ├── applications/page.tsx            #   Candidate "My Applications"
    │   ├── received-applications/page.tsx   #   HR "Received Applications"
    │   ├── notifications/page.tsx           #   HR notification feed
    │   ├── assessments/page.tsx             #   Assessment management
    │   ├── candidates/page.tsx              #   Candidate list (placeholder)
    │   ├── candidates/[id]/page.tsx         #   Candidate detail (placeholder)
    │   ├── analytics/page.tsx               #   Analytics (placeholder)
    │   └── improvement/page.tsx             #   Improvement tracks (placeholder)
    └── api/                                 #   REST API (18 route files, ~25 HTTP handlers)
        ├── me/route.ts                      #     GET/PATCH — demo candidate + profile updates
        ├── candidates/route.ts              #     GET — candidate list with filters
        ├── candidates/[id]/route.ts         #     GET/PATCH — candidate detail + update
        ├── candidates/[id]/notes/route.ts   #     POST — add collaborative note
        ├── jobs/route.ts                    #     GET/POST — job list + create
        ├── jobs/[id]/route.ts               #     GET/PATCH — job detail + update (internship fields)
        ├── jobs/[id]/match/route.ts         #     POST — run matching engine
        ├── jobs/sync/route.ts               #     POST — trigger job scraper
        ├── applications/route.ts            #     POST/GET — apply + list by candidate
        ├── applications/[id]/route.ts       #     PATCH — withdraw application
        ├── applications/all/route.ts        #     GET — HR: all received applications
        ├── assessments/route.ts             #     GET/POST — assessment lifecycle
        ├── notifications/route.ts           #     GET/PATCH — notification feed + mark read
        ├── upload/route.ts                  #     POST — HR CV upload
        ├── upload/candidate/route.ts        #     POST — candidate self-upload (sync parse)
        ├── upload/motivation-letter/route.ts #    POST — motivation letter upload
        ├── upload/learning-agreement/route.ts #   POST — Erasmus learning agreement upload
        └── export/candidates/route.ts       #     GET — CSV export
```

### Path Aliases
### Path Aliases

| Alias | Resolves To | Used By |
|-------|-------------|----------|
| `@server/*` | `src/server/*` | API routes, tests — all backend imports |
| `@client/*` | `src/client/*` | Pages, layouts — all frontend imports |
| `@/*` | `src/*` | General (e.g., `@/app/*` for Next.js internals) |

---

## Technology Stack

### Core Framework

| Technology | Version | Purpose |
|------------|---------|---------|
| **Next.js** | 16.1.6 | Full-stack React framework (App Router, API routes, SSR/SSG) |
| **React** | 19.2.3 | UI library |
| **TypeScript** | 5.x | Type safety across all layers |

### Database & ORM

| Technology | Version | Purpose |
|------------|---------|---------|
| **PostgreSQL** | 16+ | Primary relational database (local dev: PostgreSQL, production: Neon Serverless via Vercel) |
| **Prisma** | 6.19.2 | ORM with type-safe queries, migrations, schema management |

**Database Schema:** 16 models, 14 enums — covers candidates, experiences, education, languages, skills, jobs (with `JobType` enum: FULL_TIME/PART_TIME/INTERNSHIP/CONTRACT), internships (with `InternshipStatus` enum: DRAFT/ACTIVE/INACTIVE/FINISHED), Erasmus support, job applications (with learning agreement upload), matches, assessments, improvement tracks, notifications, and parsing jobs.

### AI & Language Processing

| Technology | Version | Purpose |
|------------|---------|---------|
| **Groq (Llama 3.3 70B)** | via OpenAI SDK 6.22.0 | **Primary LLM** — structured CV extraction (JSON mode), free tier |
| **OpenAI GPT-4o** | via OpenAI SDK 6.22.0 | **Fallback LLM** — used when Groq is unavailable |
| **OpenAI Whisper API** | — | Speech-to-text for language assessments (planned) |
| **Zod** | 4.3.6 | Runtime validation of AI outputs + API request bodies |

### CV Processing

| Technology | Version | Purpose |
|------------|---------|---------|
| **unpdf** | 1.4.0 | PDF text extraction |
| **mammoth** | 1.11.0 | DOCX text extraction |

### UI & Styling

| Technology | Version | Purpose |
|------------|---------|---------|
| **shadcn/ui** | Latest | 20+ pre-built accessible UI components |
| **Tailwind CSS** | 4.x | Utility-first CSS framework |
| **Lucide React** | Latest | Icon library |

### Email & Communication

| Technology | Version | Purpose |
|------------|---------|---------|
| **Resend** | 6.9.2 | Transactional email (magic links for assessments) |

### File Storage

| Technology | Version | Purpose |
|------------|---------|---------|
| **LocalStorageService** | Custom | Dev default — writes to `public/uploads/` |
| **Vercel Blob** | 2.3.1 | Production — S3-compatible cloud storage |

---

## Data Flow Examples

### CV Upload & Parsing Flow (Candidate Self-Upload)

```
Candidate uploads CV file (PDF/DOCX)
    │
    ▼
[API Route: POST /api/upload/candidate]    ← Presentation
    │
    ▼
[UploadUseCases.processCandidateCv()]      ← Application
    │
    ├─► IStorageService.uploadFile()       ← Domain port
    │       └─► LocalStorageService        ← Infrastructure (dev)
    │       └─► VercelBlobStorageService   ← Infrastructure (prod)
    │
    ├─► ITextExtractionService.extractText() ← Domain port
    │       └─► unpdf (PDF) / mammoth (DOCX) ← Infrastructure
    │
    ├─► ICvParserService.parseCvText()     ← Domain port
    │       └─► Groq Llama 3.3 70B        ← Infrastructure (primary)
    │       └─► OpenAI GPT-4o             ← Infrastructure (fallback)
    │
    ├─► Zod CvExtractionSchema validation
    │
    ├─► IDeduplicationRepository           ← Domain port
    │       └─► Prisma (email/name match)  ← Infrastructure
    │
    ├─► ICandidateRepository.createWithRelations() 
    │       └─► Upsert candidate + experiences + education + languages + skills
    │
    └─► ScoringService.calculateCvScore()  ← Domain (pure)
```

### Job-Candidate Matching Flow

```
Recruiter clicks "Run Matching"
    │
    ▼
[API Route: POST /api/jobs/[id]/match] ← Presentation
    │
    ▼
[JobUseCases.matchCandidatesToJob()]    ← Application
    │
    ├─► IJobRepository.findById()       ← Domain port → Prisma
    ├─► ICandidateRepository.findForMatching() ← Domain port → Prisma
    │
    ├─► MatchingService.matchCandidateToJob()  ← Domain (pure logic)
    │       ├── Location matching
    │       ├── Language + CEFR comparison
    │       ├── Experience years check
    │       └── Education level scoring
    │
    └─► IJobRepository.upsertMatch()    ← Domain port → Prisma
```

### Assessment Lifecycle Flow

```
Recruiter creates assessment
    │
    ▼
[API Route: POST /api/assessments]      ← Presentation
    │
    ▼
[AssessmentUseCases.createAssessment()]  ← Application
    │
    ├─► Generate magic token (crypto)
    ├─► IAssessmentRepository.create()   ← Domain port → Prisma
    ├─► IEmailService.sendMagicLink()    ← Domain port → Resend
    └─► updateCandidateStatus("ASSESSMENT_PENDING")
            │
            ▼
    Candidate receives email with magic link
            │
            ▼
    [Page: /assess/[token]]              ← Presentation
            │
            ▼
    Language assessment + Whisper STT     ← Infrastructure
            │
            ▼
    ScoringService.calculateAssessmentScore() ← Domain (pure)
```

---

## Key Architectural Decisions

| Decision | Rationale |
|----------|-----------|
| **Onion Architecture over MVC** | Enforces clear boundaries between business logic and external dependencies. Makes the domain testable without databases or APIs. |
| **Repository Pattern** | Abstracts data access behind interfaces. Enables swapping PostgreSQL for any other store without touching business logic. |
| **Constructor Injection** | Use cases receive dependencies via constructor, following Dependency Inversion Principle. The composition root wires implementations. |
| **Lazy-loaded External Clients** | OpenAI and Resend clients are instantiated on first use, not at module load. Prevents build-time crashes when API keys aren't available. |
| **Thin API Route Controllers** | API routes contain no business logic — only HTTP parsing, validation, delegation, and response formatting. Max ~20 lines per handler. |
| **Prisma Types as Entities** | Rather than duplicating Prisma models as domain interfaces (which adds overhead with little benefit), we use Prisma-generated types. The separation is enforced at the import level — domain services never import Prisma. |
| **Single DTOs file** | Zod schemas are collocated in one file for discoverability. In a larger project, these would be split per aggregate. |
| **Use Case Classes** | Each aggregate has a use case class (e.g., `CandidateUseCases`) with methods for each operation. Balances granularity with manageability. |

---

## Testing Strategy

| Layer | Test Type | Tools | What's Tested | Status |
|-------|-----------|-------|---------------|--------|
| Domain | Unit tests | Vitest 4.0.18 | Scoring engine (10 tests), matching algorithm (4 tests) — pure functions, no mocks needed | ✅ Active |
| Application | Unit tests (mocked) | Vitest 4.0.18 | Upload use cases orchestration (12 tests), CV validation (17 tests) | ✅ Active |
| Infrastructure | Unit tests | Vitest 4.0.18 | Text extraction (10 tests), storage service (3 tests) | ✅ Active |
| Presentation | E2E tests | Playwright | Full user flows through the browser | 🔜 Planned |

**Total: 56 test cases across 6 test files.**
