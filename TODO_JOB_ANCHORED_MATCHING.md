# Job-Anchored Matching — TODO

> Checklist for implementing the plan in [`docs/JOB_ANCHORED_MATCHING_PLAN.md`](docs/JOB_ANCHORED_MATCHING_PLAN.md).
> Phases are ordered so each one is independently deployable.

---

## Phase 0 — Stop misleading HR (ship first, small, safe)

- [ ] Relabel the candidates-evaluation table columns: rename score badge to **"Quality"** with tooltip *"profile completeness · not a hiring signal; use Match Jobs for job fit"*.
- [ ] In the Match Jobs dialog, **hide** criteria whose `applicable === false` instead of showing them as `100`. (Today Experience/Language/Education/Skills all show `100` for scraped jobs — misleading.)
- [ ] Add an empty-state banner to the Match Jobs dialog when fewer than N criteria are applicable: *"This job has limited structured requirements. Match quality will improve as we enrich job descriptions."*
- [ ] Update `AppReport/06_Features_Implementation.md` section on Candidates Evaluation to note the rubric's current meaning ("quality, not fit").

## Phase 1 — JD body scraping + LLM extraction

- [ ] Add `parsed_requirements JSONB` + `parsed_requirements_version INT` columns on `jobs`. Migration file under `supabase/migrations/`.
- [ ] Extend `adidas-job-scraper.service.ts` to fetch the JD body HTML at `source_url` (respect `FETCH_DELAY_MS`).
- [ ] Strip boilerplate from JD HTML → plain text for LLM input.
- [ ] Define Zod schema for `JobRequirements`:
  - `fieldsOfWork: string[]` (subset of the 16)
  - `seniorityLevel: "INTERN" | "JUNIOR" | "MID" | "SENIOR" | "LEAD" | "DIRECTOR" | null`
  - `minYearsInField: number | null`
  - `requiredSkills: string[]`
  - `preferredSkills: string[]`
  - `requiredLanguages: { language: string; cefr: string | null }[]`
  - `requiredEducationLevel: string | null`
  - `responsibilitiesSummary: string | null`
  - `rawExtractionModel: string` + `rawExtractionTimestamp: string`
- [ ] Build `JobRequirementsExtractorService` in infrastructure (Groq primary, OpenAI fallback). Prompt: *"Extract structured hiring requirements. Return every numeric field as `null` if not explicitly stated. Do not invent."*
- [ ] Persist parsed output on scrape; skip jobs already parsed with matching `source_url` hash.
- [ ] One-off backfill script (`scripts/backfill-job-requirements.ts`) for existing jobs.
- [ ] Unit tests: 3-4 real JD samples → verify extractor pins to the schema (no invention).

## Phase 2 — CV → per-experience Field of Work tags

- [ ] Add `fields_of_work TEXT[]` on `experiences` (migration).
- [ ] Extend the existing CV parser LLM call to emit `fieldsOfWork[]` per experience.
- [ ] Backfill script for existing candidates; runs in batches, writes progress to a `parsing_jobs` row.
- [ ] Repository method: `CandidateRepository.findExperienceVectorByField(candidateId)` → `{ [field]: years }`.
- [ ] Unit tests: a CV with 3 experiences tags each correctly to one or more of the 16 fields.

## Phase 3 — Refactor match engine to job-anchored scoring

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
