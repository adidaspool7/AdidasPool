# AppReport — Writing Plan & Gap Analysis

> **Created**: 2026-06-07
> **Owner**: Fernando Regalado Lobo Ribeiro (1060064) — author, Product Owner, full-stack engineer
> **Purpose**: Single source of truth for finishing the academic thesis ("relatório de estágio / PESTI") in LaTeX. Captures (a) what the report currently contains, (b) where it is stale vs. the real codebase, and (c) exactly what must be written, section by section, so nothing important is missed.
> **Scope reminder**: The thesis documents **the author's work only** — everything except the AI Skill Interviewer FastAPI sidecar (owned by Stratos Demertzoglou). The interviewer is documented at the **integration surface** level only.
> **Output format**: LaTeX (Overleaf-importable). The canonical deliverable is `AppReport/latex-report/`. The `AppReport/0X_*.md` files are *source material*, not the deliverable.

---

## 0. How the report is structured today

There are **two parallel things** in `AppReport/`:

1. **`latex-report/`** — the actual thesis (LaTeX, Overleaf). This is what gets submitted.
   - `main.tex` wires 7 chapters + 3 appendices + frontmatter.
   - **Chapter 1 (Introduction) is fully drafted** (~203 lines, good quality).
   - **Chapters 2–7 are detailed skeletons**: each has the correct `\section`/`\subsection` headings, `\label`s, target page counts, and inline `%` comments pointing at the source markdown. They contain **almost no prose yet**.
   - **Appendices A/B/C are 5–6 line stubs**.
2. **`0X_*.md` files (01–10)** — rich Markdown source material written earlier. **Detailed but partially STALE** (see §3). These feed the LaTeX chapters; they are not submitted.

Supporting evidence folders:
- `ata-de-reuniao/ata-de-reuniao.md` — meeting minutes (Scrum ceremony evidence).
- `client-pain-points/` — `TalentPool-client_pain_points.md` + survey `.docx` files (validation evidence).
- `latex-report-example/` — upstream ISEP template (do not edit; copy `.cls` + assets at build time).

### Page budget (hard constraint)
70 pages max, Chapter 1 → Chapter 7. Bibliography + appendices unlimited. Current per-chapter targets:

| Chapter | Target pp | Status |
|---|---|---|
| 1 — Introduction | 5 | ✅ drafted |
| 2 — State of the Art | 8 | ⬜ skeleton |
| 3 — Analysis & Methodology | 10 | ⬜ skeleton |
| 4 — Solution Design | 12 | ⬜ skeleton |
| 5 — Implementation | 14 | ⬜ skeleton |
| 6 — Verification & Validation | 8 | ⬜ skeleton |
| 7 — Conclusions | 4 | ⬜ skeleton |
| **Total** | **61** | buffer ~9 pp |

---

## 1. What the two user priorities map to

The user explicitly asked for **(a) Scrum + Product Owner content** and **(b) a testing section (what tests, what they cover, why)**. Here is where each lands in the existing skeleton:

### (a) Scrum & Product Owner — spread across 3 places
- **Ch.1 §1.4 Approach** + **§1.5 Team Composition** — already drafted; states PO role and the author/Stratos split. ✅ keep, minor refresh.
- **Ch.3 §3.5 Project Management** — `\subsection{Scrum Adaptation for a Two-Person Team}` + `\subsection{Product Backlog and Prioritisation}`. ⬜ **MUST WRITE**. This is the main Scrum/PO methodology section.
- **Ch.7 §7.3 Lessons Learned** — `\subsection{Product Owner Lessons in a Two-Person Team}`. ⬜ **MUST WRITE**. Reflective PO commentary.

### (b) Testing — one main place + appendix
- **Ch.6 Verification & Validation** — the testing home. ⬜ **MUST WRITE**, and the source `08_Testing_Strategy.md` is **STALE** (see §3).
- Optionally an **appendix** with the full per-file test table.

---

## 2. Section-by-section writing checklist (the LaTeX deliverable)

Legend: ✅ done · ✍️ write from scratch · ♻️ refresh/expand · ⚠️ has stale data to fix first

### Chapter 1 — Introduction ✅ (minor ♻️)
- [x] Context, Problem (9 pain points table), Objectives (7), Approach, Team Composition.
- [ ] ♻️ Re-verify the 9 pain points still match `client-pain-points/TalentPool-client_pain_points.md`.
- [ ] ♻️ Confirm contributions list still accurate after the matching-accuracy work (technical synonyms, bridge tests).

### Chapter 2 — State of the Art ✍️ (8 pp)
- [ ] §2.1 Recruitment software landscape (Workday, Greenhouse, Lever, SmartRecruiters, Recruitee, Manatal, Personio) — position vs. this platform (lightweight, GDPR-aware, single-team, AI-augmented).
- [ ] §2.2 AI in hiring: CV parsing (rule-based vs ML vs LLM), candidate–job matching (embeddings vs rule-based fit — argue **explainability** as why we chose rule-based `computeJobFit`), conversational assessment.
- [ ] §2.3 CEFR framework (A1–C2), why CEFR for software-driven assessment.
- [ ] §2.4 GDPR for recruitment (retention, special-category data, third-country LLM transfer).
- [ ] **NEEDS**: real bibliography entries in `mainbibliography.bib` (currently must be checked/populated). Citations are the biggest external-research lift.

### Chapter 3 — Analysis & Methodology ✍️ (10 pp) — **contains Scrum/PO (a)**
- [ ] §3.1 Stakeholders & personas (HR "Carla", candidate "Tiago", supervisor, client).
- [ ] §3.2 Pain points + survey validation (reproduce table, survey instrument, priority shortlist Q5/Q3/Q9/Q2).
- [ ] §3.3 Functional requirements (RF groups: Talent Pool, CV Parsing, Jobs/Matching, Assessment, Notifications/Campaigns, Analytics, Auth/Roles). **Derive the real RF list from `02_Requirements_Analysis.md` + current features.**
- [ ] §3.4 Non-functional requirements (performance, security/GDPR, reliability/CI, maintainability/onion, accessibility, portability for STT/TTS).
- [ ] §3.5 **Project Management (PRIORITY (a))**:
  - [ ] Scrum adaptation for 2 people: roles (PO = author; Devs = both; no dedicated Scrum Master, rotated facilitation), 2-week sprints, ceremonies (planning/review/retro), tooling (GitHub Issues + Project board, commit conventions).
  - [ ] Product backlog & prioritisation: MoSCoW, dependency mapping between modules, backlog snapshot (figure/appendix). Tie ordering to the client pain points.
  - [ ] **Evidence to cite**: `ata-de-reuniao/ata-de-reuniao.md` (meeting minutes) as Scrum ceremony record.

### Chapter 4 — Solution Design ✍️ (12 pp)
- [ ] §4.1 Architectural overview (C4 L1 system context + L2 containers: Next.js app, Supabase managed services, FastAPI sidecar).
- [ ] §4.2 Onion/Clean architecture (layer diagram, dependency rule, examples — cite that use cases never import infrastructure).
- [ ] §4.3 Domain model (entities list — verify against current 33 tables).
- [ ] §4.4 Database design (ERD, snake_case↔camelCase, JSONB + `JSONB_KEYS` opt-out, TEXT PK + `crypto.randomUUID()`, `updated_at` trigger, **why RLS disabled** + how access control is enforced server-side).
- [ ] §4.5 **Job-anchored matching algorithm** — Quality vs Fit, `computeJobFit` 7 criteria, average-of-applicable, `isEligible` = AND of applicable.met, `job_matches` cache. **Update with the new technical skill-synonym + phrase-alias work (2026-06-07).**
- [ ] §4.6 AI pipelines: CV parsing (upload→extract→Zod→persist, Groq primary/OpenAI fallback, telemetry), JD extractor (versioned schema, lazy parse), AI interviewer (integration surface only — HMAC token, dual mode).
- [ ] §4.7 Security & compliance (auth model, GDPR-aware deletion model).

### Chapter 5 — Implementation ✍️ (14 pp) — biggest chapter
- [ ] §5.1 Technology stack table (condense from `CLAUDE.md` — verify versions: Next.js 16.2.6, Vitest 4.1.5, etc.).
- [ ] §5.2 Repository layout (annotated `src/` tree).
- [ ] §5.3 Talent Pool module (candidate CRUD/search/filters/tags/notes + one representative use-case snippet).
- [ ] §5.4 CV parsing pipeline (prompt structure, failure modes: rate limits, schema drift — mention the **canonical skill-naming** prompt change).
- [ ] §5.5 Jobs & matching (`matchCandidatesToJob` orchestrator, match-candidates UI, `job_shortlists`). Mention the **`buildCandidateFitInput` bridge** and the `jobTitle` bug fix as an implementation honesty note.
- [ ] §5.6 AI interviewer **integration** (session creation, token signing, popup, transcript API, evaluation save — sidecar internals = teammate's work, explicitly attributed).
- [ ] §5.7 Notifications & campaigns (types, interaction history, scheduling).
- [ ] §5.8 Analytics (7 built-in charts + custom widget builder: catalog + `WidgetSpecSchema` + `chart-from-spec`).
- [ ] (consider) §5.9 CI/CD (GitHub Actions: tsc + vitest + coverage artifact).

### Chapter 6 — Verification & Validation ✍️ (8 pp) — **PRIORITY (b) TESTING** ⚠️ stale source
- [ ] §6.1 Verification strategy (3 layers: `tsc --noEmit`, Vitest unit, integration smoke).
  - [ ] §6.1.1 Static analysis & type safety (TS strict, ESLint, no `any` leakage in API routes post-audit).
  - [ ] §6.1.2 **Unit tests — the core testing section**: tooling (Vitest 4.1.5, why over Jest), **current numbers: 18 files / 305 tests, all passing**, coverage-by-area narrative (see §4 of this plan for the exact table), coverage report as CI artifact.
  - [ ] §6.1.3 Manual acceptance testing with the client (demo sessions, dataset, walkthrough script).
- [ ] §6.2 Validation through client survey (instrument = 1 question/pain point, method, headline findings, charts for the 3 priority questions, limitations: small sample, single org). **Survey answers are in `client-pain-points/TalentPool-survey-answers.docx`.**
- [ ] §6.3 Security review (Supabase advisor sweep final state, decisions log W1–W4 + I1–I3, JWT rotation May 2026). Source: `docs/audit-6-5-2026.md`.

### Chapter 7 — Conclusions ✍️ (4 pp) — **contains PO reflection (a)**
- [ ] §7.1 Summary of contributions (recap the 4 from Ch.1).
- [ ] §7.2 Goals achieved (walk the 7 objectives, one-line verdict + chapter pointer each).
- [ ] §7.3 Lessons learned:
  - [ ] **PO lessons in a 2-person team (PRIORITY (a))** — tension of being PO + main implementer; keeping backlog client-driven; sprint reviews as teammate's pushback mechanism; scope-creep risk when one person holds both roles.
  - [ ] Architectural lessons (onion paid off when interviewer was extracted; no-ORM cost bounded by type safety).
  - [ ] AI lessons (structured-output > free-form; schema versioning of LLM output; fallback providers as reliability tool).
- [ ] §7.4 Limitations (survey sample size, coverage gaps, parsing/matching accuracy ceiling — reference `docs/CV_PARSING_IMPROVEMENT_PLAN.md`).
- [ ] §7.5 Future work (GDPR full compliance, embeddings-based matching, OCR, durable bulk-upload — cite the two improvement plans as a deliberate roadmap).

### Appendices ✍️
- [ ] A — Detailed DB schema (from `05_Database_Design.md` / canonical SQL).
- [ ] B — API reference table (66 routes grouped by area; from `07_API_Documentation.md`).
- [ ] C — Survey & client-meeting evidence (instrument, raw results, meeting minutes).
- [ ] (proposed new) **D — Full test inventory table** (per-file, per-category) so Ch.6 can stay prose and the exhaustive table lives here.

---

## 3. Staleness audit — fix before copying markdown → LaTeX

The `0X_*.md` sources were written earlier and several hard numbers have drifted. **Do not copy these verbatim** — correct them first.

| Source file | Stale claim | Current truth (verified 2026-06-07) |
|---|---|---|
| `08_Testing_Strategy.md` | "17 files, 258 tests" | **18 files, 305 tests** |
| `08_Testing_Strategy.md` | `job-fit.test.ts` = 25 | **47** (added technical-synonym golden corpus) |
| `08_Testing_Strategy.md` | (missing) | new file **`job-matching-bridge.test.ts` = 25** |
| `ch6/chapter6.tex` comment | "17 test files, 259 tests" | **18 files, 305 tests** |
| Several `0X` files (per prior audits) | "Prisma", "Neon", "Vercel Blob" | **Supabase** (Auth/DB/Storage). Sweep for these terms. |
| Matching docs | no technical skill synonyms | **technical synonyms + phrase aliases added** (js↔javascript, k8s↔kubernetes, ML↔machine learning, etc.) |

**Action**: before writing Ch.6, do a one-pass `grep` over `AppReport/` for `258|259|17 (test|file)|Prisma|Neon|Vercel Blob` and reconcile.

---

## 4. Canonical test data for Chapter 6 (verified 2026-06-07)

Use this exact table as the backbone of §6.1.2 / Appendix D. **18 files, 305 tests, all passing. `tsc --noEmit` clean.**

| # | File | Tests | What it covers | Why it matters (owner's feature?) | Layer |
|---|---|---|---|---|---|
| 1 | `adidas-job-scraper.test.ts` | 10 | JD scraping, HTTP error paths | Jobs ingestion | Application |
| 2 | `analytics-catalog.test.ts` | 16 | Widget-spec validation, injection rejection | Analytics (security-sensitive) | Domain |
| 3 | `cv-fields-of-work.test.ts` | 5 | Field-of-work tagging schema | CV parsing | Application (DTO) |
| 4 | `cv-validation.test.ts` | 19 | `CvExtractionSchema` Zod validation | CV parsing | Application (DTO) |
| 5 | `escape-or-term.test.ts` | 9 | PostgREST `.or()` injection escaping | Security | Infrastructure |
| 6 | `interview-runtime.test.ts` | 37 | Interview rubric + evidence persistence | **Interviewer (teammate)** — note attribution | App + Infra |
| 7 | `interview-token.test.ts` | 6 | HMAC token round-trip + expiry | **Interviewer (teammate)** — note attribution | Infrastructure |
| 8 | `job-fit.test.ts` | 47 | `computeJobFit` matching + **technical synonym golden corpus** | **Matching (core, owner)** | Domain |
| 9 | `job-matching-bridge.test.ts` | 25 | DB-row→matcher bridge, `buildManualRequirements`, date parsing | **Matching (core, owner)** — added 2026-06-07 | Application |
| 10 | `job-requirements-schema.test.ts` | 9 | JD-extractor LLM output schema | Matching | Application (DTO) |
| 11 | `job-shortlist-use-cases.test.ts` | 8 | Per-job shortlist orchestration | Jobs | Application |
| 12 | `listing-posted-date.test.ts` | 9 | Job posted-date parsing | Jobs | Domain |
| 13 | `logger-redaction.test.ts` | 10 | PII redaction in logs | Security/GDPR | Infrastructure |
| 14 | `middleware-auth.test.ts` | 38 | Route gating (401/403, HR-only) | Auth/security | Presentation |
| 15 | `notifications-route-auth.test.ts` | 16 | API-route authorization | Auth/security | Presentation |
| 16 | `scoring.test.ts` | 13 | CV score, assessment score, CEFR estimate, borderline | Scoring | Domain |
| 17 | `text-extraction.test.ts` | 10 | PDF/DOCX text extraction | CV parsing | Infrastructure |
| 18 | `upload-use-cases.test.ts` | 18 | Single + HR bulk upload orchestration | CV parsing | Application |

**Narrative angles for the "why" (the part the user explicitly wants):**
- Pure domain logic (`computeJobFit`, scoring) is unit-tested because it is the **auditable core** of hiring decisions — explainability is a selling point vs. opaque embeddings.
- The **bridge tests (#9)** exist because a real production bug (`exp.title` vs `exp.jobTitle`) emptied the evidence signal silently — tested function, untested glue. Good honesty/lessons material.
- Security tests (#5, #13, #14, #15) map directly to GDPR/OWASP concerns.
- Interviewer tests (#6, #7) are attributed to the teammate's module — keep the contribution boundary clean.

---

## 5. Recommended writing order (fits the 2-week window)

1. **Ch.6 (Testing)** + Appendix D — highest user priority, data is ready in §4 above, low external-research cost. ✍️
2. **Ch.3 §3.5 + Ch.7 §7.3 (Scrum/PO)** — second user priority; draws on `ata-de-reuniao.md` + lived experience. ✍️
3. **Ch.4 (Design)** — leverages `CLAUDE.md`, ER diagram, matching docs (mostly already accurate). ✍️
4. **Ch.5 (Implementation)** — biggest, but well-sourced from `06_Features_Implementation.md`. ✍️
5. **Ch.3 (rest) + Appendices A/B** — requirements + reference tables. ✍️
6. **Ch.2 (State of the Art)** — last, because it needs the most external citations (bibliography lift). ✍️
7. **Ch.7 (rest) + Ch.1 refresh** — close out. ♻️/✍️

---

## 6. Open questions for the author (decide before writing)

1. **Survey results**: are `TalentPool-survey-answers.docx` responses final? Ch.6 §6.2 needs the real numbers + response count.
2. **Bibliography**: is there an existing reference list, or does `mainbibliography.bib` need to be built from scratch? (Biggest unknown for Ch.2.)
3. **Figures**: which diagrams to produce — C4 L1/L2, onion layer diagram, ERD, backlog snapshot, survey bar charts? Confirm the toolchain (TikZ/pgfplots is already set up).
4. **Scope of "Implementation honesty" notes**: OK to mention the `jobTitle` bug fix and the matching-accuracy improvements as lessons, or keep the narrative purely positive?
5. **Appendix D**: approve adding a new appendix for the full test table, or fold it into Ch.6 body?
6. **PESTI-style.cls + assets**: confirm the one-time copy from `latex-report-example/` has been done (build currently depends on it).

---

## 7. Do-not-miss summary (the user's two explicit asks)

- ✅ **Scrum + Product Owner** content has a home in **Ch.3 §3.5** (methodology) and **Ch.7 §7.3** (reflection), seeded by **Ch.1 §1.4–1.5**. Evidence: `ata-de-reuniao.md`.
- ✅ **Testing section** ("what tests, what they cover, why") is **Ch.6 §6.1.2** + optional **Appendix D**, backed by the verified **18-file / 305-test** table in §4 — replacing the stale 258/17 numbers everywhere they appear.
