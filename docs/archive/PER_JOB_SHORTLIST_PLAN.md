# Per-Job Shortlist Plan

> **Status**: 🗄️ **ARCHIVED 2026-05-08** — Implemented ✅. See `## Per-Job Shortlist` in [CLAUDE.md](../../CLAUDE.md) for the live spec (`job_shortlists` table, 4 endpoints, tabs UI, tests). This file is kept as design history only.
> **Original status**: Proposal — awaiting approval before implementation
> **Scope**: Replace/augment the global "starred candidate" boolean with proper per-job shortlists
> **Owner**: Stratos
> **Last updated**: 2026-05-01
> **Trigger**: Client feedback — current shortlist is global ("interesting to HR"), but real-world recruiting requires shortlists tied to specific job openings.

---

## 1. Current state (as of 2026-05-01)

The existing shortlist is a single boolean column on `candidates`:

- **Schema**: `candidates.shortlisted BOOLEAN DEFAULT false` (added by `scripts/run-sql.js`).
- **UI footprint** (intentionally small, ~3 surfaces):
  1. Star toggle on each row of `/dashboard/candidates`
     ([src/app/dashboard/candidates/page.tsx](../src/app/dashboard/candidates/page.tsx) — `toggleShortlisted()` ~L658)
  2. "⭐ Shortlisted" filter in the same page's status dropdown (~L929)
  3. Analytics card "Shortlisted" — `COUNT(*) WHERE shortlisted = true`
     ([src/server/infrastructure/database/analytics.repository.ts](../src/server/infrastructure/database/analytics.repository.ts#L130))
- **API**: `PATCH /api/candidates/[id]` body `{ shortlisted: bool }`.
- **Filter wiring**: `findAll()` repo accepts `shortlisted?: boolean`; filter exposed via `GET /api/candidates?shortlisted=true`.
- **CSV export**: includes `shortlisted: yes/""` column.

**Distinct from**: the `application_status` enum value `SHORTLISTED`. That belongs to the application-lifecycle pipeline (a candidate who applied has been advanced to finalist). It is unrelated to this plan and stays untouched.

### Why this is a problem
"Shortlisted" today means "someone an HR user found interesting in general", with no link to a job. In real recruiting, a shortlist is always *for a role*. Two different roles → two different shortlists, even if some candidates appear in both.

---

## 2. Recommended approach — phased and additive

The boolean has a tiny blast radius (1 column, 1 toggle, 1 filter, 1 analytics query, 1 CSV cell). We can add the per-job shortlist *alongside* it without rewriting anything. The legacy boolean gets reframed as a "Watchlist" — HR's personal global favourites — which is genuinely useful and how Lever/Workable model the same distinction.

### Two clean concepts after the change

| Concept | Storage | Meaning | Surface |
|---|---|---|---|
| **Watchlist** (was "Shortlist") | `candidates.shortlisted BOOLEAN` | Global, HR-personal "interesting profile" flag, no job context | `/dashboard/candidates` star + filter |
| **Per-job Shortlist** *(new)* | `job_shortlists` table | Candidates HR is actively considering for a specific job | `/dashboard/jobs/[id]/match-candidates` star + tab |

These coexist cleanly. They're conceptually different things — different icons, different copy. Users will understand.

---

## 3. Schema (Phase 1)

```sql
CREATE TABLE job_shortlists (
  id                TEXT PRIMARY KEY,
  job_id            TEXT NOT NULL REFERENCES jobs(id) ON DELETE CASCADE,
  candidate_id      TEXT NOT NULL REFERENCES candidates(id) ON DELETE CASCADE,
  added_by          TEXT,            -- HR user email/name (audit trail)
  added_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  fit_score_at_add  FLOAT,           -- snapshot from job_matches at add-time (audit)
  notes             TEXT,            -- optional HR note ("strong English, weak fit")
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(job_id, candidate_id)
);

CREATE INDEX idx_job_shortlists_job_id       ON job_shortlists(job_id);
CREATE INDEX idx_job_shortlists_candidate_id ON job_shortlists(candidate_id);

CREATE TRIGGER trg_job_shortlists_updated_at
  BEFORE UPDATE ON job_shortlists
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();
```

**Why a separate table (not a new column):**
- `job_applications` represents *the candidate applied* (candidate-initiated). Adding HR-initiated picks there muddles two semantics.
- A separate table answers "is this candidate on HR's radar for this job?" with a clean `EXISTS`.
- Applicants and shortlisted candidates can overlap freely — both rows can coexist.
- Keeps the candidate-facing dashboard untouched. Shortlisting is private to HR until HR contacts.

**Snapshot the fit score at add-time:** the JD or candidate profile may change later. Storing `fit_score_at_add` preserves the audit trail of "why we picked them then".

Add to canonical `supabase/migrations/00000000000000_schema.sql`. Provide ad-hoc DDL for the existing Supabase project.

---

## 4. Architecture (onion-compliant)

| Layer | Addition |
|---|---|
| **Domain** | `IShortlistRepository` port; `ShortlistEntry` type |
| **Application** | `ShortlistUseCases.{addToShortlist, removeFromShortlist, listForJob, listJobsForCandidate, updateNote}` |
| **Infrastructure** | `SupabaseShortlistRepository` |
| **Presentation** | API routes under `src/app/api/jobs/[id]/shortlist/`; `<ShortlistPanel />` client component |

`addToShortlist(jobId, candidateId, hrUser)` should:
1. Look up the candidate's cached fit score from `job_matches` (if present) → save as `fit_score_at_add`.
2. Insert into `job_shortlists` (idempotent — `UNIQUE` constraint).
3. Optionally fire an internal HR audit notification (skip for MVP).

---

## 5. UI changes — Phase 1 (MVP, ship-this-week)

### A. `/dashboard/jobs/[id]/match-candidates`
- Add a **★ star icon** column at the start of each candidate row.
- Toggling star calls `POST /api/jobs/[id]/shortlist` (add) or `DELETE …/shortlist/[candidateId]` (remove).
- Show fit-score-at-add as a tooltip on the star.

### B. New tab on the same page
- Tabs: `[Ranked candidates]  [Shortlist (N)]`.
- Shortlist tab lists only the shortlisted candidates for this job, ordered by `added_at DESC`.
- Each row shows: candidate name, `fit_score_at_add` ("at time of adding"), current fit (recomputed live), added-by, added-at.
- Per-row actions: remove from shortlist, edit note, "open candidate profile".

### C. `/dashboard/jobs/[id]` (HR detail view)
- Add a stat card "Shortlisted: N" next to existing "Applicants: N".
- Link routes to `/dashboard/jobs/[id]/match-candidates?tab=shortlist`.

### D. Reframe the legacy global star (label-only change)
- On `/dashboard/candidates`, change tooltip "Add to shortlist" → **"Add to Watchlist"**.
- Change filter "⭐ Shortlisted" → **"⭐ Watchlist"**.
- Change analytics card label "Shortlisted" → **"Watchlist"**.
- **Do not** rename the DB column or API field yet — pure UI label change for now. Renaming is Phase 3 if/when we decide to retire it.

### E. Candidate profile page (`/dashboard/candidates/[id]`)
- Below "Applications", add small section **"Shortlisted for"** listing all `(job, added_at)` pairs from `job_shortlists` for this candidate. Helps HR see at a glance which roles a person is being considered for.

---

## 6. Phase 2 — pipeline depth (later, only if needed)

Skip for MVP. Build only when HR asks for it.

- **Stages on the shortlist** — add `stage shortlist_stage` enum (`SHORTLISTED → CONTACTED → INTERVIEWING → OFFER → HIRED → REJECTED`). Render as columns (kanban) or as a stage column.
- **Bulk actions** on the rank page — checkboxes + "Add top N to shortlist".
- **Quick row actions** — "Send contact email" (reuses `/api/candidates/[id]/contact`), "Invite to apply" (creates `JOB_INVITATION` notification — enum already exists), "Send assessment".
- **Compare view** — pick 2–3 from shortlist, render side-by-side fit breakdowns.
- **CSV export** of shortlist (papaparse already in deps).
- **Notification on stage advance** — only when HR explicitly opts in.

---

## 7. Phase 3 — retire the legacy boolean (only if data says so)

After Phase 1 has been live a few weeks, look at the data:

- If the **Watchlist sees real use**: keep it. It's a useful concept. Stop here.
- If it's **basically unused**: drop `candidates.shortlisted` in a follow-up migration; remove the analytics card; remove the filter. Replace with "Open shortlists: N candidates across M jobs" (computed from `job_shortlists`).

Don't decide pre-emptively.

---

## 8. Cross-cutting decisions

| Question | Decision |
|---|---|
| Should candidates see when they're shortlisted? | **No, by default.** Shortlisting is HR's working state. Visibility starts when HR explicitly contacts/invites. |
| Multi-HR collaboration | Phase 2. For MVP, anyone with `role = "hr"` can edit any shortlist. |
| Snapshot fit score at add-time | **Yes.** Required for audit/explainability. |
| Capacity limit per shortlist | None enforced. Soft hint in UI ("typical: 5–10"). |
| Auto-shortlist top N | **No.** Keep human in the loop. Fits the "Talent Intelligence" framing better than algorithmic gating. |
| GDPR | No new lawful basis needed — same purpose (recruitment), same data. Shortlist row is recruiter metadata, not personal data of the candidate. |
| Migration of existing starred candidates | **None.** They stay on the Watchlist (legacy boolean). Don't auto-assign to a job — bad data is worse than no data. |
| Relation to `application_status.SHORTLISTED` | Untouched. Application-lifecycle stage. UI may union "applicant marked SHORTLISTED" + "in `job_shortlists`" when displaying "shortlisted for this job". |

---

## 9. Tests (must-have)

Before merge:

- `tests/job-shortlist.test.ts` — repo CRUD + uniqueness constraint behaviour.
- `tests/job-shortlist-use-cases.test.ts` — `addToShortlist` snapshots fit score correctly; idempotent on duplicate; `removeFromShortlist` returns 404-equivalent on absent row.
- API smoke tests: `POST /api/jobs/[id]/shortlist` requires HR role; rejects non-existent job/candidate; returns 409-style error on duplicate.

---

## 10. Effort estimate

| Phase | Scope | Effort |
|---|---|---|
| Phase 1 (MVP) | Schema + repo + use cases + API + 2 UI surfaces + label rename | 1–2 days |
| Phase 2 | Stages, bulk actions, quick actions, compare, CSV | 3–4 days when needed |
| Phase 3 | Retire/keep watchlist decision | 0.5 day |

---

## 11. Talking point for the client

> "You're absolutely right — what we have today is more of a personal watchlist than a real shortlist. We'll add a proper per-job shortlist on the job page. It will live alongside the watchlist for now, which is still useful for tagging interesting people you haven't matched to a role yet."

True, defensible, addresses the feedback head-on without pretending the existing thing was wrong.
