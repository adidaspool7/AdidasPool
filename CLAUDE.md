# CLAUDE.md — Project Memory

> **Auto-loaded by Claude Code, Cowork, and any Claude-based agent entering this repo.**
> **KEEP THIS FILE UP TO DATE.** After every session that changes architecture, completes a phase, or introduces a decision, update the relevant section below. Do not add raw session logs — synthesize only.

---

## Project Identity

| Field | Value |
|---|---|
| **Name** | Talent Intelligence & Language Verification Platform |
| **Context** | Academic project — multinational recruitment screening tool (adidas-like) |
| **Owner** | Stratos (ECE + MSc Telecommunications) |
| **Production URL** | `https://adidas-pool.vercel.app/` |
| **Hosting** | Vercel |
| **Repo root** | `adidas-talent-pool/` |

---

## Current Tech Stack (as of 2026-05-08)

| Layer | Technology |
|---|---|
| Framework | Next.js 16.1.6 — App Router, TypeScript, Turbopack on Vercel |
| UI | shadcn/ui + Tailwind CSS 4 |
| Auth | Supabase Auth — Google OAuth only |
| Database | Supabase PostgreSQL (migrated from Neon/Prisma) |
| ORM | **None** — raw Supabase JS client with manual `camelizeKeys`/`snakeifyKeys` |
| Storage | Supabase Storage — bucket: `talent-pool` |
| Supabase client libs | `@supabase/ssr ^0.5.2`, `@supabase/supabase-js ^2.49.4` |
| LLM (primary) | Groq — Llama 3.3 70B via OpenAI SDK (`GROQ_API_KEY`) |
| LLM (fallback) | OpenAI GPT-4o (`OPENAI_API_KEY`) |
| AI Interview backend | FastAPI (Python) at `INTERVIEW_BACKEND_URL` |
| TTS / STT | Browser APIs — `window.speechSynthesis` (TTS) + `window.SpeechRecognition` (STT). Chrome/Edge only. Configured via Vercel env vars. |
| Validation | Zod 4.3.6 |
| Email | Resend 6.9.2 + copy-link fallback |
| CSV export | papaparse |
| Charts | Recharts 3.7 (`react-is@19.2.3` pinned as a direct peer because `.npmrc` sets `legacy-peer-deps=true`) |
| Logging | In-house `createLogger(scope)` from `@server/infrastructure/logging/logger` — replaced raw `console.*` in all `src/app/api/**` routes |
| Testing | Vitest 4.1.5 (unit) + `@vitest/coverage-v8` — coverage uploaded as CI artifact |
| UI primitives docs | Storybook 10.3.6 (`@storybook/nextjs-vite`) for `src/client/components/ui/*` |
| CI | GitHub Actions (Node 20) — `tsc --noEmit` + `vitest run --coverage` + coverage artifact upload |
| Repo policy | `.npmrc` → `legacy-peer-deps=true` (mirrors local `npm i --legacy-peer-deps`); peers must therefore be pinned explicitly when transitively required |

---

## Architecture — Onion / Clean

```
Presentation  →  Application  →  Domain  ←  Infrastructure
(API routes)     (use cases)     (ports)     (implements ports)
```

- **Domain** (`src/server/domain/`): zero external deps. Ports/interfaces only.
- **Application** (`src/server/application/`): use cases, DTOs (Zod). No DB imports.
- **Infrastructure** (`src/server/infrastructure/`): Supabase repos, AI services, storage. Only layer that knows about external services.
- **Presentation** (`src/app/`, `src/client/`): API routes + React components. Thin — delegates to use cases.

**Dependency rule is enforced.** If you find a use case importing from infrastructure, that is a violation.

---

## Database

### Connection
- **Admin client** (server-side, bypasses RLS): `src/server/infrastructure/database/supabase-client.ts`
- **User client** (SSR, session-aware): `src/lib/supabase/server.ts`
- **Browser client**: `src/lib/supabase/client.ts`
- **RLS**: Disabled on all tables. All DB access is server-side via service role key.

### Key Conventions
- DB columns: `snake_case`. JS objects: `camelCase`.
- Conversion utilities: `camelizeKeys()` / `snakeifyKeys()` in `src/server/infrastructure/database/db-utils.ts`
- JSONB fields are **excluded from recursive camelization**: `parsedData`, `evaluationRationale`, `errorLog`, `result`, `breakdown`, `rawAiResponse`, `details`, `parsingConfidence`, `metadata`
- IDs: `TEXT PRIMARY KEY`, generated with `crypto.randomUUID()` via `generateId()`
- `updated_at`: handled by PostgreSQL trigger `set_updated_at()` — no app-level timestamp management
- Migration file: `supabase/migrations/00000000000000_schema.sql` — single canonical schema file. Consolidated 2026-04-26: every prior per-feature delta has been inlined. Run once in Supabase SQL Editor for fresh databases.

### Key Tables
`candidates`, `experiences`, `education`, `candidate_languages`, `skills`, `candidate_tags`, `candidate_notes`, `jobs`, `job_applications`, `job_matches`, `job_shortlists`, `assessment_templates`, `assessments`, `assessment_results`, `interview_sessions`, `interview_transcript_turns`, `interview_proctoring_events`, `improvement_tracks`, `improvement_progress`, `notifications`, `notification_preferences`, `promo_campaigns`, `parsing_jobs`, `scoring_weights`, `scoring_presets`, `sync_jobs`

---

## Auth

- **Provider**: Supabase Google OAuth only
- **Role**: stored in `app_metadata.role` (server-set via service role key, immutable from the client) — either `"candidate"` or `"hr"`. Set on first sign-in by `src/app/auth/callback/route.ts`. Legacy `user_metadata.role` is read once for migration only. `user_metadata` is otherwise used only for display fields (`name`, `full_name`).
- **Middleware** (`middleware.ts`): refreshes session, gates `/api/*` (401 unauth, 403 non-HR on `HR_ONLY_API_PREFIXES`), protects `/dashboard/*`.
- **Candidate ↔ User link**: `candidates.user_id UUID REFERENCES auth.users(id)`. `ProfileUseCases.resolveCurrentCandidate()` looks up by `user_id`, auto-creates PLATFORM candidate if none exists.
- **Role context** (`src/client/components/providers/role-provider.tsx`): reads from `supabase.auth.getUser()`, exposes `userEmail`, `userName`. `clearRole()` calls `supabase.auth.signOut()`.

---

## AI Interviewer

### Architecture
- **Frontend**: popup window (`/interview/[sessionId]`) with camera + audio + chat
- **Backend**: FastAPI at `INTERVIEW_BACKEND_URL`
  - `POST /interview/start` — initializes session, returns first AI question
  - `POST /interview/turn` — submits candidate answer, returns next question
  - `POST /interview/evaluate` — finalizes session, returns `AssessmentResult`
- **Token**: HMAC-SHA256 custom JWT, 10-min TTL, stored hash in `interview_sessions.token_hash`
- **API routes** (Next.js, all under `/api/interview/`):
  - `session/` — create session, generate token
  - `realtime/` — update session status
  - `realtime/turn/` — record transcript turns
  - `realtime/terminate/` — terminate session
  - `proctoring/` — log proctoring events
  - `results/` — save evaluation result

### Bug Fix Status (Phase 2 + Phase 3 — completed 2026-04-13)
- **Timer no-reset on clarification** ✅ — input ending with `?` is treated as clarification; `resetQuestionTimer()` skipped.
- **Total timer removed** ✅ — only per-question timer remains.
- **TTS working** ✅ — `window.speechSynthesis` speaks each AI reply; toggle in UI.
- **STT working** ✅ — `window.SpeechRecognition` (Chrome/Edge); live transcript shown; populates chat.
- **Close button immediate** ✅ — Return to Dashboard always available once `ended = true`, before evaluation loads.
- **Voice transcript in chat** ✅ — STT result appears as "You: [transcript]" in chat.
- **Selected-skill scope hard enforcement** ✅ — realtime API now enforces persisted `interview_sessions.target_skill`, frontend no longer injects first profile skill fallback, and FastAPI prompt contract forces all questions to stay strictly on selected skill.

### Dual Modes (Phase 4 — completed 2026-04-14)
- **Language Assessment mode**: Free-form English conversation scored on CEFR rubric (grammar, vocabulary, fluency). Separate FastAPI system prompt (`build_language_system_prompt`). Evaluator returns `cefr_level`, `grammar`, `vocabulary`, `fluency` inside `technical` dict; persisted to `evaluation_rationale` JSONB. Pass threshold: B1+.
- **Technical Assessment mode**: Existing behavior — skill validation Q&A, single-topic enforcement.
- Mode selected via button toggle on `/dashboard/ai-interview`. Stored in `interview_sessions.interview_mode` (`TECHNICAL` | `LANGUAGE`).
- DB schema: `interview_sessions.interview_mode` (`TECHNICAL` | `LANGUAGE`) is now part of the canonical `00000000000000_schema.sql`.

---

## Job-Anchored Matching (as of 2026-04-23)

The "universal candidate match score" was deleted. Matching is now always
**candidate × specific job**. See [docs/JOB_ANCHORED_MATCHING_PLAN.md](docs/JOB_ANCHORED_MATCHING_PLAN.md).

### Two scores, two meanings

- **Quality** — CV-intrinsic profile score (`candidates.overall_cv_score`). Profile
  completeness, education, languages, location. Independent of any job. Useful as a
  prefilter, not a hiring signal.
- **Fit** — Computed live by `computeJobFit(job, candidate)` for a chosen job.
  7 criteria (field, experience-in-field, seniority, required/preferred skills,
  languages, education). Overall = avg of *applicable* criteria only. `isEligible`
  flag = AND of applicable.met. Persisted in `job_matches` as a cache.

### Pipeline

1. **JD parsing** (`JobRequirementsExtractorService` → Groq, fallback OpenAI).
   Stored in `jobs.parsed_requirements` JSONB + `parsed_requirements_version`.
   Schema: [src/server/domain/services/job-requirements.schema.ts](src/server/domain/services/job-requirements.schema.ts).
   `JOB_REQUIREMENTS_SCHEMA_VERSION = 1`. **Lazy** — parsed on first HR open of
   "Rank candidates", not bulk. Cache invalidated when `bulkUpsertByExternalId`
   detects a `source_url` change.
2. **CV parsing** tags every experience with one or more canonical Fields of Work
   (16 in [src/client/lib/constants.ts](src/client/lib/constants.ts)). Stored in
   `experiences.fields_of_work TEXT[]` (GIN index). Tolerant Zod preprocess
   silently drops LLM-invented values outside the canonical 16.
3. **`computeJobFit`** is a pure function in
   [src/server/domain/services/job-fit.service.ts](src/server/domain/services/job-fit.service.ts).
   Zero deps, fully unit-tested.
4. **Orchestrator** `JobUseCases.matchCandidatesToJob(jobId)` lazy-parses the JD,
   loads candidates with experiences/languages/education/skills, builds the per-field
   experience vector, runs `computeJobFit`, persists top-100 to `job_matches`.

### UI surfaces

- **`/dashboard/jobs/[id]/match-candidates`** — ranked candidates page; HR-only.
- **`/dashboard/candidates`** — Quality column (always) + Fit column (blank until
  HR picks a job from the toolbar dropdown). Picking a job overlays Fit scores.
- **CTA "Rank candidates for this job"** on each HR job card.

### Tables

- `jobs.parsed_requirements JSONB`, `jobs.parsed_requirements_version INT`
- `experiences.fields_of_work TEXT[]` + GIN index
- `job_matches` (cache)
- `jd_parsing_telemetry` — one row per `JobRequirementsExtractorService.extract()`
  call (provider, model, success, duration_ms, prompt/completion tokens,
  fallback_used, error_kind). Fire-and-forget; failures never break parsing.
- All consolidated into the canonical `00000000000000_schema.sql`.

### Tests

- `tests/job-requirements-schema.test.ts` (9 tests)
- `tests/cv-fields-of-work.test.ts` (5 tests)
- `tests/job-fit.test.ts` (15 tests)

### Backfill scripts (ops only — not part of normal flow)

- `scripts/backfill-job-requirements.ts` — re-parse jobs with stale schema version.
- `scripts/backfill-experience-fields.ts` — tag historical experiences.
  Invoke: `npx tsx --env-file=.env.local scripts/<name>.ts [batch] [delay]`

---

## Per-Job Shortlist (Phase 1 — 2026-04-30)

HR's working pick list of candidates being actively considered for a
**specific job**. Distinct from:

- `candidates.shortlisted` (now framed as the **Watchlist** in UI labels —
  global "follow this candidate" flag, unchanged).
- `application_status.SHORTLISTED` (lifecycle stage on `job_applications`).

### Schema
- Table `job_shortlists`: `(job_id, candidate_id)` UNIQUE, `added_by`,
  `added_at`, `fit_score_at_add` (snapshot of `job_matches.match_score`
  at the time of add — survives re-ranking), `notes`.

### Endpoints (all HR-only via inline `requireHr()` helper in `src/lib/auth/require-hr.ts`)
- `GET    /api/jobs/[id]/shortlist` — list with candidate basics + current cached fit
- `POST   /api/jobs/[id]/shortlist` — idempotent add (returns 200 on conflict, 201 on insert)
- `DELETE /api/jobs/[id]/shortlist/[candidateId]` — remove
- `PATCH  /api/jobs/[id]/shortlist/[candidateId]` — update HR note
- `GET    /api/candidates/[id]/shortlists` — list jobs this candidate is on

### UI surfaces
- **`/dashboard/jobs/[id]/match-candidates`** — Tabs `[Ranked candidates] [Shortlist (N)]`
  (URL `?tab=shortlist`). Star button next to each ranked row toggles membership.
  Shortlist tab shows snapshot vs current fit, HR notes (inline edit), remove.
- **`/dashboard/candidates/[id]`** — `Shortlisted For` card lists the jobs.
  Renders nothing for candidate viewers (API returns 403 → component bails).

### Tests
- `tests/job-shortlist-use-cases.test.ts` — idempotent add, fit snapshot, NotFoundError.

---

## HR Custom Analytics Widgets ("My charts")

TrackBuddy-style per-user dashboards on `/dashboard/analytics`. The 7
default charts stay pinned on top; HR can add saved custom charts below.

### Architecture (constrained-builder, NOT freeform SQL)

- **Catalog** (`src/server/domain/services/analytics-catalog.ts`):
  Zod-validated single source of truth for what HR can plot —
  4 metrics (`candidates`, `applications`, `jobs`, `assessments`),
  whitelisted dimensions per metric, allowed chart types per dimension
  family (`categorical`/`temporal`/`none`), whitelisted filter keys.
  `WidgetSpecSchema.strict()` rejects unknown top-level keys.
- **Query service** (`src/server/infrastructure/database/widget-query.service.ts`):
  hand-written runner per metric — fetches one column then in-memory
  `groupCount` + sort + topN. Mirrors `analytics.repository.ts` style.
  Time-series buckets: day (ISO), week (ISO YYYY-Www), month (YYYY-MM).
- **Repository** (`src/server/infrastructure/database/dashboard-widget.repository.ts`):
  CRUD on `hr_dashboard_widgets`, scoped by `user_id`.
- **Use cases** (`src/server/application/use-cases/dashboard-widget.use-cases.ts`):
  validates spec on every read AND write, never trusts client.

### DB
- Table `hr_dashboard_widgets`: `id`, `user_id` (UUID FK auth.users),
  `title`, `spec` JSONB (validated), `position` (ordering), timestamps.
  Indexed on `(user_id, position)`. `spec` added to `JSONB_KEYS` opt-out
  in `db-utils.ts` so dimension/metric keys aren't camelized.

### Endpoints (all HR-only via `requireHr()`)
- `GET  /api/analytics/catalog` — returns the public catalog
- `POST /api/analytics/query` — validate spec → run → `{ data: [{label, value}] }`
- `GET  /api/analytics/widgets` — list current user's saved widgets
- `POST /api/analytics/widgets` — create (validates spec)
- `PATCH  /api/analytics/widgets/[id]` — update title/spec/position
- `DELETE /api/analytics/widgets/[id]` — remove

### UI
- `src/client/components/analytics/chart-from-spec.tsx` — universal
  `{ label, value }[]` renderer (bar/hbar/pie/line/area/stat).
- `src/client/components/analytics/widget-builder-dialog.tsx` —
  metric → dimension → chart type → top-N/lookback → title pickers
  with debounced live preview against POST /api/analytics/query.
- `src/client/components/analytics/my-charts-section.tsx` — saved
  widgets grid; `+ Add chart` button; per-card Edit/Delete.
- Mounted at the bottom of `src/app/dashboard/analytics/page.tsx`,
  AFTER the existing 7 default charts.

### Tests
- `tests/analytics-catalog.test.ts` — 16 tests covering valid combos,
  invalid metric/dimension/chartType combos, unknown filter keys,
  limit bounds, strict mode rejecting injected keys.

---

## Improvement Tracks

- Auto-created when `finalDecision = "FAIL"` on an assessment result (Phase 5)
- Table: `improvement_tracks` with `improvement_progress`
- Dashboard page: `/dashboard/improvement` — not yet built
- Link from interview results to improvement track

---

## Notifications & Interaction History (as of 2026-04-29)

### Schema additions on `notifications`
- `read_at TIMESTAMPTZ` — set when a notification is marked read/archived
- `created_by TEXT` — HR user email/name who triggered the action (null = system)
- `metadata JSONB` — type-specific payload (e.g. `{ subject, body }` for `CONTACT_EMAIL_SENT`, `{ newStatus }` for `STATUS_CHANGE`)
- `campaign_id` — now has FK constraint to `promo_campaigns(id) ON DELETE SET NULL` (PostgREST requires the FK to resolve `campaign:promo_campaigns(...)` join syntax)

### New enum value
- `notification_type::CONTACT_EMAIL_SENT` — recorded when HR sends a candidate email via `/api/candidates/[id]/contact`

### Status change notifications
- `CandidateUseCases.updateCandidate(id, data, createdBy?)` fires `STATUS_CHANGE` notification to candidate when `data.status` changes. `createdBy` is extracted in the PATCH route via `supabase.auth.getUser()` and persisted on the notification.

### Interaction history panel
- HR candidate profile page (`/dashboard/candidates/[id]`) renders an `InteractionHistory` component below Recruiter Notes.
- API: `GET /api/candidates/[id]/interaction-history` → all notifications for the candidate (no role/archived filter), joined with `campaign(id, title)` and `job(id, title)`, ordered DESC.
- Repo method: `INotificationRepository.findInteractionHistory(candidateId)`.
- Use case: `NotificationUseCases.getInteractionHistory(candidateId)`.
- Renders: type badge, status (for `STATUS_CHANGE`), campaign title (for `PROMOTIONAL`), expandable email body (for `CONTACT_EMAIL_SENT`), HR sender, read/read_at status.

---

## Build / Runtime Notes

- **`interview-token.ts`**: secret lookup is **call-time only** — no module-load `assertSecret()`. This is intentional. It allows local `next build` to complete without `INTERVIEW_SESSION_TOKEN_SECRET` set, while still failing fast at request time on the deployed env. All 5 interview routes (`session/`, `realtime/`, `realtime/turn/`, `realtime/terminate/`, `proctoring/`) import this module.
- **Local build vs Vercel build**: Vercel has all env vars set; local `.env.local` may not. `npx tsc --noEmit` is the trustworthy local validation step.

---

## Environment Variables (Vercel)

```
NEXT_PUBLIC_SUPABASE_URL
NEXT_PUBLIC_SUPABASE_ANON_KEY
SUPABASE_SERVICE_ROLE_KEY
INTERVIEW_BACKEND_URL
GROQ_API_KEY
OPENAI_API_KEY            # fallback only
RESEND_API_KEY
NEXT_PUBLIC_APP_URL       # https://adidas-pool.vercel.app
```

---

## Completed Migration Status

| Step | Description | Status |
|---|---|---|
| 1 | Supabase project created, Auth URLs configured | ✅ Done |
| 2 | Supabase Auth files (login, callback, select-role, middleware, role-provider) | ✅ Done |
| 3 | SQL schema migrated (27 ENUMs, 25 tables) | ✅ Done |
| 4 | All 10 Prisma repositories rewritten as Supabase repositories | ✅ Done |
| 5 | SupabaseStorageService replacing VercelBlobStorageService | ✅ Done |
| 6 | Prisma removed from package.json, build script, and all imports | ✅ Done |
| 7 | OAuth wired into dashboard — `user_id` → candidate lookup + auto-create | ✅ Done |

---

## How to Update This File

After any session that:
- Completes a phase or step → update the relevant status table
- Introduces a new architectural decision → add to the relevant section
- Fixes a known bug → remove from "Known Bugs", add to a "Fixed" note
- Adds new env vars → update the env vars section
- Changes the tech stack → update the stack table

**Do NOT** append raw session transcripts. Synthesize only the delta.

---

## Working Preferences (for AI assistants)

- **Production URL** is `https://adidas-pool.vercel.app` — never invent another (e.g. don't propagate `githubrepo-mocha.vercel.app`).
- **Validate locally with `npx tsc --noEmit`**, not `npm run build`. The local build crashes on `INTERVIEW_*` routes because Vercel-only env vars aren't set; this is expected and not a regression.
- **PowerShell on Windows**: chain commands with `;` (never `&&`).
- **Path aliases**: `@server/` → `src/server/`, `@client/` → `src/client/`, `@/lib/` → `src/lib/` (note the slash before `lib`).
- **Schema changes**: update both `supabase/migrations/00000000000000_schema.sql` (canonical) AND give the user the exact `ALTER` / `CREATE` statements to run in Supabase SQL Editor.
- **PostgREST joins**: any `relation:table(cols)` join requires a real foreign key constraint in the DB. If the join fails with 500/PGRST200, add the FK.
- **Commit style**: `feat: <short>`, `fix: <short>`, `chore: <short>`, `refactor: <short>`. One logical change per commit.
- **Markdown docs**: do not create new ones unless explicitly asked. Prefer editing existing files (`CLAUDE.md`, `TODO.md`, `INSTRUCTIONS.md`).
- **Architecture rule** (enforced): use cases never import from `infrastructure/`. Domain has zero external deps. See `INSTRUCTIONS.md`.
- **JSONB camelization**: when adding a new JSONB column, add its key to `JSONB_KEYS` in `db-utils.ts` to prevent recursive camelization.
