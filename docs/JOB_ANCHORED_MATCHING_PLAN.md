# Job-Anchored Matching — Plan & Design Notes

> **Status:** Proposed · **Owner:** Stratos · **Date:** 2026-04-23
> **Supersedes:** The "universal candidate score" + candidate→jobs matching shipped in commits `b972f85`, `c0818af`, `849782e`, `c1047ca`.

---

## 1. Why we're redesigning

### 1.1 What exists today

Two separate scoring systems live side by side:

1. **Candidates Evaluation score** (`candidates.experience_score`, education score, location score, language score). Computed per candidate, **against an implicit universal rubric** — "good experience", "good education", "high CEFR". No job is the referent.
2. **Job Matching score** (`job_matches.match_score` + breakdown). Candidate × specific job comparison over Work Field, Location, Language, Experience, Education, Skills.

### 1.2 Why the current model does not work

- **The universal candidate score has no referent.** A "92" means "looks employable in the abstract", not "fits a specific role". HR cannot act on it.
- **Scraped adidas jobs carry almost no structured requirements.** Only `title`, `department`, `location`, `country`, `source_url` are populated. `required_language`, `min_years_experience`, `required_education_level`, `required_skills` are empty → 4 of the 6 match criteria always fall into the "no requirement" branch and are either shown as a misleading `100` or excluded entirely.
- **"Years of experience" is total career time**, not *time in the role's field*. A 9-year drone pilot scores the same as a 9-year SAP consultant when matched against an SAP Solution Architect role.
- **The `experience_score` from the candidate evaluator is passed into the match engine but never read** by any scoring function. Signal wasted.
- **End result for HR:** everyone lands at 50% or 95% with no meaningful differentiation. The tool gives a ranked list that doesn't help shortlist.

### 1.3 What the new model does

**Jobs become the anchor.** Matching is always candidate × specific job. There is no universal candidate score. The "Candidates Evaluation" page stops pretending candidates can be ranked in isolation.

- Job Description body is fetched during scraping and parsed by an LLM into structured requirements (skills, seniority, min years in field, responsibilities). This is the non-negotiable enabler — without it, any scoring system is guessing.
- Candidate CV parsing buckets each experience / degree / skill into one of the 16 adidas Fields of Work. Candidate experience becomes a **vector per field** (`{Technology: 2.5y, Data: 1y, ...}`), not a single top-level guess.
- Scoring function takes `(candidate, job)` → ranked list, in either direction.
- HR workflow pivots from "browse candidates" to "open a job, see your shortlist".

---

## 2. Design decisions & rationale

### 2.1 Quality vs Fit — keep both, label them honestly

- **Quality score** (derived from current evaluator): profile completeness, English level, education level, CV richness. Answers *"is this candidate credible?"*. Useful as a prefilter. Not a hiring signal on its own.
- **Fit score** (new, job-anchored): candidate × specific job. Answers *"does this credible candidate fit this role?"*. This is the hiring signal.
- In the candidates table: `Quality 85 · Fit (SAP IBP) 62`. HR can sort by either. The high-quality / low-fit pair flags "good talent, wrong role — consider for other openings". Low-quality / high-fit flags "suspicious profile" (possible keyword-stuffed CV).

### 2.2 Candidates Evaluation page — two tabs

- **"All candidates"** — default. Sorted by recency or Quality score. No job-specific fit shown.
- **"Rank for a job"** — HR picks a job (dropdown or paste adidas URL), page recomputes Fit scores against that job, results are cached in `job_matches` for later reuse.

### 2.3 Scoring primitive is `fit(candidate, job)` — bidirectional by design

Once the primitive exists, both views fall out for free:
- `/candidates/[id]/match-jobs` — fixed candidate, rank all open jobs.
- `/jobs/[id]/match-candidates` — fixed job, rank all candidates. **HR needs this more than the other.**

### 2.4 Job Description parsing — on scrape, cached

- During `adidas-job-scraper.service.ts` run, fetch the JD HTML body at `source_url`.
- Run an LLM extraction pass (Groq Llama 3.3 70B, fallback OpenAI) to produce a `JobRequirements` JSONB structure.
- Store alongside the job row. Never re-parse unless `source_url` changes.
- Cost: ~2k tokens in / ~300 out per job → fractions of a cent. One-time per job.

### 2.5 CV parsing — bucket experiences into Fields of Work

- Current: `bizArea.primary / secondary / customArea` — one top-level guess per candidate.
- New: each `experiences` row carries a `fields_of_work[]` tag (zero, one, or many of the 16). The candidate's per-field total is a sum of years across tagged experiences.
- Same LLM pass that already runs on CV upload; add a classification output. Backfill existing candidates with a batch job.

### 2.6 Scoring function — honest, explainable, job-grounded

Criteria (all driven by parsed JD requirements, not guesses):

| Criterion | Source on job | Source on candidate | Weight |
|---|---|---|---|
| Field of Work | parsed `fields_of_work` | per-experience tags | high |
| Country | scraped `country` | candidate profile | hard filter (unless willingToRelocate) |
| Field-specific experience (years) | parsed `min_years_in_field` | sum of field-tagged experiences | high |
| Seniority | parsed seniority level | computed from career trajectory | high |
| Must-have skills | parsed `required_skills` | CV skills + experience text | high |
| Nice-to-have skills | parsed `preferred_skills` | CV skills + experience text | low |
| Languages | parsed required languages + CEFR | `candidate_languages` + verified assessments | medium |
| Education | parsed education level | highest education level | medium |

- Criteria with no data on the job side are **omitted from the breakdown entirely** (not shown as misleading 100s).
- Each shown criterion maps to a real line in the JD and can be quoted back to HR ("JD says: *'5+ years SAP IBP'* — candidate has 0y in SAP IBP").

### 2.7 Performance

- `fit(candidate, job)` is pure and cheap once inputs are structured.
- `job_matches` table keeps the `(candidate_id, job_id) → score + breakdown` cache. Already in place.
- Batch recompute when: (a) a new job is scraped, (b) a candidate's parsed profile changes, (c) HR explicitly re-runs.
- `bulkUpsertMatches` + `findAllForMatching` optimizations from `c1047ca` stay.

### 2.8 What we are deleting

- The current "universal" match engine's 6-criterion breakdown (Work Field, Location, Language, Experience, Education, Skills) **stays in code** but criteria get rewired to read from structured JD requirements + per-field candidate experience. It's not a rewrite from scratch; it's a refactor of inputs.
- The "Match Jobs" dialog on the candidate page **stays** — it's the candidate→jobs view. UI keeps working while the inputs get smarter.
- **`candidate_match_score`, `candidate_experience_score`, etc. displayed on the evaluation page get relabeled "Quality" and are no longer presented as hiring signal.**

---

## 3. Risks & trade-offs

| Risk | Mitigation |
|---|---|
| LLM hallucination on JD parsing (invents "5 years required" when the JD says nothing) | Force structured JSON output with a strict Zod schema; require every numeric field to be nullable; store raw JD body alongside parsed output for audit. |
| LLM cost on large job scrape runs | **Parsing is on-demand, not bulk.** When HR opens a job's match view, the matcher parses that one job inline (~2-4 s) and caches forever in `jobs.parsed_requirements`. 1,300 scraped jobs do NOT get parsed up front. Invalidated only when the scraper sees a changed `source_url`. Backfill script retained as an ops/demo tool. (Decided 2026-04-23.) |
| CV re-parsing for existing candidates | Background job with a progress UI; existing candidates without field-tagged experiences fall back to today's `primaryBusinessArea` behavior (no regression). |
| HR confusion during transition (two scores shown) | Clear labels: `Quality` (profile) vs `Fit (for role X)`. Changelog entry + one-line tooltip. |
| Scraper rate limiting when fetching JD bodies | Reuse the existing `FETCH_DELAY_MS` throttle; JD fetch runs in the same scrape pass. |

---

## 4. Non-goals (for this phase)

- We are **not** building our own job board. adidas careers remains the source of truth.
- We are **not** replacing the candidate evaluator. It stays, becomes the "Quality" signal.
- We are **not** auto-inviting candidates. HR still clicks invite. This plan is about making the ranked list accurate.
- We are **not** adding multi-tenant support, ML training, or feedback loops in this phase.

---

## 5. Rollout order

The work splits into independent phases. Each phase is deployable on its own and leaves the app in a working state.

### Phase 0 — Remove the misleading current flow (small, safe)
Delete / hide UI that shows the universal candidate score as a hiring signal. Keep the match engine running but relabel.

### Phase 1 — JD body scraping + LLM extraction
Add the plumbing to fetch a single JD's body and LLM-extract its structured requirements into `jobs.parsed_requirements`. **Parsing is invoked lazily** from Phase 3's matcher — NOT run in bulk over the whole job pool. The backfill script exists but is not part of the regular flow; it is kept for demo warming and schema-version migrations. **Highest-leverage single change.**

### Phase 2 — CV parsing → per-experience Field of Work tags
Extend CV parser to tag each experience with one or more of the 16 fields. Backfill existing candidates. Candidate `experienceByField[]` derived view available for matcher.

### Phase 3 — Refactor match engine to job-anchored scoring
Rewire existing criteria to read structured JD + per-field candidate vectors. Drop "no requirement" filler. Add Seniority criterion.

### Phase 4 — Quality vs Fit in the candidates list
Two-column display. Tabs on the evaluation page. `/jobs/[id]/match-candidates` route for the reverse view.

### Phase 5 — Remove dead code
Drop the "Match Jobs" flow paths that are no longer reachable. Clean up `experience_score` usage that doesn't feed anywhere.

---

## 6. Deferred / future ideas (noted, not on the roadmap)

- HR feedback loop: thumbs up/down on a match retrains the weights.
- Candidate-facing "why didn't I match?" explainer (requires careful UX to avoid perceived bias).
- Multi-field seniority (e.g. "Senior in Tech, Junior in Sales").
- Compare mode: one candidate across 3 jobs side by side.
- Auto-suggest "near miss" candidates — would match except for one criterion.

---

## 7. Related documents

- [`docs/talent_intelligence_language_verification_platform_spec.md`](talent_intelligence_language_verification_platform_spec.md) — original spec
- [`docs/CV_PARSING_IMPROVEMENT_PLAN.md`](CV_PARSING_IMPROVEMENT_PLAN.md) — CV parser strategy
- [`TODO_JOB_ANCHORED_MATCHING.md`](../TODO_JOB_ANCHORED_MATCHING.md) — checklist of concrete tasks

---

## 8. Architectural notes for future maintainers

- The scoring primitive is a **pure function** in `src/server/domain/services/matching.service.ts`. All I/O (fetching JDs, calling LLMs, reading DB) happens in infrastructure / use cases. Keep it pure.
- Never put "tie-break" logic in the UI. If HR needs a different default sort, change the sort criterion in the use case.
- Structured JD parsing output is **immutable audit data**. If the LLM prompt changes, re-parse into a new column or a versioned JSON; do not overwrite historical parses.
- "Not applicable" criteria must **not** be shown as a score. Either show them greyed out with "no requirement on JD" or hide entirely. Today's `100` badges for empty criteria were the #1 source of HR confusion.
