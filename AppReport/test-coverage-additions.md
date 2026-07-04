# Test Coverage Additions — Tracking Log

> Purpose: record the unit tests added to raise automated coverage of the
> TalentHub codebase, so the corresponding claims in the LaTeX report
> (Chapter 6 §val-unit, Chapter 6 intro, Chapter 7 §concl-limitations) can be
> updated to cite **true, current** numbers. Excludes the AI interviewer
> backend (out of scope — separate FastAPI service).

_Last updated: 2026-07-04_

---

## 1. Headline movement

| Scope | Before | After |
|---|---|---|
| **`application/use-cases`** (stmt / lines) | 22.57% / 23.11% | **84.39% / 85.69%** |
| **`server/application`** (incl. DTOs + errors) | 63.73% / 63.41% | **79.12% / 80.48%** |
| **`lib/auth`** (server auth gate) | 42.85% / 42.85% | **100% / 100%** |
| `domain/services` (stmt / lines) | 91.02% / 96.15% | 91.02% / 96.15% (unchanged) |
| **Global** (stmt / lines) | ~24.25% / 24.94% | **45.45% / 46.89%** |
| Total passing tests | ~385 | **520** |

The Application layer went from barely-covered to ~85% line coverage, its DTOs
and error types to ~96%/100%, and the server-side auth gate to 100%. This makes
the report's claim that the suite exercises *"the Domain **and** the Application"*
layers factually accurate rather than aspirational.

---

## 2. Current coverage by layer (v8, `npx vitest run --coverage`)

| Layer / folder | % Stmts | % Branch | % Funcs | % Lines |
|---|---|---|---|---|
| `server/domain/services` | 91.02 | 76.12 | 98.27 | **96.15** |
| `server/application/use-cases` | 84.39 | 73.11 | 80.11 | **85.69** |
| `server/application` (DTOs + errors) | 79.12 | 86.53 | 85.71 | **80.48** |
| `lib/auth` (server auth gate) | 100 | 80 | 100 | **100** |
| `infrastructure/security` (interview token) | 89.28 | 89.47 | 87.5 | 89.28 |
| `infrastructure/extraction` (CV text) | 73.91 | 62.5 | 80 | 73.91 |
| `infrastructure/logging` | 71.42 | 64.51 | 72.72 | 74.46 |
| `infrastructure/scraping` | 35.08 | 30.97 | 25 | 33.11 |
| `infrastructure/database` (thin Supabase repos + pure `db-utils`) | 2.52 | 3.07 | 4.34 | 2.71 |
| **All files** | **45.45** | 43.11 | 42.5 | **46.89** |

> `infrastructure/database` stays low because it is dominated by thin Supabase
> repositories (deliberately untested); the **pure** helpers in `db-utils.ts`
> (`camelizeKeys`/`snakeifyKeys`/`assertNoError`/`generateId`) are now fully
> covered — they just represent a small slice of that large folder.

---

## 3. Per-file coverage — `application/use-cases`

| Use case | % Lines | Notes |
|---|---|---|
| `analytics.use-cases.ts` | 100 | dashboard fan-out |
| `export.use-cases.ts` | 100 | CSV mapping |
| `segment.use-cases.ts` | 100 | segment CRUD + members |
| `dashboard-widget.use-cases.ts` | ~100 | spec validation + CRUD |
| `notification.use-cases.ts` | 91.04 | campaigns, targeting, preferences |
| `candidate.use-cases.ts` | 87.5 | list/update/delete, status notifications |
| `assessment.use-cases.ts` | 85.71 | create + magic link (interview eval excluded) |
| `job.use-cases.ts` | 86.52 | CRUD, sync, lazy-parse, matching |
| `upload.use-cases.ts` | 84.84 | CV pipeline, bulk jobs, doc uploads |
| `ambassador.use-cases.ts` | 85.36 | programs + applications |
| `application.use-cases.ts` | 82.75 | apply / withdraw / status |
| `hr-profile.use-cases.ts` | 72.22 | profile + activity log |
| `profile.use-cases.ts` | 77.46 | candidate resolution + profile edits |

---

## 4. New / extended test files

All under `tests/`. All passing, all type-checked clean (`get_errors`).

| File | Use case under test | Focus |
|---|---|---|
| `candidate-use-cases.test.ts` (new) | `CandidateUseCases` | list filters/sort, AMBASSADOR exclusion, get/find, status-change notifications (fires for HR statuses, not system), update-with-relations, add-note validation, delete + best-effort blob cleanup |
| `notification-use-cases.test.ts` (new) | `NotificationUseCases` | delegations, per-job targeting with preferences, campaign lifecycle transitions, send/preview audience, segment restriction |
| `ambassador-use-cases.test.ts` (new) | `AmbassadorUseCases` | program CRUD guards, application status validation, submit (marks source AMBASSADOR + tag) |
| `segment-use-cases.test.ts` (new) | `SegmentUseCases` | create/rename validation + trim, add/remove members |
| `export-use-cases.test.ts` (new) | `ExportUseCases` | CSV header/row mapping, null coalescing, empty-list behaviour |
| `dashboard-widget-use-cases.test.ts` (new) | `DashboardWidgetUseCases` | spec validation on read/write, title trim, position derivation, CRUD |
| `profile-use-cases.test.ts` (new) | `ProfileUseCases` | 3-way candidate resolution (user_id / email-claim / auto-create), profile update transforms + HR notification, CV/profile deletion (mocks Supabase auth) |
| `job-use-cases.test.ts` (new) | `JobUseCases` | list delegations, create/update/delete guards, preference-aware posting notifications, sync reconciliation (full vs partial), lazy-parse + force-reparse, `JobClosedError`, pending-parse worker, candidate matching |
| `application-use-cases.test.ts` (new) | `ApplicationUseCases` | apply / re-apply / already-applied, withdraw + dual notifications, status-change notification |
| `hr-profile-analytics-use-cases.test.ts` (new) | `HrProfileUseCases`, `AnalyticsUseCases` | auto-create profile, update, activity log, analytics fan-out |
| `assessment-use-cases.test.ts` (new) | `AssessmentUseCases` | list delegation, create + magic link + INVITED status + best-effort notification |
| `upload-use-cases.test.ts` (extended) | `UploadUseCases` | added: ambassador video validation, parsing-job management (get/recent/cancel/recover/delete), bulk-upload phases, motivation letter + learning agreement uploads |

### 4a. Phase C — pure-logic + auth-gate additions

Beyond the use-case layer, three high-signal targets outside `use-cases/` were
added (pure transforms, boundary validation, and the security gate):

| File | Under test | Focus |
|---|---|---|
| `db-utils.test.ts` (new) | `camelizeKeys` / `snakeifyKeys` / `assertNoError` / `generateId` | snake↔camel conversion, ISO→Date coercion, **JSONB non-recursion** edge case, null/array passthrough, contextualized DB error throwing, UUID format |
| `dtos.test.ts` (new) | `CvExtractionSchema`, `CreateJobSchema`, `UpdateJobSchema`, `CandidateFilterSchema`, `CreateAssessmentSchema`, error types | free-text language→CEFR mapping, business-area normalization + customArea fallback, `estimatedTotalYears` clamp/round, tolerant `fieldsOfWork` preprocess, email-or-empty `mentorEmail`, filter defaults + score bounds, assessment expiry bounds, `WidgetSpecValidationError` / `DuplicateSkipError` shape |
| `resolve-caller.test.ts` (new) | `resolveCaller` (server auth gate) | 401 no-session, HR role, candidate role (linked `candidateId` set / null), 403 authenticated-but-no-role — mocks Supabase server client + candidate use-case singleton |
| `require-hr.test.ts` (new) | `requireHr` (HR-only route guard) | 401 no-session, 403 non-HR / no-role, HR identity resolution + display-name fallback chain (email → metadata name → full_name → undefined) — mocks Supabase server client |

---

## 5. Methodology (why this was cheap and high-signal)

- **Onion architecture** — every use case receives its dependencies (repository
  and service *ports*) via the constructor. Tests inject in-memory `vi.fn()`
  mocks, so **no database, LLM, or network is touched**. Fast and deterministic.
- **Pure domain services** (`computeJobFit`, scoring, requirements schema) run
  for real inside the use-case tests — no mocking needed, since they have zero
  external dependencies.
- **Risk-proportional testing** — thin infrastructure adapters
  (`infrastructure/database` Supabase repos, AI/email/storage clients) are left
  largely untested on purpose: they are mostly declarative query construction
  with little branching, are brittle to test in isolation, and are exercised
  indirectly. Effort was concentrated where the decision logic lives — including
  the **pure** transforms (`db-utils`), **boundary validation** (Zod DTOs), and
  the **security gate** (`resolveCaller`), even where those sit physically inside
  the infrastructure/lib folders.

---

## 6. Intentionally out of scope

- **AI interviewer backend** (`ai_interviewer_backend/`, FastAPI) — separate
  service, not part of this test effort.
- **`infrastructure/database`** — thin Supabase repositories (0.2% lines).
- **`lib/supabase`** — client factory wiring.
- **`infrastructure/scraping`** — network-bound HTML scraping (33% lines;
  the pure `escapeOrTerm` helper and job-scraper parsing are separately tested).

---

## 7. Report sections updated with these numbers — DONE (2026-07-04)

- **Chapter 6 §val-unit (`ch6/chapter6.tex`)** — DONE. Suite counts updated to
  **33 files / 527 cases**; the inventory table (`tab:test-inventory`) now lists
  all 33 files; added a new **`Coverage by Layer`** subsubsection with a
  per-layer coverage table (`tab:coverage-layer`) **and** a pgfplots horizontal
  bar chart of line coverage per layer (`fig:coverage-by-layer`).
- **Chapter 7 §concl-limitations (`ch7/chapter7.tex`)** — DONE. Reworded to cite
  527 cases and 80–100% line coverage across domain/application/auth layers,
  with infrastructure adapters thin by design.
- **Frontmatter (`frontmatter.tex`)** and **Chapter 3 (`ch3/chapter3.tex`)** —
  DONE. Stale "305 tests / 18 files" references updated to "527 tests / 33 files".

Coverage figures used (V8 provider, line %): domain services 96.2, auth guards
100, application use-cases 85.7, DTOs & errors 80.5, security token 89.3,
logging 74.5, extraction 73.9, scraping 33.1, data repositories 2.7, global 46.9.

