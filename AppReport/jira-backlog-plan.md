# TalentHub — JIRA Backlog Plan

> **Purpose.** A realistic, mid-detailed product backlog reconstructed from the
> delivered TalentHub codebase, structured so it can be turned into a JIRA CSV
> import (see [§ JIRA import mapping](#jira-import-mapping) at the end). It gives
> the supervisor a credible board: epics, user stories, acceptance criteria,
> MoSCoW priority, rough estimates and status.
>
> **Framing.** The project ran as Scrum with the author as Product Owner over one
> academic semester (Feb–Jul 2026), two-person engineering team. Everything below
> was actually built unless marked otherwise, so most items are `Done`; a handful
> of `Backlog` items are the honest future-work list already named in the report
> (Chapter 7).
>
> **Conventions.**
> - **Type:** Epic / Story / Task / Spike.
> - **Priority (MoSCoW):** Must / Should / Could / Won't (this release).
> - **Estimate:** story points (Fibonacci 1–13).
> - **Status:** Done / In Progress / Backlog.
> - Story keys are illustrative (`TH-###`); JIRA will renumber on import.

---

## Sprint map (reference)

| Sprint | Weeks | Theme | Main epics |
|--------|-------|-------|------------|
| S0 | Discovery | Client engagement, pain-point elicitation, survey | E0 |
| S1 | Foundation | Auth, architecture, DB schema, deployment | E1 |
| S2–S3 | Talent pool | Candidate data, CV upload & parsing | E2, E3 |
| S4 | Jobs & matching | Jobs, JD parsing, job-anchored fit | E4, E5 |
| S5 | Assessment | AI interviewer (technical + language) | E6, E7 |
| S6 | HR tooling | Notifications, communication, analytics widgets | E8, E9 |
| S7 | Engagement | Ambassador program, shortlists | E5, E10 |
| S8 | Hardening | GDPR, testing, coverage, docs | E11, E12 |

---

## E0 — Discovery & Requirements

| Key | Type | Summary | Priority | Est | Status |
|-----|------|---------|----------|-----|--------|
| TH-001 | Story | As PO, elicit HR pain points from the adidas GBS Porto HR team in discovery sessions | Must | 5 | Done |
| TH-002 | Story | Build a 14-item validation survey mapped 1:1 to the nine pain points | Must | 3 | Done |
| TH-003 | Story | Consolidate pain points into a prioritised, client-approved list | Must | 3 | Done |
| TH-004 | Spike | Define the language-and-talent framework brief with the client | Should | 2 | Done |

**Acceptance (TH-001):** nine pain points documented in the client's own framing;
signed off in a client review session; traceable to survey questions and later FRs.

---

## E1 — Platform Foundation

| Key | Type | Summary | Priority | Est | Status |
|-----|------|---------|----------|-----|--------|
| TH-010 | Story | Scaffold Next.js 16 App Router + TypeScript project on Vercel | Must | 3 | Done |
| TH-011 | Story | Implement onion/clean architecture layering (domain / application / infrastructure / presentation) | Must | 5 | Done |
| TH-012 | Story | Google OAuth sign-in via Supabase Auth | Must | 5 | Done |
| TH-013 | Story | Server-set immutable role claim (`candidate` / `hr`) in `app_metadata` | Must | 5 | Done |
| TH-014 | Story | Route/API middleware: session refresh, 401/403 gating, HR-only prefixes | Must | 5 | Done |
| TH-015 | Story | Supabase PostgreSQL schema (33 tables) with `snake_case` ↔ `camelCase` mapping | Must | 8 | Done |
| TH-016 | Task | Admin vs user vs browser Supabase clients; RLS-off, service-role server access | Must | 3 | Done |
| TH-017 | Story | Welcome/role-choice public landing page → Google sign-in → role dashboard | Should | 3 | Done |

**Acceptance (TH-013):** role is set on first sign-in by the auth callback; cannot be
altered from the client; middleware denies non-HR access to HR-only routes.

---

## E2 — Candidate Data & Talent Pool

| Key | Type | Summary | Priority | Est | Status |
|-----|------|---------|----------|-----|--------|
| TH-020 | Story | Candidate profile aggregate (experiences, education, languages, skills, tags, notes) | Must | 8 | Done |
| TH-021 | Story | Auto-create a PLATFORM candidate on first candidate sign-in, linked by `user_id` | Must | 3 | Done |
| TH-022 | Story | HR candidate list with filters, sorting and CSV export | Must | 5 | Done |
| TH-023 | Story | HR candidate profile page with recruiter notes and tags | Must | 5 | Done |
| TH-024 | Story | Global watchlist ("shortlisted" follow flag) on a candidate | Should | 2 | Done |
| TH-025 | Story | Candidate self-service profile view/edit | Must | 5 | Done |

**Acceptance (TH-022):** HR can filter by field, language, location, status; export the
current view to CSV; list is server-paginated.

---

## E3 — CV Ingestion & Parsing

| Key | Type | Summary | Priority | Est | Status |
|-----|------|---------|----------|-----|--------|
| TH-030 | Story | Upload candidate documents to Supabase Storage (`talent-pool` bucket) | Must | 3 | Done |
| TH-031 | Story | Extract text from PDF/DOCX CVs | Must | 5 | Done |
| TH-032 | Story | LLM CV parsing (Groq primary, OpenAI fallback) into a strict Zod-validated schema | Must | 8 | Done |
| TH-033 | Story | Tag each experience with canonical Fields of Work (16-value taxonomy) | Must | 5 | Done |
| TH-034 | Task | Tolerant schema preprocess: silently drop LLM-invented enum values | Must | 3 | Done |
| TH-035 | Story | Bulk parsing jobs with progress + error log | Should | 5 | Done |
| TH-036 | Spike | Quantitative CV-parsing accuracy evaluation harness | Could | 3 | Backlog |

**Acceptance (TH-032):** invalid model output is rejected against the Zod schema; a
single retry is attempted; the fallback provider engages on primary failure;
parsing telemetry row is recorded.

---

## E4 — Jobs & Applications

| Key | Type | Summary | Priority | Est | Status |
|-----|------|---------|----------|-----|--------|
| TH-040 | Story | Job CRUD (HR) with external-ID upsert for scraped jobs | Must | 5 | Done |
| TH-041 | Story | Lazy JD requirements extraction (LLM) into versioned `parsed_requirements` JSONB | Must | 8 | Done |
| TH-042 | Story | Candidate application lifecycle (apply → status progression) | Must | 5 | Done |
| TH-043 | Story | Application status change notifications to the candidate | Must | 3 | Done |
| TH-044 | Task | JD parse-cache invalidation on `source_url` change | Should | 2 | Done |

**Acceptance (TH-041):** JD is parsed on first HR "Rank candidates" open, not in bulk;
cached with schema version; re-parsed only when stale or source changed.

---

## E5 — Job-Anchored Matching

| Key | Type | Summary | Priority | Est | Status |
|-----|------|---------|----------|-----|--------|
| TH-050 | Story | `computeJobFit(job, candidate)` pure function over 7 criteria | Must | 8 | Done |
| TH-051 | Story | Quality (CV-intrinsic) vs Fit (job-anchored) two-score model | Must | 5 | Done |
| TH-052 | Story | Rank candidates for a job; persist top-100 to `job_matches` cache | Must | 5 | Done |
| TH-053 | Story | Explainable per-criterion breakdown + `isEligible` flag | Must | 5 | Done |
| TH-054 | Story | Per-job shortlist with fit-score snapshot at add + HR notes | Should | 5 | Done |
| TH-055 | Story | Candidates page: Quality column always + Fit column when a job is picked | Should | 3 | Done |

**Acceptance (TH-050):** overall = average of *applicable* criteria only; `isEligible` =
AND of applicable `met` flags; fully unit-tested; never auto-rejects.

---

## E6 — AI Interviewer

| Key | Type | Summary | Priority | Est | Status |
|-----|------|---------|----------|-----|--------|
| TH-060 | Story | FastAPI sidecar: start / turn / evaluate interview endpoints | Must | 8 | Done |
| TH-061 | Story | Signed short-TTL HMAC token contract between Next.js and sidecar | Must | 5 | Done |
| TH-062 | Story | Technical-skill interview mode with single-topic enforcement | Must | 8 | Done |
| TH-063 | Story | Language-assessment mode scored on CEFR rubric | Should | 8 | Done |
| TH-064 | Story | Browser TTS/STT (Chrome/Edge) with live transcript in chat | Should | 5 | Done |
| TH-065 | Story | Proctoring event logging + transcript turns persistence | Should | 5 | Done |
| TH-066 | Story | Persist evaluation result; return to dashboard immediately on end | Must | 3 | Done |
| TH-067 | Story | Job-specific (JD-anchored) interview questions | Could | 5 | Backlog |

**Acceptance (TH-061):** token is HMAC-SHA256, 10-min TTL, hash stored in
`interview_sessions`; secret validated at request time.

---

## E7 — Assessments & Improvement Tracks

| Key | Type | Summary | Priority | Est | Status |
|-----|------|---------|----------|-----|--------|
| TH-070 | Story | Assessment templates, assessments and results model | Must | 5 | Done |
| TH-071 | Story | Auto-create an improvement track on assessment FAIL | Should | 3 | Done |
| TH-072 | Story | Improvement-track dashboard page for candidates | Could | 5 | Backlog |

---

## E8 — HR Communication & Notifications

| Key | Type | Summary | Priority | Est | Status |
|-----|------|---------|----------|-----|--------|
| TH-080 | Story | Send candidate email (Resend + copy-link fallback), recorded as interaction | Must | 5 | Done |
| TH-081 | Story | Promotional campaigns generating notifications | Should | 5 | Done |
| TH-082 | Story | Notification centre + per-type preferences | Should | 5 | Done |
| TH-083 | Story | Candidate interaction-history panel (status changes, emails, campaigns) | Should | 5 | Done |

**Acceptance (TH-080):** live delivery gated on sender-domain verification; every send
writes a `CONTACT_EMAIL_SENT` notification with subject/body metadata and HR sender.

---

## E9 — Analytics & Custom Widgets

| Key | Type | Summary | Priority | Est | Status |
|-----|------|---------|----------|-----|--------|
| TH-090 | Story | Seven default analytics charts on `/dashboard/analytics` | Must | 5 | Done |
| TH-091 | Story | Constrained widget catalogue (metrics, dimensions, chart types, filters) | Should | 8 | Done |
| TH-092 | Story | Per-user saved custom widgets ("My charts") with builder dialog + live preview | Should | 8 | Done |
| TH-093 | Spike | Natural-language / free-form chart querying | Won't | 5 | Backlog |

**Acceptance (TH-091):** specs are Zod-validated on every read and write; unknown
keys rejected; no free-form SQL reaches the database.

---

## E10 — Ambassador Program

| Key | Type | Summary | Priority | Est | Status |
|-----|------|---------|----------|-----|--------|
| TH-100 | Story | HR creates/edits/deletes ambassador programs (DRAFT/OPEN/CLOSED) | Should | 5 | Done |
| TH-101 | Story | Candidate browses open programs and submits an application | Should | 5 | Done |
| TH-102 | Story | Pitch video supplied as an external URL (validated http/https link) | Should | 2 | Done |
| TH-103 | Story | HR reviews applications and updates status; auto-tags applicant | Should | 3 | Done |

---

## E11 — GDPR & Compliance

| Key | Type | Summary | Priority | Est | Status |
|-----|------|---------|----------|-----|--------|
| TH-110 | Story | Six-month retention model with repeat-applicant recognition | Must | 5 | Done |
| TH-111 | Task | Server-side-only DB access (RLS off, service role) with audited boundaries | Must | 3 | Done |
| TH-112 | Story | Redact PII in structured logs | Should | 3 | Done |
| TH-113 | Spike | Automated candidate-data purge job after retention window | Could | 3 | Backlog |
| TH-114 | Spike | Pseudonymised repeat-applicant record surviving profile deletion | Could | 3 | Backlog |

---

## E12 — Testing, Quality & Docs

| Key | Type | Summary | Priority | Est | Status |
|-----|------|---------|----------|-----|--------|
| TH-120 | Story | Vitest unit suite (matching, scoring, schemas, bridge, token) | Must | 8 | Done |
| TH-121 | Story | V8 coverage, risk-proportional by architectural layer, uploaded in CI | Should | 5 | Done |
| TH-122 | Story | GitHub Actions CI: `tsc --noEmit` + `vitest run --coverage` | Must | 3 | Done |
| TH-123 | Story | Storybook for UI primitives | Could | 3 | Done |
| TH-124 | Story | HR + candidate user guides | Should | 3 | Done |
| TH-125 | Spike | Bias-detection / fairness auditing module | Won't | 8 | Backlog |
| TH-126 | Spike | Internal-mobility feature family | Won't | 8 | Backlog |

---

## JIRA import mapping

To import as a CSV (JIRA → Filters/Board → Import Issues from CSV), use these columns.
One row per Story/Task/Spike; Epics as their own rows linked via **Epic Name / Epic Link**.

| CSV column | Source in this doc |
|------------|--------------------|
| `Issue Type` | Type column (Epic/Story/Task/Spike) |
| `Summary` | Summary column |
| `Epic Name` | for Epic rows only, e.g. "Job-Anchored Matching" |
| `Epic Link` | the parent epic's key/name (e.g. E5) for child rows |
| `Priority` | map MoSCoW → JIRA priority: Must→Highest, Should→High, Could→Medium, Won't→Lowest |
| `Story Points` | Est column |
| `Status` | Done / In Progress / Backlog (map to your workflow) |
| `Sprint` | from the Sprint map table |
| `Description` | the per-epic Acceptance note (expand per story as needed) |
| `Labels` | epic slug (e.g. `matching`, `ai-interviewer`, `gdpr`) |

**Suggested next step (when you ask me to generate the JIRA file):** I will emit a
ready-to-import `talenthub-jira.csv` with these columns, expanding each Acceptance
line into per-story descriptions and adding `Reporter = <you>` and component labels.

> **Honesty note for the supervisor.** Items marked `Backlog` (TH-036, TH-067,
> TH-072, TH-093, TH-113, TH-114, TH-125, TH-126) were deliberately deferred and
> are the same future-work items discussed in Chapter 7 of the report; they are
> listed here so the board reflects the real scope boundary rather than an
> idealised one.
