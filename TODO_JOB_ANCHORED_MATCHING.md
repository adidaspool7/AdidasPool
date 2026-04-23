# Job-Anchored Matching — TODO

> Checklist for implementing the plan in [`docs/JOB_ANCHORED_MATCHING_PLAN.md`](docs/JOB_ANCHORED_MATCHING_PLAN.md).
> Phases are ordered so each one is independently deployable.

---

## Phase 0 — Stop misleading HR (ship first, small, safe)

- [x] Relabel the candidates-evaluation table columns: rename score badge to **"Quality"** with tooltip *"profile completeness · not a hiring signal; use Match Jobs for job fit"*.
- [x] ~~In the Match Jobs dialog, **hide** criteria whose `applicable === false`~~ — N/A, dialog deleted in `0919b0f`.
- [x] ~~Add an empty-state banner to the Match Jobs dialog~~ — N/A, dialog deleted.
- [ ] Update `AppReport/06_Features_Implementation.md` section on Candidates Evaluation to note the rubric's current meaning ("quality, not fit").

## Phase 1 — JD body scraping + LLM extraction

- [x] Add `parsed_requirements JSONB` + `parsed_requirements_version INT` columns on `jobs`. Migration file under `supabase/migrations/`.
- [x] Extend `adidas-job-scraper.service.ts` to fetch the JD body HTML at `source_url` (respect `FETCH_DELAY_MS`).
- [x] Strip boilerplate from JD HTML → plain text for LLM input.
- [x] Define Zod schema for `JobRequirements` (9 unit tests).
- [x] Build `JobRequirementsExtractorService` in infrastructure (Groq primary, OpenAI fallback).
- [x] Persist parsed output via `parsePendingJobRequirements(limit, delayMs)` use case; skip jobs already parsed (via `findUnparsedJobs`).
- [x] One-off backfill script (`scripts/backfill-job-requirements.ts`) for existing jobs.
- [x] Unit tests for the schema (LLM calls deliberately not mocked — schema enforces the contract).
- [x] Smoke test against 5 real JD samples — 5/5 valid output after tolerance fix (`73ae3d4`).
- [x] **Tolerance fix**: `fieldsOfWork` now silently drops LLM-invented values outside the canonical 16 instead of rejecting the whole extraction (`73ae3d4`).

### Decision — parsing strategy: **on-demand, not bulk** (2026-04-23)

We deliberately do **NOT** run the full 1,300+ job backfill. Rationale:

- **Cost waste.** Most scraped jobs are never opened by HR; parsing them all burns Groq/OpenAI quota for no value.
- **Freshness.** Lazy parse reads the latest JD at the moment HR cares; bulk parse can go stale.
- **Operational simplicity.** No cron, no half-finished batch state to reason about.

**Chosen flow** (to be wired in Phase 3):

1. HR syncs jobs the way they do today — scraper only writes the listing metadata.
2. When HR opens a job's "Match candidates" view and `parsed_requirements IS NULL`
   (or `parsed_requirements_version < current`), the matcher parses **that one job
   inline** (~2-4 s first-click latency behind a spinner), caches the result in the
   DB, and proceeds to score candidates.
3. Subsequent opens are instant — served from cache.
4. **Invalidation:** if `bulkUpsertByExternalId` updates an existing job and the
   `source_url` changed, null out `parsed_requirements` so the next open re-parses.

**Kept (not thrown away):**
- `scripts/backfill-job-requirements.ts` — ops/dev tool for demo warming or re-parsing
  after a schema-version bump. Not part of normal workflow.
- `IJobRepository.findUnparsedJobs` + `updateParsedRequirements` — reused by Phase 3
  "parse-if-missing" wrapper.

### Phase 1.5 — Lazy-parse plumbing (folded into Phase 3)

Deferred into Phase 3 where it fits naturally with the new matcher wiring:

- [ ] `JobUseCases.getOrParseRequirements(jobId)` — returns the parsed JSON, parsing
  inline if missing. Used by the job-anchored matcher.
- [ ] In `bulkUpsertByExternalId`, detect `source_url` change on existing rows and
  null `parsed_requirements` + `parsed_requirements_version`.
- [ ] Schema-version gate: treat rows with `parsed_requirements_version <
  JOB_REQUIREMENTS_SCHEMA_VERSION` as unparsed.

## Phase 2 — CV → per-experience Field of Work tags

- [x] Add `fields_of_work TEXT[]` on `experiences` (migration — `20260423000001_experience_fields_of_work.sql`).
- [x] Extend the existing CV parser LLM call to emit `fieldsOfWork[]` per experience.
- [x] Backfill script for existing candidates (`scripts/backfill-experience-fields.ts`) — targeted classifier, tolerant to LLM invention (unknown fields dropped). Runs in batches, per-candidate, throttled.
- [x] Repository method: `CandidateRepository.findExperienceVectorByField(candidateId)` → `Record<field, years>`.
- [x] Unit tests: `tests/cv-fields-of-work.test.ts` (5 tests) covering canonical input, LLM omission, tolerance to invented values, case-insensitive matching, malformed input.

## Phase 3 — Refactor match engine to job-anchored scoring

- [ ] **Lazy-parse wrapper** (from Phase 1.5): `JobUseCases.getOrParseRequirements(jobId)` — parse inline if missing or stale schema version; cache in DB.
- [ ] **Sync invalidation** (from Phase 1.5): `bulkUpsertByExternalId` nulls `parsed_requirements` when `source_url` changes on an existing job.
- [ ] Replace `MatchInput.job` typing: inputs come from `parsed_requirements`, not raw scraped columns.
- [ ] Replace `candidate.yearsOfExperience` with `candidate.experienceByField: Record<string, number>` in `MatchInput`.
- [ ] Rewrite `matchField` to accept `job.fieldsOfWork[]` (multiple) and score as an intersection count against the candidate's field vector.
- [ ] Rewrite `matchExperience` to read `job.minYearsInField` against the candidate's years in that specific field.
- [ ] Add `matchSeniority` — compare `job.seniorityLevel` against a computed candidate seniority (helper in the domain layer).
- [ ] Omit criteria from breakdown entirely when `applicable === false` (visual change in the dialog).
- [ ] Keep the `applicable`-aware average from `849782e`.
- [ ] Expand `tests/matching.test.ts` with fixtures for structured JDs.

## Phase 4 — Quality vs Fit, bidirectional views

- [ ] Rename the existing candidate score badge to **Quality** in the evaluation page UI.
- [ ] Add a second column **Fit (for …)** that is blank until HR picks a job.
- [ ] New page: `/dashboard/jobs/[id]/match-candidates` — ranks all candidates against one job. Uses the same `fit(candidate, job)` primitive.
- [ ] Add "Rank candidates for this job" CTA on the job detail page.
- [ ] Candidates Evaluation tabs: **All** (recency / Quality) and **Rank for a job** (pick one, then Fit).
- [ ] Cache results in `job_matches` (already in schema) — batch recompute on job create + candidate profile change.

## Phase 5 — Delete dead code & misleading surfaces

- [ ] Delete or hide any route / component that still shows a "universal match score" without a job context.
- [ ] Remove `experienceScore` from `MatchInput` if no criterion reads it after Phase 3.
- [ ] Remove the `candidates.match_score` table column if it is no longer written (confirm not referenced anywhere — audit with grep before dropping).
- [ ] Update `CLAUDE.md` + `AppReport/*.md` to reflect the new model.

## Documentation tasks (alongside each phase)

- [ ] `AppReport/04_Architecture_Design.md` — add a subsection describing the `fit(candidate, job)` pure-function primitive.
- [ ] `AppReport/05_Database_Design.md` — add `jobs.parsed_requirements` + `experiences.fields_of_work`.
- [ ] `AppReport/06_Features_Implementation.md` — split "Candidate Evaluation" vs "Job Matching" sections with the new semantics.
- [ ] `AppReport/07_API_Documentation.md` — document `/api/jobs/[id]/match-candidates`.
- [ ] `docs/USER_GUIDE.md` — rewrite HR workflow to "open a job → see ranked candidates" flow.

## Definition of done (whole initiative)

- A scraped adidas job has structured requirements on arrival.
- A candidate's experiences are tagged per Field of Work.
- HR can open any job and see a shortlist whose criteria map to real JD lines.
- No part of the UI shows a match score that averages "no requirement" as 100.
- `Quality` and `Fit` are visually distinct and labeled.
- Docs reflect the new model.
