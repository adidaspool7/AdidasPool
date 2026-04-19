# TODO — Talent Intelligence Platform

> Tracks all planned work. Status legend: ✅ Done | 🔄 In Progress | ⬜ Pending | ❌ Blocked
> Keep this file updated after every session. Do not delete completed items — move them to the bottom "Completed" section.

---

## Phase 2 — Bug Fixes (AI Interviewer)

| # | Task | Status | Notes |
|---|---|---|---|
| 2.1 | Timer does not reset on clarification turns | ✅ | Frontend heuristic: input ending with `?` → `isClarification=true`, timer not reset |
| 2.2 | Close button appears only after evaluation completes | ✅ | `setEnded(true)` fires before fetch; Return button never disabled in ended view |
| 2.3 | Voice answer transcript shown in chat | ✅ | Browser `SpeechRecognition` populates chat; see Phase 3 |
| 2.4 | Remove total 30-min timer | ✅ | Per-question timer only; total timer state/refs/handlers removed |

---

## Phase 3 — TTS / STT via Browser APIs

| # | Task | Status | Notes |
|---|---|---|---|
| 3.1 | Replace Python TTS placeholder with `window.speechSynthesis` | ✅ | `speakText()` called on every AI reply; TTS toggle in interview UI |
| 3.2 | Replace Python STT with `window.SpeechRecognition` | ✅ | `startSpeechRecognition()` drives transcript; shown live as user speaks |
| 3.3 | Validate STT accuracy with test candidate answers | ⬜ | Manual QA — at least 5 test cases |
| 3.4 | Handle browser permission errors (mic denied) | ✅ | Error message shown; falls back to text input |

---

## Phase 4 — Dual-Mode Interview

| # | Task | Status | Notes |
|---|---|---|---|
| 4.1 | Pre-interview dropdown: select "Language Assessment" or "Technical Assessment" | ✅ | Mode buttons on dashboard `/dashboard/ai-interview` |
| 4.2 | Language Assessment mode — CEFR rubric scoring | ✅ | FastAPI language prompt + CEFR evaluator; grammar/vocabulary/fluency subscores stored in `evaluation_rationale` |
| 4.3 | Technical Assessment mode — AI Skill Validation | ✅ | Unchanged behavior |
| 4.4 | Fix topic mixing — questions should focus on one topic at a time | ✅ | Language mode: no skill scope; Technical mode: existing single-skill enforcement |
| 4.5 | Pass selected mode to FastAPI `/interview/start` | ✅ | `candidate.mode` field propagated through all API layers |
| 4.6 | Display mode badge in interview UI | ✅ | Colored badge in popup header; CEFR level shown in results |

---

## Phase 4b — Evaluator Robustness & Skill Verification

### 4b.1 — Evaluator improvements (FastAPI only, no DB changes)

| # | Task | Status | Notes |
|---|---|---|---|
| 4b.1 | Pass `turn_count` (user turns only) to evaluator context | ⬜ | Count non-system, non-opening messages from role=user in transcript |
| 4b.2 | Require explicit evidence to justify FAIL | ⬜ | Prompt: FAIL requires `evidence` array with ≥1 cited factual error; vague impression is not sufficient |
| 4b.3 | Increase evaluator `max_tokens` 200 → 500 | ⬜ | Allow full reasoning output |
| 4b.4 | Add `evidence` array to evaluator JSON output | ⬜ | `["candidate stated X which is wrong because Y"]`; empty array on PASS is fine |
| 4b.5 | Persist `turn_count` in `evaluation_rationale` JSONB | ⬜ | Stored alongside existing rationale fields for future reference |

### 4b.2 — Skill verification status (requires DB migration)

| # | Task | Status | Notes |
|---|---|---|---|
| 4b.6 | DB migration: add `verification_status`, `verified_at`, `verified_by` to `skills` table | ✅ | `supabase/migrations/20260415000000_add_skill_verification.sql` — run manually in Supabase SQL editor |
| 4b.7 | Auto-sync skill status after interview evaluation | ✅ | `syncSkillVerification()` helper in turn + terminate routes; uses `ilike` on skill name; silent if column missing |
| 4b.8 | Only allow interview launch when skill `verification_status = 'PENDING'` | ✅ | `canLaunchSkill()` in dashboard page; UNVERIFIED also allowed as pre-migration fallback |
| 4b.9 | HR override API: `PATCH /api/candidates/[id]/skills/[skillId]/verification` | ✅ | Stores actual status; `verified_by = HR email` distinguishes from AI decisions |
| 4b.10 | HR candidate profile — Skills tab: show verification status badge per skill | ✅ | `SkillsVerificationPanel` component in `/dashboard/candidates/[id]` |
| 4b.11 | HR candidate profile — Skills tab: override dropdown per skill | ✅ | Dropdown with PENDING / PASSED / FAILED / UNVERIFIED; "HR override" label shown when `verified_by !== "AI"` |

---

## Phase 5 — Improvement Tracks

| # | Task | Status | Notes |
|---|---|---|---|
| 5.1 | Auto-create `improvement_track` when `finalDecision = "FAIL"` | ⬜ | Hook into `results/route.ts` after result saved |
| 5.2 | Build `/dashboard/improvement` page | ⬜ | List tracks per candidate; show progress |
| 5.3 | Link interview results popup to improvement track | ⬜ | "View Improvement Plan" button on fail result |
| 5.4 | Progress tracking UI (checklist / milestone items) | ⬜ | Uses `improvement_progress` table |
| 5.5 | Connect AI Skill Validation results to Improvement Tracks | ⬜ | Map failed assessment categories to track items |

---

## Phase 6 — Pending Features (Intelligence Layer)

| # | Task | Status | Notes |
|---|---|---|---|
| 6.1 | Async parsing pipeline for HR bulk upload | ⬜ | BullMQ + Redis — deferred since session 11 |
| 6.2 | ZIP extraction for bulk upload | ⬜ | Unzip → batch-parse each CV |
| 6.3 | Experience relevance classification (LLM) | ⬜ | Port exists (`ICvParserService`), not wired to UI |
| 6.4 | Advanced recruiter filtering dashboard | ⬜ | Language level, business area, score range filters in HR candidate list |
| 6.5 | Candidate tagging system | ⬜ | `candidate_tags` table exists; UI missing |
| 6.6 | Candidate contact quick-view button | ⬜ | Small popover on candidate list row |
| 6.7 | Candidate detail manual edit + notes UI | ⬜ | Notes API exists; full edit UI missing |

---

## Phase 7 — Analytics & Bias Detection

| # | Task | Status | Notes |
|---|---|---|---|
| 7.1 | Recruitment analytics dashboard (funnels, score distributions, time metrics) | ⬜ | `SupabaseAnalyticsRepository` exists; UI page needed |
| 7.2 | Bias detection — score distribution by location/gender | ⬜ | Statistical analysis; use `simple-statistics` npm package |
| 7.3 | Adverse impact ratio (4/5ths rule) | ⬜ | EEOC standard calculation |
| 7.4 | Blind mode toggle (hide name, location, institution) | ⬜ | HR dashboard toggle |
| 7.5 | Fairness report export (PDF/on-screen) | ⬜ | Charts + anomaly flags |

---

## Phase 8 — Finalization & Demo

| # | Task | Status | Notes |
|---|---|---|---|
| 8.1 | API integration tests (Vitest) | ⬜ | CV upload, parsing, assessment creation |
| 8.2 | E2E tests: upload → parse → list flow (Playwright) | ⬜ | 5-8 critical demo flows |
| 8.3 | Synthetic dataset generation (200–500 CVs) | ⬜ | Needed for demo realism |
| 8.4 | CSV/PDF export (candidate lists, profiles, assessment results) | ⬜ | Export use case exists; PDF endpoint missing |
| 8.5 | Performance optimization (pagination, lazy loading) | ⬜ | Profile after dataset added |
| 8.6 | Architecture diagrams update | ⬜ | Reflect Supabase migration |
| 8.7 | Demo preparation | ⬜ | Dry-run all 5 demo flows |

---

## Manual / Ops Tasks

| # | Task | Status |
|---|---|---|
| M.1 | Set `INTERVIEW_BACKEND_URL` in Vercel env vars | ⬜ |
| M.6 | Run Phase 4 DB migration (`20260414000000_add_interview_mode.sql`) in Supabase SQL editor | ⬜ |
| M.7 | Run Phase 4b DB migration (`20260415000000_add_skill_verification.sql`) in Supabase SQL editor | ⬜ |
| M.2 | Create `talent-pool` bucket in Supabase Storage dashboard | ✅ | Auto-created by `ensureBucket()` on first upload |
| M.3 | Configure Google OAuth consent screen in Google Cloud Console | ⬜ |
| M.4 | Add `https://adidas-pool.vercel.app` to Supabase Auth URL allowlist | ✅ |
| M.5 | Confirm HTTPS + browser permissions for camera/mic in production | ⬜ |

---

## Completed

| # | Task | Session |
|---|---|---|
| C.1 | Project scaffold (Next.js 16 + TypeScript + Tailwind + shadcn/ui) | S4 |
| C.2 | Onion Architecture refactor (4 layers, DI, composition root) | S5 |
| C.3 | Role-based navigation (Candidate / HR) | S8 |
| C.4 | Job scraper (Cheerio, all pages from adidas careers portal) | S9 |
| C.5 | Candidate job application workflow | S9 |
| C.6 | HR Notifications system | S10 |
| C.7 | Vercel deployment | S10 |
| C.8 | CV upload + text extraction (unpdf / mammoth) | S11 |
| C.9 | LLM-based CV parsing (Groq primary, OpenAI fallback + Zod) | S11 |
| C.10 | Deduplication engine | S11 |
| C.11 | Unit tests — 56 tests across 6 files | S11 |
| C.12 | CV parsed data preview + inline editing | S12 |
| C.13 | Motivation letter upload | S12 |
| C.14 | Job/Internship management (JobType, InternshipStatus, Erasmus) | S13–S14 |
| C.15 | AI Interviewer frontend + FastAPI backend integration | S? |
| C.16 | Proctoring events (camera, tab switch detection) | S? |
| C.17 | Supabase full migration — Auth, DB, Storage (Steps 1–7) | 2026-04-13 |
| C.18 | Prisma fully removed from codebase | 2026-04-13 |
| C.19 | Google OAuth wired into candidate dashboard (user_id → candidate) | 2026-04-13 |
