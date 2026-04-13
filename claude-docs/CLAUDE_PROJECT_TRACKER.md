# Claude AI - Project Tracker & Orientation Guide
> **Project:** Talent Intelligence & Communication Verification Platform  
> **Context:** Academic project for a multinational (adidas-like context)  
> **Timeline:** ~4 months  
> **Tech Stack:** Next.js (confirmed by user)  
> **Primary Spec:** `docs/talent_intelligence_language_verification_platform_spec.md`  
| **Repo:** `github_repo/` (scaffolded S4 → Onion Architecture S5 → server/client split S6 → audit & fixes S7 → role nav S8 → job apps & scraper S9 → HR notifications S10 — deployed to Vercel ✅)

---

## 1. Spec Analysis Summary

### What the project IS
A standalone web app for early-stage recruitment screening that:
- Ingests and parses bulk CVs into structured data
- Builds a searchable, persistent talent pool
- Matches candidates to job openings (location, experience, language)
- Verifies language/communication ability via AI-scored assessments (listening, speaking, writing)
- Identifies borderline candidates and routes them to micro-learning improvement tracks
- Optional: internal mobility matching

### What the project is NOT
- Not a full ATS/HRIS replacement
- No interview scheduling, payroll, or performance management
- No real-time AI voice conversations
- No automatic rejection without human review

### Architecture Snapshot
```
Frontend (Next.js + shadcn/ui + Tailwind)
  ├── HR Dashboard (main interface)
  ├── Candidate Assessment Portal (magic link, no login)
  ├── Analytics Dashboard
  └── Admin Panel

Backend (Next.js API Routes)
  ├── CV Ingestion (bulk upload, async)
  ├── Parsing & Classification (LLM-based extraction)
  ├── Language Assessment (STT + rubric scoring)
  ├── Matching Engine
  ├── Deduplication Engine
  ├── Improvement Track Manager
  └── Export Service (CSV/PDF)

Database (PostgreSQL + Prisma)
  └── Candidates, Experiences, Education, Languages, Skills, Jobs, 
      Assessments, Results, Tracks, Notes, AssessmentTemplates

AI Layer
  ├── LLM for CV extraction (schema-enforced JSON)
  ├── Experience relevance classification
  ├── Speech-to-text + rubric evaluation
  ├── Feedback generation
  └── Bias detection analytics
```

---

## 2. Feature Decisions (User Confirmed — Session 2)

### CONFIRMED — Will Implement
| Feature | Priority | Notes |
|---------|----------|-------|
| **Candidate Assessment Portal** | Must | Magic link pattern, no login, tokenized time-limited URLs |
| **Recruitment Analytics Dashboard** | Must | Funnels, score distributions, time metrics |
| **Contact Info Quick View** | Must | Small button on candidate list to view contacts (simple) |
| **Collaborative Notes** | Nice | Recruiters can edit data manually + add timestamped notes |
| **Assessment Config Templates** | Nice | Reusable templates per role/language combo |
| **CSV/PDF Export** | Nice | Export filtered candidate lists, assessment results, profiles |
| **Bias Detection Module** | Stretch | Statistical fairness analysis (see implementation plan below) |
| **Testing Strategy** | Must | Defined below in Section 3 |

### DEFERRED — Not for MVP
| Feature | Reason |
|---------|--------|
| Auth + RBAC | Internal-only tool, prototype/MVP — revisit later if needed |
| Audit Trail | Internal use only, not critical for MVP |
| PWA Support | Not a priority |

---

## 3. Testing Strategy

### Philosophy
Test the **critical paths** that would break the demo, not everything. Focus testing effort where bugs would be most embarrassing or costly.

### Testing Layers

#### Layer 1: Unit Tests (Vitest)
**What to test:**
- CV parsing logic — does the LLM output get correctly mapped to DB schema?
- Scoring formula — given known inputs, does it produce expected scores?
- Matching engine — does candidate X match job Y correctly?
- Deduplication — are duplicate candidates detected?
- CEFR estimation logic — given sub-scores, is the level correct?
- Borderline detection — threshold logic

**Tool:** Vitest (native ESM, fast, Jest-compatible API, works great with Next.js)

```
Tests per module:
├── cv-parser.test.ts          # Structured extraction mapping
├── scoring-engine.test.ts     # Deterministic score calculations
├── matching-engine.test.ts    # Job-candidate matching
├── dedup.test.ts              # Deduplication logic
├── cefr-estimator.test.ts     # Language level estimation
├── borderline.test.ts         # Threshold detection
└── bias-detection.test.ts     # Statistical fairness checks
```

#### Layer 2: API/Integration Tests (Vitest + supertest or Next.js test utils)
**What to test:**
- CV upload endpoint accepts files, returns job ID
- Parsing pipeline processes and stores correctly
- Assessment creation and retrieval
- Magic link generation and validation
- Export endpoints return correct format
- Filtering API returns expected results

**Approach:** Test API routes against a test database (use Docker PostgreSQL or SQLite for test env).

#### Layer 3: E2E Tests (Playwright)
**What to test — critical user flows only:**
1. HR uploads CVs → sees them parsed in candidate list
2. HR creates job opening → runs matching → sees ranked candidates
3. HR invites candidate → candidate opens magic link → completes assessment
4. HR views assessment results → filters → exports CSV
5. Analytics dashboard loads with correct data

**Scope:** 5-8 E2E tests covering the demo-critical flows. Not exhaustive.

#### Layer 4: AI Output Validation (Custom)
**Problem:** LLM outputs are non-deterministic. Can't assert exact values.
**Approach:**
- **Schema validation:** Every LLM response must pass Zod schema validation (structured output)
- **Sanity checks:** Extracted years of experience is a number > 0, email is valid format, etc.
- **Snapshot-style smoke tests:** Run extraction on 5 known CVs, verify key fields are "close enough"
- **Rubric scoring bounds:** Assessment scores always between 0-100, sub-scores add up correctly

#### When to Write Tests
- **Month 1:** Unit tests for parsing + scoring as they're built
- **Month 2:** API tests for CRUD + matching, first E2E test (upload flow)
- **Month 3:** Assessment flow E2E, AI validation tests
- **Month 4:** Final E2E suite for demo flows, fix any regressions

---

## 4. Bias Detection Module — Implementation Plan

### Approach: Statistical Fairness Analysis + Blind Mode

This is achievable without building complex ML. It's mostly **data analysis + UI toggles**.

#### 4.1 Data Collection (Passive)
The system already extracts from CVs:
- Name (can infer gender via first-name statistical databases)
- Location (proxy for nationality/ethnicity)
- Education institution (proxy for socioeconomic background)

**Important:** The system does NOT make hiring decisions based on these. It uses them only to *audit its own scoring* for fairness.

#### 4.2 Fairness Metrics (Backend)
Implement statistical tests on assessment/scoring outcomes:

| Metric | What it measures | How |
|--------|-----------------|-----|
| **Score Distribution by Location** | Are candidates from certain countries systematically scored lower? | Group scores by country → compare means + distributions |
| **Score Distribution by Inferred Gender** | Are there gender-based scoring gaps? | Use first-name gender inference (e.g., `gender-detection` npm package) → compare score distributions |
| **Adverse Impact Ratio (4/5ths Rule)** | US EEOC standard: selection rate of any group shouldn't be < 80% of the highest group | `(selection_rate_group_A / selection_rate_group_B) >= 0.8` |
| **Score Variance by Cohort** | Is scoring consistent across batches? | Compare score distributions across different upload batches |
| **Assessment Score vs CV Score Correlation** | Do language assessments confirm or contradict CV scoring? | Pearson correlation between CV score and assessment score |

#### 4.3 Blind Mode (Frontend)
Simple UI toggle for HR managers:
- **Blind ON:** Hide candidate name, photo (if any), location, education institution names
- Show only: anonymized ID, scores, skills, experience summary
- Purpose: reduce unconscious bias during shortlisting

#### 4.4 Fairness Report (Export)
Generate a PDF/on-screen report showing:
- Score distribution charts by demographic proxy
- Adverse impact ratios
- Flagged anomalies (e.g., "Candidates from Location X are 40% less likely to be shortlisted")
- Recommendations

#### 4.5 Implementation Effort
- **Backend:** ~2-3 API endpoints, statistical calculations (can use `simple-statistics` npm package)
- **Frontend:** 1 dashboard page with charts (recharts/chart.js), 1 toggle for blind mode
- **Estimated time:** 3-5 days of work, fits nicely into Month 4

#### 4.6 Academic Value
This is a **strong differentiator** for the presentation:
- Shows ethical AI awareness
- Demonstrates the platform doesn't just automate hiring but *audits itself*
- Aligns with EU AI Act principles (the platform is transparent about its scoring AND monitors for bias)
- Easy to present with visual charts

---

## 5. Confirmed Tech Stack

| Layer | Technology | Rationale |
|-------|-----------|-----------|
| **Framework** | Next.js 16 (App Router) | Full-stack, SSR, API routes, confirmed by user |
| **UI Library** | shadcn/ui + Tailwind CSS 4 | Fast, accessible, great DX |
| **Database** | PostgreSQL 17.2 (Neon in prod) | Relational, JSON support, proven |
| **ORM** | Prisma 6.19.2 | Type-safe, auto-migrations, great Next.js integration |
| **Queue** | BullMQ (Redis) | Installed but not yet active — planned for async bulk CV processing |
| **AI/LLM (Primary)** | Groq (Llama 3.3 70B) via OpenAI SDK | Free tier, fast inference, JSON mode — auto-detected when `GROQ_API_KEY` is set |
| **AI/LLM (Fallback)** | OpenAI GPT-4o via OpenAI SDK | Fallback when Groq unavailable |
| **STT** | Whisper API (OpenAI) | Planned — same provider as LLM fallback, excellent multilingual |
| **PDF Extraction** | unpdf 1.4 | Replaced originally planned pdf-parse — better serverless compat |
| **DOCX Extraction** | mammoth 1.11 | Lightweight, zero native deps |
| **File Storage (Dev)** | LocalStorageService → `public/uploads/` | No cloud dependency needed for dev |
| **File Storage (Prod)** | Vercel Blob 2.3.1 | Native Vercel integration, S3-compatible |
| **Hosting** | Vercel | User confirmed — confirmed |
| **Email** | Resend 6.9.2 (+ copy-link fallback) | Free 100/day, Vercel ecosystem, hybrid approach — confirmed |
| **Validation** | Zod 4.3.6 | TypeScript-first, strict mode, LLM output validation |
| **Charts** | Recharts 3.7 | Installed, not yet wired — analytics dashboard planned |
| **CSV Export** | papaparse | Candidate list export |
| **Testing** | Vitest 4.0.18 (unit) + Playwright (E2E planned) | 56 tests across 6 files |
| **Auth** | Deferred | Not needed for MVP (internal tool) — client-side role via localStorage |

---

## 6. Implementation Progress Tracker

### Month 1 — Foundation
- [x] Project scaffold (Next.js + Prisma + Tailwind + shadcn/ui) ✅ Session 4
- [x] Database schema design & Prisma migration ✅ Session 4 (16 models, 14 enums)
- [x] Onion Architecture refactor ✅ Session 5 (4 layers, DI, composition root)
- [x] Backend/Frontend folder separation ✅ Session 6 (server/ + client/ + path aliases)
- [x] Role-based navigation (Candidate / HR) ✅ Session 8
- [x] Job scraper — Cheerio-based, all pages from adidas careers portal ✅ Session 9
- [x] Server-side pagination (100 jobs/page) ✅ Session 9
- [x] Candidate job application workflow (apply, withdraw, re-apply) ✅ Session 9
- [x] HR Received Applications page with search ✅ Session 10
- [x] HR Notifications (auto-created on apply, read/unread) ✅ Session 10
- [x] Vercel deployment with Neon PostgreSQL ✅ Session 10
- [x] CV upload endpoint (candidate self-upload, synchronous) ✅ Session 11
- [x] File storage integration (LocalStorageService dev, Vercel Blob prod) ✅ Session 11
- [x] Text extraction (unpdf for PDF, mammoth for DOCX) ✅ Session 11
- [x] LLM-based structured extraction (Groq primary, OpenAI fallback + Zod validation) ✅ Session 11
- [x] Deduplication logic ✅ Session 11
- [x] Unit tests: parsing, scoring, extraction, upload ✅ Session 11 (56 tests across 6 files)
- [x] Profile Settings page (personal info, nationality, bio) ✅ Session 11
- [x] Dashboard role-aware redesign (HR stats, candidate quick upload) ✅ Session 12
- [x] CV parsed data preview + inline editing before save ✅ Session 12
- [x] Motivation letter upload ✅ Session 12
- [ ] Async parsing pipeline for HR bulk upload (BullMQ + Redis)
- [ ] ZIP extraction for bulk upload

### Month 1.5 — Internship & Job Management (Added scope)
- [x] JobType enum (FULL_TIME, PART_TIME, INTERNSHIP, CONTRACT) ✅ Session 13
- [x] Job creation dialog (HR) ✅ Session 13
- [x] Multi-word search (AND of ORs) ✅ Session 13
- [x] Internship management page ✅ Session 14
- [x] Internship create/edit dialogs (HR) ✅ Session 14
- [x] InternshipStatus lifecycle (DRAFT → ACTIVE → INACTIVE → FINISHED) ✅ Session 14
- [x] Erasmus program support (isErasmus flag, badge, learning agreement upload) ✅ Session 14
- [x] Start/end dates for internships ✅ Session 14
- [x] Candidate-facing internship view (only ACTIVE, apply, upload learning agreement) ✅ Session 15
- [x] Job/internship type badges in UI ✅ Session 13

### Month 2 — Intelligence Layer
- [x] CV structured scoring model (deterministic formula) ✅ Session 4
- [x] Job-candidate matching engine ✅ Session 4
- [ ] Experience relevance classification (LLM-based — port exists, not wired to UI)
- [ ] Job opening CRUD enhanced — ✅ basic CRUD done, advanced filters pending
- [ ] Recruiter filtering dashboard (advanced filters)
- [ ] Candidate detail view + manual edit + notes — notes API exists, UI placeholder
- [ ] Candidate tagging system
- [ ] Candidate contact quick-view button
- [ ] API integration tests
- [ ] First E2E test (upload → parse → list flow)

### Month 3 — Language Assessment
- [ ] Assessment configuration + templates (CRUD + reusable presets)
- [ ] Audio recording component (frontend)
- [ ] Speech-to-text integration
- [ ] Listening + written response assessment
- [ ] Structured scoring rubric evaluation
- [ ] CEFR level estimation
- [ ] Feedback generation (LLM)
- [ ] Borderline candidate detection logic
- [ ] Candidate assessment portal (magic link, no login)
- [ ] Assessment E2E test
- [ ] AI output validation tests

### Month 4 — Finalization & Polish
- [ ] Improvement track logic & content
- [ ] Reassessment flow
- [ ] Internal mobility extension
- [ ] Recruitment analytics dashboard (funnels, distributions, time metrics)
- [ ] Bias detection module (statistical analysis + blind mode)
- [ ] Export: CSV/PDF (candidate lists, profiles, assessment results, fairness report)
- [ ] Synthetic dataset generation (200-500 CVs)
- [ ] Final E2E test suite (demo flows)
- [ ] Performance optimization
- [ ] Demo preparation
- [ ] Documentation & architecture diagrams

---

## 7. Key Decisions Log

| Date | Decision | Rationale | Status |
|------|----------|-----------|--------|
| 2026-02-22 | **Next.js** as framework | User preference, full-stack capability | ✅ Confirmed |
| 2026-02-22 | **No auth for MVP** | Internal-only tool, prototype scope | ✅ Confirmed |
| 2026-02-22 | **No audit trail for MVP** | Internal use, not critical | ✅ Confirmed |
| 2026-02-22 | **Magic link for candidates** | No login, tokenized, time-limited | ✅ Confirmed |
| 2026-02-22 | **Bias detection included** | Academic differentiator, statistical approach | ✅ Confirmed |
| 2026-02-22 | **Testing: Vitest + Playwright** | Fast, modern, Next.js native | ✅ Confirmed |
| 2026-02-22 | **Vercel** for hosting | User confirmed | ✅ Confirmed |
| 2026-02-22 | **Resend** for email (+ copy-link fallback) | Free tier, Vercel ecosystem, hybrid approach | ✅ Confirmed |
| 2026-03-09 | **Groq (Llama 3.3 70B)** as primary LLM | Free tier, fast inference, OpenAI SDK compatible | ✅ Implemented |
| 2026-03-09 | **OpenAI GPT-4o** as fallback LLM | Reliability when Groq is down | ✅ Implemented |
| 2026-03-09 | **unpdf** instead of pdf-parse | Better serverless compat, modern PDF support | ✅ Implemented |
| 2026-03-09 | **LocalStorageService** for dev storage | No cloud dependency during development | ✅ Implemented |
| 2026-03-09 | **Vercel Blob** for production storage | S3-compatible, Vercel-native | ✅ Implemented |
| 2026-03-09 | **Synchronous CV processing** for Phase 1 | Single file = 3-8s, acceptable UX; BullMQ deferred | ✅ Implemented |
| 2026-03-09 | **Zod 4.x** with `.strict()` on update schemas | Prevent extra fields in PATCH requests | ✅ Implemented |
| 2026-03-09 | **JobType + InternshipStatus enums** | Separate internships from regular jobs, lifecycle management | ✅ Implemented |
| 2026-03-09 | **Erasmus learning agreement per application** | Per-application (not per-candidate), stored on JobApplication model | ✅ Implemented |
| 2026-03-09 | **Candidate-only-ACTIVE filter** | Candidates should only see active internships | ✅ Implemented |

---

## 8. Session Notes

### Session 1 — 2026-02-22 — Initial Analysis
- Read and analyzed full spec
- Identified gaps: auth, candidate portal, notifications, analytics, audit trail
- Proposed 10 additional features categorized by priority
- Created this tracking document

### Session 2 — 2026-02-22 — Feature Decisions & Stack Confirmation
- User confirmed **Next.js** as tech stack
- User deferred auth and audit trail (internal MVP)
- User confirmed: candidate portal (magic links), analytics dashboard, collaborative notes, assessment templates, CSV/PDF export, bias detection
- Contact info simplified to a quick-view button on candidate list
- Defined complete **testing strategy** (4 layers: unit, API, E2E, AI validation)
- Designed **bias detection module** implementation plan (statistical fairness + blind mode)
- Updated all sections of this tracker

### Session 3 — 2026-02-22 — Final Tech Decisions
- All open questions resolved:
  - **LLM:** OpenAI GPT-4o ✅
  - **STT:** Whisper API (same provider, multilingual, simple) ✅
  - **Hosting:** Vercel ✅
  - **File storage:** Vercel Blob (native, free 250MB) ✅
  - **Email:** Resend + copy-link fallback (hybrid: works even without email config during dev) ✅
- **ALL architectural decisions are now locked in. Zero pending items.**
- **Next steps:** Scaffold the Next.js project, design database schema

### Session 4 — Project Scaffolding (Complete)
- **Scaffolded entire Next.js 16 project** with TypeScript, Tailwind CSS v4, App Router, src directory
- **Installed 249+ packages:** prisma, @prisma/client, openai, bullmq, ioredis, zod, date-fns, papaparse, uuid, resend, recharts, lucide-react, clsx, tailwind-merge, class-variance-authority + dev deps (vitest, @vitejs/plugin-react, playwright, @types/*)
- **Downgraded Prisma 7→6** (Prisma 7 has breaking changes with new client engine model; Prisma 6 is stable)
- **shadcn/ui initialized** with 20 components: button, card, input, label, badge, table, tabs, dialog, dropdown-menu, separator, sheet, textarea, select, skeleton, sonner, avatar, tooltip, progress, popover, command
- **Database schema:** 15 models, 9 enums, comprehensive indexes
  - Models: Candidate, Experience, Education, CandidateLanguage, Skill, CandidateTag, CandidateNote, Job, JobMatch, Assessment, AssessmentResult, AssessmentTemplate, ImprovementTrack, ImprovementProgress, ParsingJob
  - Enums: CandidateStatus (10 states), CandidateSource, CEFRLevel, EducationLevel, JobStatus, AssessmentType, AssessmentStatus, TrackStatus, ParsingJobStatus
- **Core lib modules created:**
  - `lib/db.ts` — Prisma singleton with dev logging
  - `lib/openai.ts` — OpenAI client singleton
  - `lib/email.ts` — Resend client
  - `lib/utils.ts` — cn(), formatDate(), formatDateTime(), truncate(), sleep()
  - `lib/constants.ts` — CEFR levels, status config, scoring weights, thresholds
  - `lib/validations.ts` — Zod schemas for CV extraction, assessment scoring, job creation, filters
  - `lib/scoring/cv-scoring.ts` — Deterministic CV scoring engine (4 weighted components)
  - `lib/cv-parser/parser.ts` — GPT-4o CV extraction with JSON mode + Zod validation
  - `lib/cv-parser/dedup.ts` — Candidate deduplication (email match + name+location)
  - `lib/matching/engine.ts` — Job-candidate matching (location, language, experience, education)
- **10 page routes created** (all with placeholder UI ready for implementation):
  - Landing page, Dashboard (4 stats cards), Candidates list, Candidate detail (tabbed), Jobs, Upload, Assessments, Improvement Tracks, Analytics, Settings
  - Plus: Candidate assessment portal (`/assess/[token]`) for magic link access
- **8 API route stubs** with real logic:
  - `GET/POST /api/candidates` — Full filtering, pagination, search
  - `GET/PATCH /api/candidates/[id]` — Detail with all relations + manual edits
  - `POST /api/candidates/[id]/notes` — Collaborative notes
  - `GET/POST /api/jobs` — Job CRUD with Zod validation
  - `POST /api/jobs/[id]/match` — Runs matching engine for all candidates
  - `GET/POST /api/assessments` — With magic link generation
  - `POST /api/upload` — File upload stub (ready for Vercel Blob)
  - `GET /api/export/candidates` — CSV export via papaparse
- **Sidebar navigation** with all module links + active state
- **Vitest config** + 2 initial test files (scoring + matching)
- **`.env.example`** with all required env vars
- **Build verified:** `npx next build` passes — all 17 routes compile successfully

### Session 5 — Onion Architecture Refactor (Complete)
- **Audited existing architecture** — identified 4 major violations:
  1. Flat `lib/` folder with no layer separation
  2. `cv-parser/parser.ts` directly imports OpenAI (infrastructure leak into business logic)
  3. `cv-parser/dedup.ts` directly imports Prisma (infrastructure leak)
  4. API routes contain orchestration logic (DB queries + business rules mixed)
  5. No ports/interfaces — no dependency inversion
- **Created 4-layer Onion Architecture:**
  - **Domain Layer** (`src/domain/`) — 5 files, zero external dependencies
    - `value-objects.ts` — All business constants moved from `lib/constants.ts`
    - `services/scoring.service.ts` — Pure CV scoring engine (imports only `@/domain/value-objects`)
    - `services/matching.service.ts` — Pure matching engine (imports only `@/domain/value-objects`)
    - `ports/repositories.ts` — Repository interfaces: `ICandidateRepository`, `IJobRepository`, `IAssessmentRepository`, `IDeduplicationRepository`
    - `ports/services.ts` — Service interfaces: `ICvParserService`, `IEmailService`, `IStorageService`
  - **Application Layer** (`src/application/`) — 7 files
    - `dtos.ts` — Zod schemas moved from `lib/validations.ts`
    - `index.ts` — Use case factory (composition, creates pre-wired instances)
    - `use-cases/candidate.use-cases.ts` — `CandidateUseCases` class + `NotFoundError`/`ValidationError`
    - `use-cases/job.use-cases.ts` — `JobUseCases` class with `matchCandidatesToJob` orchestration
    - `use-cases/assessment.use-cases.ts` — `AssessmentUseCases` class with magic link lifecycle
    - `use-cases/upload.use-cases.ts` — `UploadUseCases` class (stub for Vercel Blob + BullMQ)
    - `use-cases/export.use-cases.ts` — `ExportUseCases` class with CSV generation
  - **Infrastructure Layer** (`src/infrastructure/`) — 8 files
    - `database/prisma-client.ts` — Prisma singleton
    - `database/candidate.repository.ts` — `PrismaCandidateRepository` implements `ICandidateRepository`
    - `database/job.repository.ts` — `PrismaJobRepository` implements `IJobRepository`
    - `database/assessment.repository.ts` — `PrismaAssessmentRepository` implements `IAssessmentRepository`
    - `database/dedup.repository.ts` — `PrismaDeduplicationRepository` implements `IDeduplicationRepository`
    - `ai/openai-client.ts` — OpenAI client (lazy-loaded to prevent build-time crashes)
    - `ai/cv-parser.service.ts` — `OpenAiCvParserService` implements `ICvParserService`
    - `email/resend.service.ts` — `ResendEmailService` implements `IEmailService` (lazy-loaded)
  - **Composition Root** (`src/container.ts`) — Wires infrastructure to domain ports
- **Refactored all 8 API routes** to thin controllers (~20 lines each, only HTTP concerns)
  - Biggest win: `jobs/[id]/match/route.ts` went from ~60 lines to single use case call
- **Deleted superseded `lib/` files:** constants.ts, validations.ts, db.ts, openai.ts, email.ts, scoring/, matching/, cv-parser/ (kept only `lib/utils.ts` for UI utilities)
- **Updated test imports** to reference new domain layer paths
- **Fixed lazy loading issues:** OpenAI and Resend clients now instantiate on first use (not module load), preventing build-time errors when API keys aren't set
- **Created `architecture.md`** — comprehensive documentation of Onion Architecture, tech stack, data flow diagrams, and architectural decisions
- **Build verified:** `npx next build` passes — all 17 routes compile, 0 TypeScript errors

### Session 6 — 2026-02-23 — Backend/Frontend Folder Separation
- **Fixed duplicate `node_modules`:** Parent folder `adidas_project/` had an accidental `package.json` with old Prisma 7 + Zod 4 versions, creating a separate `node_modules/`. Deleted `package.json`, `package-lock.json`, and `node_modules/` from the parent. The only `node_modules/` now lives in `github_repo/`.
- **Separated backend and frontend into distinct folders:**
  - Created `src/server/` — moved `domain/`, `application/`, `infrastructure/`, `container.ts`
  - Created `src/client/` — moved `components/`, `lib/` (contains `utils.ts`)
  - `src/app/` stays as the Next.js routing glue layer (API routes + pages)
- **Added TypeScript path aliases:**
  - `@server/*` → `src/server/*` (used by API routes, tests — all backend imports)
  - `@client/*` → `src/client/*` (used by pages, layouts — all frontend imports)
  - `@/*` → `src/*` (kept for general use)
  - Updated both `tsconfig.json` and `vitest.config.ts` with all three aliases
- **Updated 30+ files** with new import paths:
  - All server internal imports: `@/domain/` → `@server/domain/`, `@/infrastructure/` → `@server/infrastructure/`, etc.
  - All API route imports: `@/application` → `@server/application`
  - All UI component imports: `@/lib/utils` → `@client/lib/utils`, `@/components/` → `@client/components/`
  - All page/layout imports: `@/components/` → `@client/components/`
  - Test imports: `@/domain/` → `@server/domain/`
- **Updated `components.json`** (shadcn/ui config) with new `@client/` paths so future `npx shadcn add` commands work correctly
- **Updated `architecture.md`** with new directory structure and path alias table
- **Build verified:** `npx next build` passes — all 17 routes compile, 0 errors, dual-lockfile warning gone

### Session 7 — Architecture Audit & Dead Code Review
- **Comprehensive architecture audit:** Reviewed all source files across 10 categories (dead code, orphan files, architecture bypasses, excessive `any`, inconsistent validation, etc.)
- **58 findings total**, triaged into actionable fixes vs acceptable-as-is
- **Fixed — barrel export gap:** Added `NotFoundError` + `ValidationError` re-exports to `src/server/application/index.ts`. Updated 3 API routes (`candidates/[id]`, `candidates/[id]/notes`, `jobs/[id]/match`) to import from barrel instead of deep paths.
- **Fixed — PATCH validation:** Created `UpdateCandidateSchema` in `dtos.ts` with `.strict()`. Added Zod validation + `NotFoundError` handling to `PATCH /api/candidates/[id]`.
- **Fixed — unused container services:** Wired all 3 previously dangling container exports:
  - `deduplicationRepository` + `cvParserService` → injected into `UploadUseCases` constructor
  - `emailService` → injected into `AssessmentUseCases` constructor
  - Updated `index.ts` factory to import and pass all 6 container instances
- **Accepted as-is (not dead code):**
  - 16 of 20 shadcn/ui components are orphans — expected, pages are stubs
  - 12 unused value-object exports — will be consumed as features are built
  - 4 unused DTO exports (`CvExtractionSchema`, `CvExtraction`, `AssessmentScoringSchema`, `AssessmentScoring`) — needed for CV parsing and assessment scoring flows
  - `IStorageService` port defined but no implementation — Vercel Blob integration pending
  - All 10 dashboard pages are placeholder stubs — to be implemented incrementally
- **Remaining improvement opportunity:** 13+ `any` types in port interfaces should be replaced with proper domain types (future session)
- **Build verified:** `npx next build` passes — all 17 routes, 0 errors

### Session 8 — Role-Based Navigation & Candidate Assessments
- **Added `RoleProvider`** — client-side role context (`"candidate" | "hr"`) with localStorage persistence
- **Split sidebar navigation** — separate nav menus per role (HR has analytics/candidates, candidate has assessments/applications)
- **Candidate Assessments page** — page at `/dashboard/assessments` for candidates
- **Docs reorganization** — moved spec and architecture docs into `docs/` folder, tracker into `claude-docs/`
- **Build verified:** `npx next build` passes

### Session 9 — Job Scraper, Applications & Candidate Workflow
- **Built adidas job scraper** — Cheerio-based, scrapes `jobs.adidas-group.com`, parses `<tr>` rows with 4 `<td>` cells (title, location, department, date)
- **Changed from cron to manual trigger** — "Get current job offers" button on Jobs page
- **Set up PostgreSQL** — local: `postgres/talent_intel_2026`, database `talent_intelligence`, ran `prisma db push`
- **Fixed country/location extraction** — rewrote `parsePage` to handle table structure correctly
- **Fetches ALL pages** — changed `maxPages` from 5 to 0 (unlimited)
- **Server-side pagination** — 100 jobs per page with Prisma `skip`/`take`, distinct countries via `groupBy`
- **Candidate job application system:**
  - `JobApplication` Prisma model with `@@unique([jobId, candidateId])`
  - Hover overlay on job cards for applying
  - `ApplicationUseCases` with apply, withdraw, re-apply (resets WITHDRAWN → SUBMITTED)
  - `IJobApplicationRepository` port + `PrismaJobApplicationRepository` implementation
  - API endpoints: `POST/GET /api/applications`, `PATCH /api/applications/[id]`
- **Created `/api/me` endpoint** — auto-creates a demo candidate for testing
- **"My Applications" page** — shows active/past applications with withdraw button, status badges
- **UI fixes:** Title wrapping (removed `truncate`), "Open" badge moved to footer row, countries stat shows exact count
- **Build verified:** `npx next build` passes — 23 routes

### Session 10 — HR Notifications, Received Applications & Vercel Deployment
- **Notification model** — Added `Notification` Prisma model with `NotificationType` enum (`APPLICATION_RECEIVED`, `ASSESSMENT_COMPLETED`, `CV_UPLOADED`, `STATUS_CHANGE`)
- **Full Onion Architecture wiring:**
  - `INotificationRepository` port in domain layer
  - `PrismaNotificationRepository` in infrastructure layer
  - `NotificationUseCases` in application layer
  - Wired into DI container and barrel export
- **Auto-notification on apply** — `ApplicationUseCases.applyToJob()` creates an `APPLICATION_RECEIVED` notification (with job + candidate references) whenever a candidate applies or re-applies
- **HR Received Applications page** — `/dashboard/received-applications` showing all non-withdrawn applications with candidate name/email, job details, status badges, and search
- **HR Notifications page** — fully functional feed at `/dashboard/notifications` showing "Candidate X applied to Job Y" with read/unread state, individual mark-as-read, mark-all-as-read
- **HR sidebar updated** — added "Received Applications" with `Inbox` icon after "Job Openings"
- **API endpoints:** `GET /api/applications/all` (HR view), `GET/PATCH /api/notifications`
- **Added `findAll()` to `IJobApplicationRepository`** — includes candidate data for HR view
- **Vercel deployment:**
  - Initialized git repo, committed 104 files, pushed to `github.com/Frsoul7/adidas-talent-pool`
  - Updated `package.json` build script: `prisma generate && next build` + `postinstall` hook
  - Installed Vercel CLI, logged in, linked project
  - Created Neon PostgreSQL database (`neon-citron-school`) via Vercel Storage
  - Pushed Prisma schema to Neon database
  - Deployed to production: **https://githubrepo-mocha.vercel.app**
- **Build verified:** `npx next build` passes — 23 routes, 0 errors

### Session 11 — CV Parser Pipeline (Phase 1) + Profile Settings
- **CV Parser Plan** — Wrote `docs/CV_PARSER_PLAN.md` (377 lines) documenting the two-stage pipeline architecture
- **Text Extraction Service** — `TextExtractionService` implementing `ITextExtractionService` port using `unpdf` for PDFs and `mammoth` for DOCX
- **LLM Integration** — Changed from OpenAI-only to **Groq (Llama 3.3 70B) primary + OpenAI fallback**. Auto-detected via `GROQ_API_KEY` env var. Both accessed through OpenAI SDK with custom `baseURL`
- **Storage Services** — Created `LocalStorageService` (writes to `public/uploads/`, dev default) and `VercelBlobStorageService` (production). Container auto-selects based on `BLOB_READ_WRITE_TOKEN`
- **Upload Use Cases** — Full `processCandidateCv` orchestration: validate file → store → extract text → parse via LLM → Zod validate → dedup check → upsert candidate with all relations → score
- **API Routes** — `POST /api/upload/candidate` (candidate self-upload), `POST /api/upload` (HR upload)
- **Zod Validation Fixes** — Updated `CvExtractionSchema` for Zod 4 compatibility, fixed coercion issues
- **Profile Settings page** — `/dashboard/settings` with personal info fields, searchable nationality combobox (European countries), availability, work model, bio
- **Dashboard redesign** — Role-aware: HR gets stat cards, Candidate gets quick CV upload zone with parsed data display
- **56 unit tests** across 6 files: `scoring.test.ts` (10), `matching.test.ts` (4), `cv-validation.test.ts` (17), `text-extraction.test.ts` (10), `upload-use-cases.test.ts` (12), `vercel-blob-storage.test.ts` (3)
- **Build verified:** all tests pass, `npx next build` passes

### Session 12 — CV Persistence, Editing & Bug Fixes
- **localStorage persistence** — Parsed CV data persisted in localStorage so candidates don't lose data on reload
- **Editable fields** — All parsed CV fields (name, email, experiences, education, languages, skills) editable in UI before saving
- **Save Changes PATCH** — `PATCH /api/me` updates candidate profile with edited CV data
- **Dashboard CV metadata** — Shows uploaded CV file info on candidate dashboard
- **Motivation letter upload** — `POST /api/upload/motivation-letter` endpoint + UI integration
- **Bug fixes:**
  - Single CV replacement (new upload replaces old)
  - Language level selector (CEFR level dropdown per language)
  - Removed duplicate badge display
  - PATCH 400 fix — root cause: linkedinUrl without https:// protocol. Fixed URL normalization in upload use-cases, route.ts, dtos.ts, and client save handler
  - CV file metadata display in dashboard
- **Education parser improvement** — Updated LLM prompt to extract certifications, courses, and formations in addition to formal education
- **Language combobox** — Searchable combobox using European languages list (48 languages) with Popover+Command pattern

### Session 13 — Internship Feature + Job Management
- **JobType enum** — Added `FULL_TIME`, `PART_TIME`, `INTERNSHIP`, `CONTRACT` to Prisma schema
- **Internship fields** — Added `durationWeeks`, `stipend`, `mentorName`, `mentorEmail` to Job model
- **Database migration** — `20260309182847_add_job_type_and_internship_fields`
- **Repository updates** — `job.repository.ts` now supports `type`, `excludeType` filters
- **Multi-word search** — Search queries split into terms with AND-of-ORs matching
- **Job Openings page** — Added type filter dropdown, type badges on cards
- **"Create New Job" dialog** — HR can create jobs with all fields including type selection
- **Internships page** — Created `/dashboard/internships` with role-aware behavior
- **Sidebar updated** — Internships link added for both HR and Candidate roles

### Session 14 — Internship Enhancements
- **Editable internships** — HR can edit existing internships via dialog
- **InternshipStatus enum** — `DRAFT`, `ACTIVE`, `INACTIVE`, `FINISHED` lifecycle states
- **Schema migration** — `20260309213650_internship_enhancements`: replaced `durationWeeks` with `startDate`/`endDate`, added `isErasmus`, `internshipStatus`
- **Erasmus support** — `isErasmus` boolean flag, Erasmus badge in UI
- **Learning agreement upload** — `POST /api/upload/learning-agreement` storing file URL on `JobApplication.learningAgreementUrl`
- **InternshipFormFields** shared component — Used by both Create and Edit dialogs
- **Status badges** — Color-coded badges for DRAFT/ACTIVE/INACTIVE/FINISHED
- **Date range display** — Start/end dates shown on internship cards

### Session 15 — Candidate Internship Filter + Documentation Review
- **Candidate-only-ACTIVE filter** — Candidates only see internships with `internshipStatus: ACTIVE`
- **`internshipStatus` filter** — Added through API route → use case → repository → frontend query params
- **Documentation review** — Comprehensive audit of all MD files, identified major discrepancies:
  - Zod version wrong (3.x → 4.3.6), Vitest version wrong (3.x → 4.0.18)
  - OpenAI listed as sole LLM (actually Groq primary)
  - Vercel Blob listed as storage (actually LocalStorageService in dev)
  - BullMQ listed as active (actually installed but unused)
  - Missing: unpdf, mammoth, internship features, Erasmus, learning agreements
- **All documentation files updated** to reflect actual codebase state

---

## 9. File/Folder Reference Map
*Updated as the project grows — Last updated: Session 15 (Documentation review)*

```
github_repo/                                                      # Project root
    ├── .env.example                                              # Environment variable template
    ├── vitest.config.ts                                          # Test configuration (Vitest 4.0.18)
    ├── docs/                                                     # Project documentation
    │   ├── architecture.md                                       #   System architecture docs
    │   ├── Tech Stack.md                                         #   Technology descriptions
    │   ├── CV_PARSER_PLAN.md                                     #   CV parser pipeline plan
    │   └── talent_intelligence_...platform_spec.md               #   Original project spec
    ├── claude-docs/                                              # Claude session tracking
    │   └── CLAUDE_PROJECT_TRACKER.md                             #   THIS FILE
    ├── prisma/
    │   └── schema.prisma                                         # 16 models, 14 enums
    ├── src/
    │   ├── server/                                               # BACKEND (all server-side code)
    │   │   ├── container.ts                                      #   Composition root (11 DI bindings)
    │   │   ├── domain/                                           #   LAYER 1: Domain (innermost)
    │   │   │   ├── value-objects.ts                              #     CEFR, weights, thresholds
    │   │   │   ├── services/
    │   │   │   │   ├── scoring.service.ts                        #     Pure CV scoring engine
    │   │   │   │   └── matching.service.ts                       #     Pure job-candidate matching
    │   │   │   └── ports/
    │   │   │       ├── repositories.ts                           #     6 repository interfaces
    │   │   │       └── services.ts                               #     5 external service interfaces
    │   │   ├── application/                                      #   LAYER 2: Application
    │   │   │   ├── dtos.ts                                       #     Zod 4 validation schemas
    │   │   │   ├── index.ts                                      #     Use case factory
    │   │   │   └── use-cases/
    │   │   │       ├── candidate.use-cases.ts                    #     Candidate CRUD + notes
    │   │   │       ├── job.use-cases.ts                          #     Job + internship CRUD + matching + scraper
    │   │   │       ├── assessment.use-cases.ts                   #     Assessment lifecycle
    │   │   │       ├── upload.use-cases.ts                       #     CV upload pipeline (extract → parse → validate → store)
    │   │   │       ├── export.use-cases.ts                       #     CSV export
    │   │   │       ├── application.use-cases.ts                  #     Job applications + notifications
    │   │   │       └── notification.use-cases.ts                 #     HR notification feed
    │   │   └── infrastructure/                                   #   LAYER 3: Infrastructure
    │   │       ├── database/
    │   │       │   ├── prisma-client.ts                          #     Prisma singleton
    │   │       │   ├── candidate.repository.ts                   #     ICandidateRepository impl
    │   │       │   ├── job.repository.ts                         #     IJobRepository impl (multi-word search, type/status filters)
    │   │       │   ├── assessment.repository.ts                  #     IAssessmentRepository impl
    │   │       │   ├── dedup.repository.ts                       #     IDeduplicationRepository impl
    │   │       │   ├── application.repository.ts                 #     IJobApplicationRepository impl
    │   │       │   └── notification.repository.ts                #     INotificationRepository impl
    │   │       ├── ai/
    │   │       │   ├── openai-client.ts                          #     LLM client: Groq primary / OpenAI fallback
    │   │       │   └── cv-parser.service.ts                      #     ICvParserService impl (LLM + JSON mode + Zod)
    │   │       ├── extraction/
    │   │       │   └── text-extraction.service.ts                #     ITextExtractionService impl (unpdf + mammoth)
    │   │       ├── storage/
    │   │       │   ├── local-storage.service.ts                  #     IStorageService impl (public/uploads/ — dev)
    │   │       │   └── vercel-blob-storage.service.ts            #     IStorageService impl (Vercel Blob — prod)
    │   │       ├── email/
    │   │       │   └── resend.service.ts                         #     IEmailService impl
    │   │       └── scraping/
    │   │           └── adidas-job-scraper.service.ts             #     IJobScraperService impl (Cheerio)
    │   ├── client/                                               # FRONTEND (all client-side code)
    │   │   ├── components/
    │   │   │   ├── layout/sidebar.tsx                            #   Role-based sidebar (candidate: 8, HR: 9 items)
    │   │   │   ├── providers/
    │   │   │   │   ├── role-provider.tsx                         #   Role context (candidate/hr) + localStorage
    │   │   │   │   └── providers.tsx                             #   Root providers wrapper
    │   │   │   └── ui/                                           #   20+ shadcn/ui components
    │   │   └── lib/
    │   │       └── utils.ts                                      #   cn(), formatDate(), truncate()
    │   └── app/                                                  # NEXT.JS ROUTING (glue layer)
    │       ├── layout.tsx                                        #   Root layout
    │       ├── page.tsx                                          #   Landing page
    │       ├── assess/[token]/page.tsx                           #   Candidate assessment portal
    │       ├── dashboard/
    │       │   ├── layout.tsx                                    #   Dashboard shell (sidebar)
    │       │   ├── page.tsx                                      #   Dashboard home (role-aware)
    │       │   ├── jobs/page.tsx                                 #   Job openings (scraper + create + apply + filters)
    │       │   ├── internships/page.tsx                          #   Internships (create/edit/apply + Erasmus + learning agreement)
    │       │   ├── upload/page.tsx                               #   CV Upload (drag-and-drop + parse + edit + save)
    │       │   ├── settings/page.tsx                             #   Profile settings (personal info, nationality)
    │       │   ├── applications/page.tsx                         #   Candidate "My Applications"
    │       │   ├── received-applications/page.tsx                #   HR "Received Applications"
    │       │   ├── notifications/page.tsx                        #   HR notification feed
    │       │   ├── assessments/page.tsx                          #   Assessment management
    │       │   ├── candidates/page.tsx                           #   Candidate list (placeholder)
    │       │   ├── candidates/[id]/page.tsx                      #   Candidate detail (placeholder)
    │       │   ├── analytics/page.tsx                            #   Analytics (placeholder)
    │       │   └── improvement/page.tsx                          #   Improvement tracks (placeholder)
    │       └── api/                                              #   REST API (18 route files, ~25 handlers)
    │           ├── me/route.ts                                   #     GET/PATCH — candidate profile
    │           ├── candidates/route.ts                           #     GET — candidate list
    │           ├── candidates/[id]/route.ts                      #     GET/PATCH — candidate detail
    │           ├── candidates/[id]/notes/route.ts                #     POST — collaborative notes
    │           ├── jobs/route.ts                                 #     GET/POST — job list + create
    │           ├── jobs/[id]/route.ts                            #     GET/PATCH — job detail + update
    │           ├── jobs/[id]/match/route.ts                      #     POST — matching engine
    │           ├── jobs/sync/route.ts                            #     POST — job scraper trigger
    │           ├── applications/route.ts                         #     POST/GET — apply + list
    │           ├── applications/[id]/route.ts                    #     PATCH — withdraw
    │           ├── applications/all/route.ts                     #     GET — HR: all applications
    │           ├── assessments/route.ts                          #     GET/POST — assessments
    │           ├── notifications/route.ts                        #     GET/PATCH — notifications
    │           ├── upload/route.ts                               #     POST — HR CV upload
    │           ├── upload/candidate/route.ts                     #     POST — candidate self-upload
    │           ├── upload/motivation-letter/route.ts             #     POST — motivation letter
    │           ├── upload/learning-agreement/route.ts            #     POST — Erasmus learning agreement
    │           └── export/candidates/route.ts                    #     GET — CSV export
    └── tests/
        ├── scoring.test.ts                                       #   CV scoring (10 tests)
        ├── matching.test.ts                                      #   Matching engine (4 tests)
        ├── cv-validation.test.ts                                 #   CV extraction validation (17 tests)
        ├── text-extraction.test.ts                               #   Text extraction (10 tests)
        ├── upload-use-cases.test.ts                              #   Upload pipeline (12 tests)
        └── vercel-blob-storage.test.ts                           #   Storage service (3 tests)
```

---

## 10. Open Questions for User

**All questions resolved as of Session 3 (2026-02-22).** No pending decisions.

| # | Question | Answer | Date |
|---|----------|--------|------|
| 1 | LLM Provider | Groq (Llama 3.3 70B) primary + OpenAI GPT-4o fallback | 2026-03-09 |
| 2 | Speech-to-Text | Whisper API (OpenAI) — planned | 2026-02-22 |
| 3 | Hosting | Vercel | 2026-02-22 |
| 4 | File Storage | LocalStorageService (dev) + Vercel Blob (prod) | 2026-03-09 |
| 5 | Email for magic links | Resend + copy-link fallback | 2026-02-22 |
| 6 | PDF Extraction | unpdf (replaced pdf-parse) | 2026-03-09 |
| 7 | Validation Library | Zod 4.3.6 | 2026-03-09 |

---

> **Note to future Claude sessions:** Always read this file FIRST when resuming work on this project. Check:
> 1. Section 6 (Progress Tracker) — what's done, what's next
> 2. Section 7 (Decisions Log) — what's been decided
> 3. Section 8 (Session Notes) — latest context
> 4. Section 10 (Open Questions) — unresolved items
> 
> The user has confirmed Next.js stack, no auth for MVP, and wants magic links for candidate assessments.
