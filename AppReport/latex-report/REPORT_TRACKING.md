# Report Tracking — TalentHub LaTeX Report

> Working tracker for the LEI-PROJ (PESTI) report under `AppReport/latex-report/`.
> Records what is **done**, what **changes are still needed**, and **open decisions**.
> Update this file as items are closed. Synthesize only — no raw session logs.

**Last analysis:** 2026-06-21
**Author:** Fernando Regalado Lobo Ribeiro (1060064)
**Page budget:** 70 pages max (Ch1 → Ch7). Bibliography + appendices unlimited.

---

## 1. Overall State

The report is **substantively complete prose** across every chapter, appendix, and the
frontmatter — *not* a skeleton (the `README.md` "Page-budget tracker" that still says
"skeleton" is stale; see item D-2). App name is **consistently "TalentHub"** everywhere.
The tech stack described matches the codebase (Next.js 16, Supabase, Groq Llama 3.3 70B
primary + OpenAI GPT-4o fallback, FastAPI sidecar, shadcn/ui + Tailwind, Zod, Resend,
Recharts, Vitest, GitHub Actions, Vercel).

### File-by-file status

| File | Content | Status | Notes |
|---|---|---|---|
| `chapters/ch1/chapter1.tex` — Introduction | Full prose, 2 tables | ✅ Complete | No placeholders |
| `chapters/ch2/chapter2.tex` — State of the Art | Full prose, 2 tables, 12 citations | ✅ Complete | — |
| `chapters/ch3/chapter3.tex` — Analysis & Methodology | Full prose, 8 tables, 2 TikZ figures (use-case, Gantt) | ✅ Complete | Deferred FRs clearly marked |
| `chapters/ch4/chapter4.tex` — Solution Design | Full prose, 3 tables, 7 TikZ diagrams | ✅ Complete | — |
| `chapters/ch5/chapter5.tex` — Implementation | Full prose, 4 tables, code excerpts | ⚠️ Needs work | 10 screenshot placeholders remain (A-2); CV-scoring table fixed (A-1 ✅) |
| `chapters/ch6/chapter6.tex` — Verification & Validation | Full prose, 2 tables, 1 chart | ✅ Complete | 18 test files / 305 cases |
| `chapters/ch7/chapter7.tex` — Conclusions | Full prose | ✅ Complete | — |
| `frontmatter/frontmatter.tex` | Abstract, dedication, acknowledgements | ✅ Complete | Abbreviations block intentionally commented out |
| `frontmatter/glossary.tex` | 8 glossary entries | ✅ Complete | ATS, CEFR, GDPR, LLM, RLS, Onion, PO, Scrum |
| `appendices/appendixA.tex` — DB schema | 27 ENUMs, 33 tables, candidates DDL | ✅ Complete | Accent dedup noted as future work |
| `appendices/appendixB.tex` — API reference | 66 endpoints | ✅ Complete | Endpoint numbering non-sequential (cosmetic) |
| `appendices/appendixC.tex` — Survey & meeting evidence | Timeline, 9 pain points, 14-item survey | ✅ Complete | Single (authoritative) respondent disclosed |

---

## 2. Changes Needed (action items)

### A. Content / factual fixes

- [x] **A-1 — CV scoring table corrected (DONE 2026-06-21).**
  `chapters/ch5/chapter5.tex` Table `tab:cv-scoring` (§ CV Scoring Engine) previously
  described a **four**-component score (Experience 35%, Years 25%, Education 20%,
  Location 20%) and omitted Languages entirely. It now matches the **actual code**
  (`src/server/domain/value-objects.ts` → `CV_SCORING_WEIGHTS`, computed in
  `src/server/domain/services/scoring.service.ts`): five components —
  Languages **0.35**, Experience 0.25, Education 0.15, Location 0.15, Years 0.10.
  Each component's calculation is now described accurately (English/Portuguese point
  maps + additional-language bonus; education lookup incl. OTHER=30; distance-based
  location from the Maia site). The intro now says "five components" and the worked
  example was recomputed (≈73 vs ≈16). Open decision #1 resolved: the generic
  Experience component is described honestly as a years proxy, with a pointer to the
  job-anchored fit which uses LLM-assessed relevance.

- [ ] **A-2 — Add the 10 missing screenshots (HIGH PRIORITY).**
  All UI figures in `chapters/ch5/chapter5.tex` render the grey
  `\screenshotplaceholder{...}` box. Capture and drop PNGs into
  `frontmatter/assets/screenshots/`, then swap each `\screenshotplaceholder{<file>}`
  for `\includegraphics[width=...]{<file-without-extension>}`:
  | # | Placeholder file | Figure label | Suggested capture |
  |---|---|---|---|
  | 1 | `talent-pool.png` | `fig:ss-pool` | HR talent pool table |
  | 2 | `candidate-profile.png` | `fig:ss-profile` | HR candidate detail page |
  | 3 | `cv-upload.png` | `fig:ss-upload` | CV upload / bulk upload |
  | 4 | `job-ranking.png` | `fig:ss-ranking` | Rank-candidates-for-job page |
  | 5 | `ai-interview.png` | `fig:ss-interview` | AI interview popup |
  | 6 | `analytics-dashboard.png` | `fig:ss-analytics` | Analytics default charts |
  | 7 | `analytics-widget-builder.png` | `fig:ss-widget` | Custom widget builder dialog |
  | 8 | `welcome-page.png` | `fig:ss-welcome` | New dark "TalentHub" welcome page |
  | 9 | `ambassador-programs.png` | `fig:ss-ambassador` | Ambassador programs page |
  | 10 | `candidate-portal.png` | `fig:ss-portal` | Candidate self-service dashboard |
  *Note:* screenshots 8–10 should reflect the **latest rebrand** (TalentHub welcome
  page, dark ambassador apply page).

### B. Consistency checks (low risk, verify-then-tick)

- [ ] **B-1 — Claude 3.5 Haiku in cost table.** `tab:parse-cost` lists Anthropic Claude
  3.5 Haiku as a comparison row though it is not in the production stack. This is
  intentional (cost comparison only) and the prose frames it as a candidate provider.
  *Action:* leave as-is; confirm the caption makes "comparison only" explicit. ✅ likely fine.

- [x] **B-2 — Test counts verified (DONE 2026-06-21).** Ran `npx vitest run`:
  **18 test files / 305 cases, all passing** — exactly matches Ch6 `tab:test-inventory`.
  No change needed. Re-run before final submission if the suite grows.

- [ ] **B-3 — "as of" dates.** Internal docs reference 2026-06-06 stack snapshot; the
  report timeline says May–Jun 2026. No action unless a reviewer asks; dates are
  internally consistent.

### C. Build / asset prerequisites (one-time, before compiling)

- [x] **C-1 \u2014 Class file + template assets present (DONE 2026-06-21).**
  `PESTI-style.cls` is present, and `frontmatter/assets/` contains both logos the class
  references (`isep_logo.pdf`, `logo_dei.pdf`) plus the `screenshots/` folder. The zip for
  Overleaf will include everything needed to compile.

- [ ] **C-2 — Overleaf compile passes** with pdfLaTeX + biber + makeglossaries, run
  twice for cross-refs. Check the List of Figures/Tables and glossary render.

### D. Housekeeping (nice-to-have)

- [x] **D-1 — In-app user-guide paragraph committed (DONE 2026-06-21).**
  `chapters/ch5/chapter5.tex` line 557 contains `\paragraph{In-app user guide.}` inside
  `sec:impl-engagement`; committed (clean working tree, in commit `e33d756` and earlier).
- [x] **D-2 — README page-budget tracker refreshed (DONE 2026-06-21).** All chapters and
  appendices in `README.md` now labelled "drafted" (both the folder-layout list and the
  page-budget table) instead of the stale "skeleton".

---

## 3. Already Done ✅

- All seven chapters written as complete, camera-ready prose.
- All three appendices (DB schema, API reference, survey/meeting evidence) complete.
- Frontmatter complete (abstract, dedication, acknowledgements, glossary with 8 terms).
- App name unified to **"TalentHub"** across the whole document.
- Tech-stack claims verified consistent with the codebase.
- Requirements traceability chain in place (pain points → survey → personas → FRs →
  use cases → NFRs → tests).
- 13+ tables and 11+ TikZ figures authored and labelled; cross-reference labels
  defined throughout.
- Stratos / AI-Interviewer attribution boundary preserved (sidecar only).
- Welcome page + sidebar + dashboard rebranded to "TalentHub" in the app (feeds
  screenshots 8–10).

---

## 4. Open Decisions / Questions for the Author

1. ~~**A-1 framing:** describe the generic CV "Experience" component honestly as a
   years-of-experience proxy, or keep the "LLM-assessed relevance" wording?~~
   **Resolved 2026-06-21:** described as a years proxy with a pointer to the
   job-anchored fit (which uses LLM-assessed relevance).
2. **Screenshots:** who captures them and at what viewport? Recommend 1440-px wide,
   light dashboard pages, dark welcome/ambassador pages.
3. **Report commits:** report `.tex` files live in the same repo as the app. Confirm
   you want report changes committed alongside code commits (prior precedent: yes).

---

## 5. Reference — verified facts (for quick lookup)

- **CV scoring weights (authoritative):** Languages 0.35, Experience 0.25,
  Education 0.15, Location 0.15, Years 0.10 — see `src/server/domain/value-objects.ts`.
- **Tables:** 33 · **ENUMs:** 27 · **API endpoints:** 66 · **Tests:** 18 files / 305 cases.
- **Internship window:** 16 Feb – 9 Jul 2026.
- **Client:** adidas GBS Porto — ~900 staff, ~22% international, ~15 business languages,
  runs SAP SuccessFactors.
