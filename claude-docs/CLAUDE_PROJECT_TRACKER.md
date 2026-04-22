# Claude AI - Project Tracker & Orientation Guide
> **Project:** Talent Intelligence & Communication Verification Platform  
> **Context:** Academic project for a multinational (adidas-like context)  
> **Timeline:** ~5 months (Month 5 — hardening phase, in progress)  
> **Tech Stack:** Next.js 16 App Router + Supabase (Postgres + Auth + Storage) + FastAPI sidecar  
> **Primary Spec:** `docs/talent_intelligence_language_verification_platform_spec.md`  
> **Repo:** `new_repo/` (scaffolding S4 → Onion S5 → server/client split S6 → audit S7 → role nav S8 → scraper + applications S9 → HR notifications + Vercel deploy S10 → CV pipeline S11 → CV editing S12 → internships S13-S15 → CEFR dual-mode + AI Interviewer S16 → skill verification S17 → analytics + Recharts wired S18 → **Supabase migration** S19 → **middleware auth + RBAC + Zod hardening + N+1 fixes** S20 → docs sync S21)

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
Frontend (Next.js 16 App Router + React 19 + shadcn/ui + Tailwind 4)
  ├── HR Dashboard (candidates, jobs, internships, analytics, notifications)
  ├── Candidate Portal (profile, CV upload, applications, assessments, AI interview)
  ├── Magic-link Assessment (public /assess/[token])
  └── Recharts-powered Analytics (funnel, pipeline, top skills/languages, trends)

Backend (Next.js API Routes + middleware.ts auth gate)
  ├── Supabase Auth session refresh (@supabase/ssr)
  ├── PUBLIC_API_PREFIXES / HR_ONLY_API_PREFIXES gating (401/403 at middleware layer)
  ├── CV ingestion (single + bulk async via Next.js after())
  ├── CV parsing (Groq primary + OpenAI fallback, Zod-validated)
  ├── Matching + scoring engines (pure domain services)
  ├── Dual-mode assessment (WRITTEN auto-graded, INTERVIEW via FastAPI)
  ├── Per-skill verification (role-play Q&A, LLM-graded)
  ├── Analytics aggregations (SupabaseAnalyticsRepository)
  └── CSV export

Database (Supabase-managed PostgreSQL, no ORM)
  ├── 23 tables, 4 SQL migrations under supabase/migrations/
  ├── RLS policies on candidate-owned tables (keyed on auth.uid())
  └── Access via @supabase/supabase-js (server = service-role, client = anon)

Storage (dual-mode)
  ├── SupabaseStorageService (when SUPABASE_SERVICE_ROLE_KEY set)
  └── LocalStorageService (dev fallback → public/uploads/)

AI Interviewer Sidecar (Python FastAPI — ai_interviewer_backend/)
  ├── Whisper STT + GPT-4o / GPT-4o-mini
  ├── Turn-by-turn rubric scoring with evidence-array guardrails
  └── Deployed separately; URL via INTERVIEW_BACKEND_URL

Auth
  ├── Supabase Auth + Google OAuth (only IdP)
  └── Role stored in auth.users.app_metadata.role ("hr" | "candidate")
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
| Audit Trail | Internal use only, not critical for prototype |
| PWA Support | Not a priority |
| Rate limiting / CSP headers | Prototype scope; relies on Vercel baseline |
| Bias detection module | Removed from MVP scope — effort refocused on dual-mode assessment + interviewer |

### REINSTATED — Implemented after initial "deferred" label
| Feature | Status | Notes |
|---------|--------|-------|
| Auth + RBAC | ✅ Implemented (Session 20) | Supabase Auth + Google OAuth; middleware-level role gating; `app_metadata.role` is the single source of truth |
| Analytics dashboard | ✅ Implemented (Session 18) | Recharts wired against `SupabaseAnalyticsRepository` |
| AI Interviewer | ✅ Implemented (Session 16-17) | FastAPI sidecar with rubric + evidence guardrails |
| Per-skill verification | ✅ Implemented (Session 17) | `skill_verifications` table + LLM role-play grading |

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

## 5. Confirmed Tech Stack (Current)

| Layer | Technology | Rationale |
|-------|-----------|-----------|
| **Framework** | Next.js 16.1.6 (App Router) + React 19.2.3 | Full-stack, SSR, API routes |
| **UI Library** | shadcn/ui + Tailwind CSS 4 | Fast, accessible, great DX |
| **Rich text** | TipTap | Notification campaign composer |
| **Database & Platform** | Supabase (managed PostgreSQL) | Replaces Neon + Prisma — includes Auth and Storage in one provider |
| **Data Access** | `@supabase/supabase-js` ^2.49.4 + `@supabase/ssr` ^0.5.2 | Cookie-aware server client, no ORM; repositories use query builders directly |
| **Migrations** | Plain SQL under `supabase/migrations/` (4 files) | Managed by Supabase CLI |
| **Authentication** | Supabase Auth + Google OAuth | Role in `app_metadata.role` (server-only writes); cookie sessions |
| **Authorization** | `middleware.ts` — `PUBLIC_API_PREFIXES` + `HR_ONLY_API_PREFIXES` | 401/403 enforced at edge; RLS on candidate-owned tables |
| **Async Processing** | Next.js `after()` | Replaced BullMQ/ioredis — bulk CV parsing returns 202 + `parsingJobId` |
| **AI/LLM (Primary)** | Groq (Llama 3.3 70B) via OpenAI SDK | Free tier, fast inference, JSON mode |
| **AI/LLM (Fallback)** | OpenAI GPT-4o / GPT-4o-mini | Fallback + interview scoring |
| **STT** | Whisper API (inside FastAPI sidecar) | Multilingual, consumed by AI Interviewer |
| **AI Interviewer** | FastAPI sidecar (`ai_interviewer_backend/`) — Python | Real-time turn-by-turn interview with Whisper + GPT-4o; rubric + evidence guardrails |
| **PDF Extraction** | unpdf 1.4 | Serverless-friendly |
| **DOCX Extraction** | mammoth 1.11 | Zero native deps |
| **File Storage (Dev)** | `LocalStorageService` → `public/uploads/` | No cloud dep in dev |
| **File Storage (Prod)** | `SupabaseStorageService` (buckets) | Selected when `SUPABASE_SERVICE_ROLE_KEY` present — Vercel Blob removed |
| **Hosting** | Vercel (Next.js) + Supabase (DB/Auth/Storage) + separate host for FastAPI | |
| **Email** | Resend 6.9.2 (+ copy-link fallback) | Free 100/day |
| **Validation** | Zod 4.3.6 | `.strict()` on update schemas; LLM output validation |
| **Charts** | Recharts 3.7 | ✅ Wired to analytics dashboard |
| **CSV Export** | papaparse | |
| **Testing** | Vitest 4.0.18 — **101 tests across 6 files** | `interview-runtime.test.ts` replaces `vercel-blob-storage.test.ts` |

### Removed during Supabase migration
- `@prisma/client`, `prisma` → replaced by `@supabase/supabase-js`
- `@vercel/blob` → replaced by `SupabaseStorageService`
- `bullmq`, `ioredis` → replaced by Next.js `after()`

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
- [x] Candidate detail view + notes API + notes UI ✅ Session 16
- [x] Advanced candidate filtering (country/CEFR/experience/applied-job) ✅ Session 16
- [x] Rescore endpoint (`/api/candidates/rescore`) ✅ Session 16
- [x] Rerank endpoint with weighted formula ✅ Session 16
- [ ] Experience relevance classification (LLM-based — port exists, not wired to UI)
- [ ] Candidate tagging system (model exists, UI deferred)
- [ ] E2E tests (Playwright — not yet wired)

### Month 3 — Language Assessment ✅ COMPLETE
- [x] Assessment configuration + templates (CRUD + reusable presets) ✅ Session 16
- [x] WRITTEN mode: auto-graded LLM evaluation with CEFR estimation ✅ Session 16
- [x] INTERVIEW mode: real-time FastAPI interviewer with Whisper STT ✅ Session 16-17
- [x] Structured rubric scoring (pronunciation, fluency, grammar, vocabulary, coherence) ✅ Session 17
- [x] CEFR level estimation from sub-scores ✅ Session 16
- [x] Feedback generation (LLM) ✅ Session 16
- [x] Borderline candidate detection logic ✅ Session 16
- [x] Candidate assessment portal (magic link, no login) ✅ Session 16
- [x] Evidence-array guardrails + auto-PASS-on-empty-evidence-FAIL in `evaluator.py` ✅ Session 17
- [x] `evaluation_rationale` JSONB persistence (turn_count + evidence) ✅ Session 17
- [x] Interview runtime unit tests (49 tests) ✅ Session 20
- [x] AI output validation tests (CV extraction — 15 tests) ✅ Session 11

### Month 4 — Finalization, Skill Verification & Analytics ✅ COMPLETE
- [x] Per-skill verification via LLM role-play Q&A (`skill_verifications` table) ✅ Session 17
- [x] Recruitment analytics dashboard — funnel, pipeline, top skills/languages, score dist, trend, country breakdown ✅ Session 18
- [x] `SupabaseAnalyticsRepository` with aggregation queries ✅ Session 18
- [x] Export: CSV (candidate lists, applications) ✅ Session 18
- [x] Candidate activation + invitation flow (migration `20260419`) ✅ Session 18
- [x] HR-only middleware gating for analytics / rescore / rerank / export / campaigns ✅ Session 20
- [ ] Synthetic dataset generation (deferred — manual testing)
- [ ] Bias detection module (dropped from scope)
- [ ] Improvement track logic (model exists, UI deferred)

### Month 5 — Supabase Migration & Hardening (IN PROGRESS)
- [x] Full migration Prisma/Neon → Supabase Postgres ✅ Session 19
- [x] Replaced `@vercel/blob` with `SupabaseStorageService` ✅ Session 19
- [x] Replaced BullMQ/ioredis with Next.js `after()` ✅ Session 19
- [x] Rewrote all 10 repositories as `Supabase*Repository` ✅ Session 19
- [x] 4 SQL migrations under `supabase/migrations/` ✅ Session 19
- [x] Supabase Auth + Google OAuth integration ✅ Session 20
- [x] `middleware.ts` session refresh + 401/403 RBAC ✅ Session 20
- [x] `RoleProvider` reads `user.app_metadata.role` ✅ Session 20
- [x] N+1 query fixes in analytics + candidate list ✅ Session 20
- [x] Zod validation added to notes + applications routes ✅ Session 20
- [x] Dead code removal pass ✅ Session 20
- [x] AppReport documentation sync (10 files) ✅ Session 21
- [x] `CLAUDE_PROJECT_TRACKER.md` sync ✅ Session 21
- [ ] Final demo preparation
- [ ] Architecture diagrams refresh

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
| 2026-03-22 | **Dual-mode assessment (WRITTEN + INTERVIEW)** | WRITTEN = async, LLM-graded; INTERVIEW = real-time, FastAPI sidecar | ✅ Implemented (S16) |
| 2026-03-22 | **FastAPI sidecar for AI Interviewer** | Whisper STT + streaming conversation requires Python ecosystem; kept separate from Next.js | ✅ Implemented (S16-17) |
| 2026-03-29 | **Evidence-array guardrail** | `evaluator.py` auto-passes a FAIL verdict with empty `evidence[]` and enforces turn count — prevents silent hallucinated rejections | ✅ Implemented (S17) |
| 2026-03-29 | **Per-skill verification via LLM role-play** | `skill_verifications` table + role-play Q&A scored by LLM rubric | ✅ Implemented (S17) |
| 2026-04-05 | **Analytics wired to Supabase** | `SupabaseAnalyticsRepository` + Recharts on `/dashboard/analytics` | ✅ Implemented (S18) |
| 2026-04-12 | **Full migration to Supabase** | Consolidate DB + Auth + Storage under one provider; drop Prisma, Neon, Vercel Blob, BullMQ | ✅ Implemented (S19) |
| 2026-04-12 | **Next.js `after()` replaces BullMQ** | Bulk CV parsing runs after response in the same serverless function — simpler, no Redis ops | ✅ Implemented (S19) |
| 2026-04-19 | **Supabase Auth + Google OAuth as only IdP** | Role in `app_metadata.role` (server-only writes); candidates cannot escalate via client APIs | ✅ Implemented (S20) |
| 2026-04-19 | **Middleware-level RBAC** | `PUBLIC_API_PREFIXES` + `HR_ONLY_API_PREFIXES` in `middleware.ts` — 401/403 at edge, route handlers stay thin | ✅ Implemented (S20) |
| 2026-04-19 | **Bias detection dropped** | Scope refocused on dual-mode assessment + interviewer; bias module removed from MVP | ✅ Confirmed |

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

### Session 16 — Dual-Mode Assessment + CEFR Framework
- **Assessment templates** — CRUD + reusable presets per role/language combo
- **WRITTEN mode** — Async LLM-graded assessment with rubric evaluation and CEFR sub-score aggregation
- **INTERVIEW mode (scaffold)** — Introduced interview session lifecycle, proxy routes, UI shell
- **Candidate assessment portal** — Magic link `/assess/[token]` fully functional for both modes
- **Rescore + Rerank** — `POST /api/candidates/rescore` and `POST /api/candidates/rerank` with weighted formula
- **Advanced candidate filters** — country, CEFR, experience band, applied-job filtering on candidate list
- **Notes UI** — Wired up collaborative notes with TipTap rich text + timestamped history
- **Borderline detection** — Threshold logic in domain service

### Session 17 — AI Interviewer Sidecar + Skill Verification
- **FastAPI sidecar** (`ai_interviewer_backend/`):
  - `main.py` — FastAPI app with `/realtime/session`, `/realtime/turn`, `/realtime/complete`
  - `audio_handlers.py` — Whisper STT integration
  - `ai_interviewer.py` — Turn orchestration + GPT-4o-mini calls
  - `evaluator.py` — Rubric scoring with **evidence-array guardrails**:
    - `_count_user_turns()` enforces non-trivial conversation before verdict
    - Auto-PASS when verdict=FAIL but `evidence[]` is empty (anti-hallucination)
    - `max_tokens=500` cap on evaluation response
  - `models.py` / `config.py` — Pydantic models + env config
- **Next.js ↔ FastAPI bridge** — `/api/interview/realtime/{session,turn,complete}` proxy routes; `turn` persists `turn_count` + `evidence` into `evaluation_rationale` JSONB
- **Skill verification** — New `skill_verifications` table (migration `20260415`), LLM role-play Q&A, per-skill grading
- **DB migration** — `20260414_add_interview_mode.sql` + `20260415_add_skill_verification.sql`

### Session 18 — Analytics Dashboard (Recharts Wired)
- **`SupabaseAnalyticsRepository`** — Aggregation queries for funnel, pipeline, top skills, top languages, score distribution, trend over time, country breakdown
- **Analytics page** — `/dashboard/analytics` with Recharts (bar, line, pie, funnel)
- **HR-only access** — Page + API routes gated (later enforced at middleware in S20)
- **Activation + invitation flow** — Migration `20260419_add_activation_and_invitation.sql`; HR can invite candidates; activation tokens flow into the magic-link portal
- **CSV export** — Candidate list + applications export via papaparse

### Session 19 — Supabase Migration
- **Dropped Prisma entirely** — Deleted `prisma/` schema/client, removed `@prisma/client` + `prisma` deps
- **New data access layer** — `@supabase/supabase-js` + `@supabase/ssr`; created `src/server/infrastructure/database/supabase-client.ts` + `db-utils.ts`
- **Rewrote 10 repositories** as `Supabase*Repository`:
  - analytics, application, assessment, candidate, dedup, job, notification, parsing-job, scoring-preset, scoring-weights
- **4 SQL migrations** consolidated under `supabase/migrations/`:
  - `20260413000000_initial_schema.sql` — 23 tables baseline
  - `20260414000000_add_interview_mode.sql`
  - `20260415000000_add_skill_verification.sql`
  - `20260419000000_add_activation_and_invitation.sql`
- **Storage** — Replaced `VercelBlobStorageService` with `SupabaseStorageService`; conditional binding on `SUPABASE_SERVICE_ROLE_KEY`
- **Async processing** — Dropped BullMQ + ioredis, moved bulk CV parsing into Next.js `after()` (returns 202 + `parsingJobId`)
- **RLS** — Policies on candidate-owned tables keyed on `auth.uid()`
- **Onion architecture preserved** — Only the Infrastructure layer changed; Domain + Application untouched

### Session 20 — Middleware Auth + RBAC + Hardening
- **`middleware.ts`** — Session refresh via `@supabase/ssr`, plus:
  ```ts
  const PUBLIC_API_PREFIXES = ["/api/auth/"];
  const HR_ONLY_API_PREFIXES = [
    "/api/candidates/rescore", "/api/candidates/rerank",
    "/api/scoring/", "/api/export/",
    "/api/notifications/campaigns", "/api/jobs/sync",
    "/api/upload/bulk", "/api/analytics",
  ];
  ```
  — Unauthenticated `/api/*` → 401; authenticated non-HR on HR-only prefixes → 403.
- **Google OAuth** — Only configured IdP; callback at `/api/auth/callback`
- **`RoleProvider`** — Now reads `user.app_metadata.role` (no more localStorage role toggle)
- **`clearRole()`** — Signs the user out of Supabase and redirects to landing
- **N+1 fixes** — Analytics + candidate list queries batched via Supabase `.in()` + single round-trips
- **Zod validation** — Added schemas for notes creation + applications routes; `.strict()` on update schemas
- **Dead code removal** — Dropped unused exports; deleted `vercel-blob-storage.test.ts`
- **Interview runtime tests** — Added `interview-runtime.test.ts` (49 tests): session creation, turn_count + evidence persistence, auto-PASS on empty-evidence-FAIL, max_tokens cap, completion status transitions
- **Test count: 101 total** across 6 files:
  - `cv-validation.test.ts` (15), `scoring.test.ts` (9), `matching.test.ts` (4), `text-extraction.test.ts` (8), `upload-use-cases.test.ts` (16), `interview-runtime.test.ts` (49)

### Session 21 — Documentation Sync (AppReport + Tracker)
- **AppReport sync** — Aligned all 10 `AppReport/*.md` files with current Supabase-based state:
  - `01_Project_Overview.md`, `02_Requirements_Analysis.md`, `03_Technology_Stack.md`, `04_Architecture_Design.md`, `05_Database_Design.md`, `06_Features_Implementation.md`, `07_API_Documentation.md`, `08_Testing_Strategy.md`, `09_Security_Infrastructure.md`, `10_UI_UX_Design.md`
  - Key rewrites: Supabase (DB/Auth/Storage), FastAPI interviewer, middleware RBAC, 101 tests, 23 tables, 4 migrations, dual-mode assessment, skill verification, analytics complete
- **This tracker** — Updated header, architecture snapshot, feature decisions, tech stack, progress tracker (Months 2-5), decisions log, session notes, file map, open questions

---

## 9. File/Folder Reference Map
*Updated as the project grows — Last updated: Session 21 (Supabase migration + middleware auth + docs sync)*

```
new_repo/                                                         # Project root
    ├── middleware.ts                                             # Supabase session refresh + PUBLIC/HR_ONLY prefix RBAC (401/403)
    ├── vitest.config.ts                                          # Test config (Vitest 4.0.18)
    ├── AppReport/                                                # Academic report (10 synced docs)
    ├── ai_interviewer_backend/                                   # FastAPI sidecar (Python)
    │   ├── main.py                                               #   /realtime/{session,turn,complete}
    │   ├── ai_interviewer.py                                     #   Turn orchestration + GPT-4o-mini
    │   ├── audio_handlers.py                                     #   Whisper STT
    │   ├── evaluator.py                                          #   Rubric + evidence-array guardrails
    │   ├── config.py / models.py                                 #   Env config + Pydantic models
    │   └── requirements.txt / runtime.txt                        #   Python deps + runtime pin
    ├── supabase/                                                 # Supabase SQL migrations
    │   └── migrations/
    │       ├── 20260413000000_initial_schema.sql                 #   23 tables baseline
    │       ├── 20260414000000_add_interview_mode.sql             #   Assessment mode + interview fields
    │       ├── 20260415000000_add_skill_verification.sql         #   skill_verifications table
    │       └── 20260419000000_add_activation_and_invitation.sql  #   HR invitations + activation tokens
    ├── docs/                                                     # Internal docs (spec, architecture, plans)
    ├── claude-docs/
    │   └── CLAUDE_PROJECT_TRACKER.md                             # THIS FILE
    ├── src/
    │   ├── server/                                               # BACKEND
    │   │   ├── container.ts                                      #   Composition root (Supabase bindings)
    │   │   ├── domain/                                           #   Pure domain (unchanged by Supabase migration)
    │   │   │   ├── value-objects.ts
    │   │   │   ├── services/{scoring,matching}.service.ts
    │   │   │   └── ports/{repositories,services}.ts
    │   │   ├── application/                                      #   Use cases (unchanged)
    │   │   │   ├── dtos.ts / index.ts
    │   │   │   └── use-cases/{candidate,job,assessment,upload,export,application,notification,interview,skill-verification}.use-cases.ts
    │   │   └── infrastructure/
    │   │       ├── database/                                     #   All Supabase-backed repos
    │   │       │   ├── supabase-client.ts                        #     Server + browser client factories
    │   │       │   ├── db-utils.ts                               #     Row mapping helpers
    │   │       │   ├── supabase-analytics.repository.ts
    │   │       │   ├── supabase-application.repository.ts
    │   │       │   ├── supabase-assessment.repository.ts
    │   │       │   ├── supabase-candidate.repository.ts
    │   │       │   ├── supabase-dedup.repository.ts
    │   │       │   ├── supabase-job.repository.ts
    │   │       │   ├── supabase-notification.repository.ts
    │   │       │   ├── supabase-parsing-job.repository.ts
    │   │       │   ├── supabase-scoring-preset.repository.ts
    │   │       │   └── supabase-scoring-weights.repository.ts
    │   │       ├── ai/{openai-client,cv-parser.service}.ts
    │   │       ├── extraction/text-extraction.service.ts
    │   │       ├── storage/{local,supabase}-storage.service.ts     #   Vercel Blob removed
    │   │       ├── email/resend.service.ts
    │   │       └── scraping/adidas-job-scraper.service.ts
    │   ├── client/                                               # FRONTEND
    │   │   ├── components/{layout,providers,ui}/
    │   │   │   └── providers/role-provider.tsx                   #   Reads user.app_metadata.role
    │   │   └── lib/utils.ts
    │   └── app/                                                  # Next.js routing
    │       ├── assess/[token]/page.tsx                           # Magic link portal (WRITTEN + INTERVIEW)
    │       ├── dashboard/                                        # HR + candidate pages (analytics wired)
    │       └── api/                                              # ~30 route files (incl. /api/interview/realtime/*)
    └── tests/                                                    # 101 tests across 6 files
        ├── cv-validation.test.ts                                 #   15 tests
        ├── scoring.test.ts                                       #    9 tests
        ├── matching.test.ts                                      #    4 tests
        ├── text-extraction.test.ts                               #    8 tests
        ├── upload-use-cases.test.ts                              #   16 tests
        └── interview-runtime.test.ts                             #   49 tests (replaces vercel-blob-storage.test.ts)
```

---

## 10. Open Questions for User

**All questions resolved.** No pending decisions.

| # | Question | Answer | Date |
|---|----------|--------|------|
| 1 | LLM Provider | Groq (Llama 3.3 70B) primary + OpenAI GPT-4o fallback | 2026-03-09 |
| 2 | Speech-to-Text | Whisper (inside FastAPI sidecar) | 2026-03-22 |
| 3 | Hosting | Vercel (Next.js) + Supabase (DB/Auth/Storage) + separate host for FastAPI | 2026-04-12 |
| 4 | File Storage | `LocalStorageService` (dev) + `SupabaseStorageService` (prod) — Vercel Blob removed | 2026-04-12 |
| 5 | Email for magic links | Resend + copy-link fallback | 2026-02-22 |
| 6 | PDF Extraction | unpdf | 2026-03-09 |
| 7 | Validation Library | Zod 4.3.6 | 2026-03-09 |
| 8 | Authentication | Supabase Auth + Google OAuth (only IdP); role in `app_metadata.role` | 2026-04-19 |
| 9 | Authorization | Middleware-level (`PUBLIC_API_PREFIXES` + `HR_ONLY_API_PREFIXES`) + RLS on candidate-owned tables | 2026-04-19 |
| 10 | Async bulk CV processing | Next.js `after()` — BullMQ/Redis dropped | 2026-04-12 |

---

> **Note to future Claude sessions:** Always read this file FIRST when resuming work on this project. Check:
> 1. Section 6 (Progress Tracker) — what's done, what's next
> 2. Section 7 (Decisions Log) — what's been decided (including Supabase migration + auth)
> 3. Section 8 (Session Notes) — latest context (through Session 21)
> 4. Section 10 (Open Questions) — all resolved
>
> Current state: Next.js 16 + Supabase (Postgres + Auth + Storage) + FastAPI sidecar for AI Interviewer. Supabase Auth + Google OAuth is the only sign-in path. Role is stored in `app_metadata.role` and enforced by `middleware.ts`. 101 tests pass. 23 tables across 4 SQL migrations. All 10 AppReport docs were synced in Session 21.
