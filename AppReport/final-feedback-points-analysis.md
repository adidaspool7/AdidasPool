# Analysis of `final-feedback-points.md` — Agent Working Notes

> Analysis of all 61 feedback points. **Applied edits are logged in the batch blocks below and
> tracked per-point in the STATUS DASHBOARD.** The per-point sections further down keep the
> original reasoning (Issue · Location · Fix · Links · Status) and may predate the dashboard —
> **the dashboard is the source of truth for what is done vs missing.**
>
> Status legend:
> - ✅ **Confirmed** — fact verified, only wording to agree.
> - ❓ **Needs decision** — your opinion/choice required.
> - ⚠️ **Conflict** — code/reality contradicts the feedback; must reconcile.
> - 🔍 **PDF-only** — a float/layout item I can only fully judge on your compiled PDF.
> - ✔️ **APPLIED** — edit already made to the `.tex` source.

> **Batch 2 (Group A) applied 2026-07-05** (text-only, verify on next Overleaf compile):
> Pt1 four-team→"one of four sub-teams within a single group serving adidas" (frontmatter + ch1);
> Pt3 "HR teams interviewed"→"HR team" (ch1:87; ch1:21 & glossary left as generic);
> Pt14 acceptance session→sessions/reviews (ch3:550 + ch7:91);
> Pt15 "meeting minutes record the ceremonies"→"client-engagement log records the cadence" (Appendix C is "Client Engagement and Scrum Cadence", not minutes);
> Pt22 removed repeated "talent pool…not a full ATS" scope clause (ch3:714);
> Pt25 lightened onion sentence to "draws this as concentric layers." (ch4:102);
> Pt26 removed repeated AI-Interviewer-extraction sentence (ch4:150);
> Pt28 dropped schema filename (ch4:292);
> Pt37 de-duplicated parse-cost sentence vs caption (ch5:279);
> Pt38 "the client asked for…transparency"→"a property we adopted as a deliberate design principle of transparency and reproducibility" (ch5:363);
> Pt39 added education+location (15% each) to scoring paragraph (ch5);
> Pt12 added LLM→"Rank candidates for a job" association in fig:usecase (ch3);
> Pt31 relabelled "persist candidate + children"→"…+ related records (experiences, education, languages, skills)" (fig:seq-cv, ch4);
> Pt20 added 11 glossary entries: Whisper, Zod, shadcn/ui, Tailwind CSS, Cookies, CORS, MIME type, Vitest, V8, Turbopack, GIN index.

> **Group B (partial) applied 2026-07-05:**
> Pt24 CODE — ambassador pitch video changed from file upload to external URL link (YouTube unlisted / Vimeo / Google Drive). Touched: public apply form (`src/app/ambassador/[programId]/page.tsx`), apply route (URL validated at boundary — http(s) only), removed `uploadAmbassadorVideo` use case, HR view now a link not a `<video>`. DB `pitch_video_url` unchanged. No schema change.
> Pt44 correct welcome flow order (hero → presentation/role-choice → Google sign-in → dashboard) (ch5).
> Pt21/43 "adidas Design team"/"client's design team" → "our group's design team" (ch3 + ch5).
> Pt10 GDPR — answered conceptually + added future-work note to ch4 §design-gdpr (retain salted-hash pseudonymised token post-erasure; legitimate-interest basis + own retention limit).

> **Batch 1 applied 2026-07-05** (text-only, verify on next Overleaf compile):
> honest/honestly sweep — 7 spots (ch4:420 Pt30, ch5:241, ch6:395, ch6:413, ch6:500 Pt52b, ch7:96 Pt55, ch7:135 Pt57; Appendix D prompt left as-is);
> Pt40 "about a minute" (ch5 §impl-jobs); Pt48 job-sync wording (ch5 §impl-engagement);
> Pt54 "silent omission"→"an unstated one" (ch7); Pt56 "forgo an ORM"→"not to use an ORM" (ch7);
> Pt19 risk caption now spells out Likelihood (L) and Impact (I) (ch3).
> **Drafts 1 & 2 applied 2026-07-05:** NL analytics chatbot → ch7 future work; concurrency safeguard (two explicit levels: request-level single-flight + data-level idempotent upsert) → ch5 §impl-jobs. Pt52b "glossed over"→"papered over".

---

## STATUS DASHBOARD (updated 2026-07-05)

**61 points total → 48 applied · 10 remaining · 4 resolved-no-edit.** Committed in `c6b1c80` (+ earlier passes); Batches 3–7 (Pt 3, 4, 5, 9, 11, 13, 18, 23, 24-report, 27, 32, 33, 36, 41, 50, 53, 58, 59, 61) applied and pending commit. Pt 7/17 → `jira-backlog-plan.md`; Pt 8 → `supervisor-feedback-responses.md`. All `.tex` edits still need a fresh Overleaf compile to eyeball.

### ✅ DONE — applied to source (48)
`1, 3, 4, 5, 6*, 9, 10, 11, 12, 13, 14, 15, 18, 19, 20, 21, 23, 24, 25, 26, 27, 28, 30, 31, 32, 33, 36, 37, 38, 39, 40, 41, 42*, 43, 44, 48, 50, 51*, 52a, 52b, 53, 54, 55, 56, 57, 58, 59, 61` — plus Draft 1 (NL analytics chatbot) & Draft 2 (sync concurrency).
> \* 6 = already present (in-app user guide, no edit). 42/51 = widgets are real → prose stays; only the future-work bullet was added. 3 = discovery sentence already singular ("The HR team interviewed…"); abstract left generic "HR teams". 13 = removed the duplicated PO-duties sentence in ch3 §Project Management intro (Roles bullet already lists them). 23 = ch3 §3.8 conclusion expanded (traceability chain + validation link + limitations forward-ref). 27 = job-specific AI interview added to ch7 Future Work. 20 = 11 glossary entries confirmed present (whisper, zod, shadcn, tailwind, cookies, cors, mime, vitest, v8, turbopack, gin).

### ❓ NEEDS YOUR DECISION / INPUT (14)
- **Pt 2** — **resolved, no edit.** Confirmed no links exist anywhere; user decided to add nothing about the live app.
- **Pt 60** — **resolved, no edit.** Bias detection is a fairness/disparate-impact audit placeholder (FR-13); referenced 5× in the report (ch3:290, ch3:668, ch5:98, ch5:121, ch7:217) with two bib entries (Raghavan2020, BogenRieke2018). No additional definition added; supervisor accepted.
- **Pt 7 / 17** — backlog plan drafted → `jira-backlog-plan.md` (epics/stories/AC/priority/estimate/status + JIRA CSV mapping). Next: generate `talenthub-jira.csv` on request.
- **Pt 8** — supervisor response map drafted → `supervisor-feedback-responses.md` (point → change → chapter/section). Keep in step as remaining points close.
- **Pt 16** — **dropped, no edit.** User does not want a Figma screenshot.
- **Pt 18** — **applied.** `fig:gantt` adjusted: testing/deployment bar extended to end-June, final-report/presentation bar shortened to mid-June→July, and a second green situation-point line added at 24~Mar (alongside the end-Apr one).
- **Pt 32** — **applied.** Added a lite implementation sketch to ch4 §GDPR Alignment: a scheduled Vercel/Supabase cron job finds records past the retention window and deletes/anonymises PII in one transaction, after a one-month consent-renewal notice.
- **Pt 33** — **applied.** Added 6 rows to ch4 `tab:design-decisions` (Next.js App Router, TypeScript strict, shadcn/ui+Tailwind, Vitest-vs-Jest, Zod-boundary validation, constrained analytics catalogue).
- **Pt 36** — **applied.** Added `lst:dev-audit` to Appendix D §AI-Assisted Development: the open-ended security-audit prompt that surfaced the PostgREST `.or()` filter-injection, fixed by `escapeOrTerm()`.
- **Pt 41** — **applied.** Trimmed ch5 §5.7 (impl) to reference the token contract in ch4 §design-interviewer instead of re-describing the HMAC token; kept only impl-specific facts (turn/proctoring/results routes, selected-skill enforcement, call-time secret). ch4 remains the contract home (it has the sequence diagram). Easily flipped if you prefer trimming ch4 instead.

### 🔍 PDF-ONLY — need your compiled PDF to judge float/placement (7)
`4` (footnote in scope table), `29` (fig:status-sm before §4.4), `34` (tab:tech-stack), `35` (tab:feature-inventory), `46` (ambassador figure placement — **user handling later, open**), `49` (spare last page → maybe +1–2 code excerpts — **user checking, open**), `50` (coverage-figure placement). `53` → **applied** (tables 6.1/6.2/6.3 forced to `[H]` so they sit right under the referring text).

### 🖼️ NEED ASSETS FROM YOU (2)
- **Pt 45** — presentation/role-choice page screenshot + HR-side candidate-profile screenshot.
- **Pt 47** — tell me which image is oversized/mislabelled (Fig 5.9 ambassador vs Fig 5.10 portal) → I shrink + fix caption.

---

## ✅ RESOLVED — Point 42 (analytics custom widgets)

**Outcome (user, 2026-07-05):** The widgets ARE implemented and working fine — the
report text is **correct and stays**. The user's note referred to a *different, unbuilt*
idea: a **natural-language chart chatbot** where HR types a request (e.g. "give me new
hires per month over the past year") and a chart is generated. → **Add as a future-work
item** in `ch7` §concl-future, lightly specified (do NOT detail the mechanism). A design
sketch already exists at `docs/ANALYTICS_CHAT_PLAN.md` for reference. This unblocks
points 5, 51, ch1 objective 6, the scope table, and the feature inventory (all stay as-is).

Original verification (kept for record) — I confirmed it end-to-end:

- Real table `hr_dashboard_widgets` in `supabase/migrations/00000000000000_schema.sql`.
- `analytics-catalog.ts` (4 metrics, whitelisted dimensions, 6 chart types: bar/hbar/pie/line/area/stat, strict `WidgetSpecSchema`).
- `widget-query.service.ts`, `dashboard-widget.repository.ts`, `dashboard-widget.use-cases.ts`.
- API routes `/api/analytics/{catalog,query,widgets,widgets/[id]}` — all `requireHr()`.
- UI: `chart-from-spec.tsx`, `widget-builder-dialog.tsx` (cascading pickers + ~300 ms debounced live preview), `my-charts-section.tsx` (saved grid with Edit/Delete), **mounted at the bottom of** `src/app/dashboard/analytics/page.tsx`.
- `dashboard-widget-use-cases` test (11 cases) + `analytics-catalog` test (16 cases).
- `CLAUDE.md` documents it as fully built.

**Resolution applied above:** widgets are real; the analytics prose/tests stay. The only
additive change is a future-work bullet for the NL chart chatbot.

---

## CHAPTER 1 (`chapters/ch1/chapter1.tex`)

### Point 1 — "four-team BlendEd program" phrasing
- **Issue:** The four are **sub-teams/subprojects inside one BlendEd program**, serving a single adidas client team — not four independent teams. Current phrasing reads as four peer teams.
- **Location:** `frontmatter/frontmatter.tex:64` (abstract) "…subproject of a four-team BlendEd program…"; `ch1/chapter1.tex:259` "two-person talent-pool subproject of a four-team BlendEd program"; also `ch1:36` "ran four subprojects in parallel"; `ch3:529` "each of the four subprojects".
- **Fix:** Reword "four-team" → e.g. "four-**subproject** BlendEd program" / "one of the four parallel subprojects of the BlendEd program". Keep the adidas-as-single-client framing.
- **Status:** ✅ Confirmed (wording).

### Point 3 — "HR teams" → singular team
- **Issue:** Only **one** adidas HR team was involved. Project-specific references should be singular.
- **Location:** Key one: `ch1:87` "The **HR teams** interviewed during the discovery phase reported nine concrete pain points". Generic/OK-as-plural: `ch1:21` "help HR teams extract value…" (general statement), `glossary.tex:5` (ATS definition, generic). Already singular elsewhere (`ch1:119`, `ch2:40/138/193`, `ch5:268`, `ch7:300`).
- **Fix:** `ch1:87` → "The HR **team** interviewed…". Leave the two generic ones unless you want full uniformity.
- **Status:** ✅ Confirmed.

### Point 4 — footnote "1" on the Onboarding scope row (page 4)
- **Issue:** Footnote marker inside a `table[ht]` float may render oddly / land on the wrong page.
- **Location:** `tab:scope` (Table 1.2) row "Onboarding of hired employees\footnote{…parallel sub-team within the same BlendEd programme.}".
- **Fix:** Options: move the footnote text into the sentence before the table, or convert to `\footnotetext`+`\footnotemark`, or add `\centering` recomputation. **Need to see the PDF** to judge where "1" currently renders.
- **Status:** 🔍 PDF-only.

### Point 5 — Table 1.2 "Recruitment analytics and custom widgets" has empty out-of-scope cell
- **Issue:** Last in-scope row has a blank out-of-scope counterpart cell.
- **Location:** `tab:scope`, row "Recruitment analytics and custom widgets & \\".
- **Fix:** Fill the out-of-scope cell — recommend "Free-form SQL / natural-language chart queries" (matches the constrained-catalogue design; the NL chatbot is future work). Widgets themselves ARE in scope and delivered.
- **Status:** ✅ Confirmed (widgets stay in-scope; fill the empty cell).

### Point 2 — Are there any links to the live app in the document?
- **Finding:** **No.** A workspace-wide grep for `vercel.app`, `http(s)://`, `\url`, `\href` across all `.tex` returned **zero** matches. The production URL `https://adidas-pool.vercel.app` is nowhere in the report.
- **Fix (optional):** Add it once — abstract footnote, ch1 intro, or an appendix ("deployed at …"). Recommend a single `\url{}` in the intro or abstract.
- **Status:** ❓ Needs decision (do you want the live link in, and where?).

### Point 6 — Do we reference the user guide (HR + candidate)?
- **Finding:** **Yes.** `ch5:556` "In-app user guide" paragraph describes a role-aware help dialog rendering a curated guide for HR or candidate. (Standalone docs `docs/USER_GUIDE_HR.md` / `USER_GUIDE_CANDIDATE.md` also exist but the report cites the in-app guide.)
- **Fix:** None needed unless you want a screenshot of it added.
- **Status:** ✅ Confirmed (already present).

### Point 7 — JIRA backlog not actually built
- **Issue:** Report implies a managed backlog exists; you have no real JIRA board and want a **plan to build an accurate one**.
- **Location:** ties to `sec:method-backlog` (ch3, MoSCoW backlog) and Point 17.
- **Fix:** Deliverable is a separate **JIRA-build plan** (epics/stories from the 9 pain points + FR list), not a report edit — then decide how the report should describe it (past-tense "was tracked in JIRA" vs "prioritised MoSCoW backlog").
- **Status:** ❓ Needs decision (want me to draft the JIRA plan?).

### Point 8 — Map supervisor feedback → report changes (to reply to supervisor)
- **Issue:** You want a table mapping each supervisor comment (S1–S6, in `AppReport/report-review-change-log.md`) to the exact report parts changed.
- **Fix:** I can produce that mapping from the change log. Separate deliverable, not a report edit.
- **Status:** ❓ Needs decision (want the mapping drafted now?).

---

## CHAPTER 3 (`chapters/ch3/chapter3.tex`)

### Point 9 — Personas Carla / Tiago used only once
- **Finding:** Defined at `ch3:31` (Carla, HR) and `ch3:39` (Tiago, candidate); **never referenced again** anywhere in the report.
- **Fix options:** (a) weave them into later scenario prose (use-case walkthroughs, validation narrative), or (b) leave as a one-off analysis device. Your call.
- **Status:** ❓ Needs decision.

### Point 10 — GDPR 6-month deletion vs recognising repeat applicants
- **Issue:** If candidate data is deleted at 6 months, how does HR "automatically identify repeat applicants"? What survives deletion?
- **Location:** `ch3` §analysis-pains "recognising repeat applicants under the GDPR retention rule (#2)"; survey Q2 (appendixC); ch6 traceability "Retention / deletion-aware model → Survey Q3".
- **Fix:** This is a **design/logic clarification** first, then possibly a sentence in the report. Need your intended behaviour (e.g. keep a hashed email/anonymised key beyond 6 months? or accept that dedup only works within the window?).
- **Status:** ❓ Needs decision (design answer required).

### Point 11 — Explain how the four subprojects connect
- **Issue:** Add a short paragraph: community-research + employer-branding **attract** talent → talent-pool (TalentHub) **screens/manages** → onboarding **assists hires**.
- **Location:** best home = `ch1:36` (context) or `ch3` §method-scrum area (`ch3:529`).
- **Fix:** Add ~3–4 sentence linking paragraph.
- **Status:** ❓ Needs decision (confirm the exact relationship wording).

### Point 12 — `fig:usecase` (Figure 3.1) missing LLM association to job-matching
- **Issue:** LLM Provider actor connects only to u1 (CV parsing). It also powers ranking/JD-parsing (u3 "Rank candidates for a job"). Missing association line.
- **Location:** `fig:usecase`, actor "LLM Provider", use case u3.
- **Fix:** Add an association between LLM Provider and the job-matching/ranking use case (JD requirement extraction). Edit the TikZ/PlantUML source of the figure.
- **Status:** ✅ Confirmed (diagram edit).

### Point 13 — Product-Owner responsibilities feel repetitive
- **Issue:** PO role described repeatedly (ch1 §team, ch3 §method-scrum, ch7 §concl-po, appendixC).
- **Fix:** Keep the fullest treatment (ch7 §concl-po) and trim the earlier restatements to a sentence with a cross-ref.
- **Status:** ❓ Needs decision (which instance to keep full — I recommend ch7).

### Point 14 — "a dedicated client-acceptance session" → plural
- **Issue:** There were multiple acceptance/sprint-review sessions, not one.
- **Location:** `ch3` §method-scrum "a dedicated client-acceptance session (\secref{sec:val-manual}) doubled as the subproject's sprint review"; also echoed in `ch7:96` and `ch6` §val-manual ("structured acceptance sessions" — already plural there).
- **Fix:** Pluralise in ch3 (and ch7 §concl-po) → "dedicated client-acceptance **sessions** … doubled as sprint reviews".
- **Status:** ✅ Confirmed.

### Point 15 — "meeting minutes (Appendix C) record the ceremonies" — verify
- **Finding:** Appendix C (`app:survey`) contains a **milestone table** (`tab:meeting-log`, "Selected milestones of the client engagement") + the 9 pain points + the survey — **not** per-sprint ceremony minutes. So "meeting minutes … record the ceremonies" is a mild overstatement.
- **Location:** `ch3` §method-scrum "the meeting minutes (\appref{app:survey}) record the ceremonies".
- **Fix:** Soften → "the client-engagement log (\appref{app:survey}) records the cadence and milestones". (Ref target itself is correct.)
- **Status:** ✅ Confirmed (wording). Note: raw minutes live in `AppReport/ata-de-reuniao/` if you'd rather cite those.

### Point 16 — Add a Figma board screenshot?
- **Issue:** Figma is described as the program knowledge base; no screenshot.
- **Fix:** Optional figure. Your call whether to add.
- **Status:** ❓ Needs decision.

### Point 17 — §3.7.3 backlog described as if it exists (same as Point 7)
- **Location:** `sec:method-backlog` (MoSCoW backlog narrative).
- **Fix:** Align with Point 7 outcome (either build the JIRA board and keep past-tense, or reword to "a MoSCoW-prioritised backlog maintained by the PO" without implying a tool you didn't use).
- **Status:** ❓ Needs decision (tied to Point 7).

### Point 18 — `fig:gantt` (Figure 3.2) corrections
- **Issue:** (a) Testing/deploy bar should extend to **end of June**; (b) Final report/presentation should run **mid-June → July**; (c) add a **second** situation-point (green dashed) line at **24 March** (existing one is ~end April).
- **Location:** `fig:gantt`. Bars via `\barrow{row}{start}{end}{label}` on a Feb=0…Jul=5 axis: row5 Testing/deploy `{1.6}{4.4}` → extend end to ~**5.0** (end June ≈ 4.5–5.0); row7 Final report `{3.6}{5.0}` → start ~**4.5** (mid-June). Situation line currently one dashed rule at x≈2.95 → add a second at x≈**1.75** (24 Mar).
- **Cross-check:** `tab:meeting-log` (appendixC) says "Apr–May Testing/deployment" and "May–Jul Final report" — **mild inconsistency** with the requested Gantt extents. We should make the Gantt and the milestone table agree (recommend the milestone table follows your real dates; tell me the true spans).
- **Status:** ✅ Confirmed (edit) + ❓ confirm exact month values so Gantt ↔ milestone table match.

### Point 19 — `tab:risk-register` (Table 3.7) caption: define L / I
- **Issue:** Columns headed "L" and "I" with no expansion in the caption.
- **Location:** `tab:risk-register` caption "Project risk register with pre-mitigation likelihood and impact…".
- **Fix:** Add "columns **Likelihood (L)** and **Impact (I)**" to the caption.
- **Status:** ✅ Confirmed.

### Point 21 — "adidas Design team" requested the welcome page — inaccurate
- **Issue:** The welcome/hero page was requested by **our own group's design people** (the branding/research subproject team), **not** the adidas/client design team.
- **Location:** `ch3` §method-deviations (3.7.6) "a public welcome page was added…at the explicit request of the adidas Design team". Duplicated at `ch5` §impl-engagement (Point 43).
- **Fix:** Reword both → "at the request of **the programme's employer-branding/design sub-team**" (confirm exact attribution).
- **Status:** ✅ Confirmed (wording) — but confirm the exact team name to credit.

### Point 22 — repeated "a talent pool with communication verification, deliberately not a full ATS"
- **Issue:** This framing appears more than once; trim the repeat in 3.7.6.
- **Location:** `ch3` §method-deviations.
- **Fix:** Remove/condense the second occurrence; keep the canonical one (positioning is argued in ch2 §sota).
- **Status:** ✅ Confirmed.

### Point 23 — §3.8 Conclusion too short
- **Issue:** Only ~3 sentences.
- **Fix (optional):** Expand to summarise the analysis → design handoff.
- **Status:** ❓ Needs decision (expand or leave).

---

## CHAPTER 4 (`chapters/ch4/chapter4.tex`)

### Point 24 — Storage isn't only CVs
- **Finding:** The object-storage bucket holds **CVs + motivation letters + learning agreements** (confirmed `ch5` §impl-engagement: "a motivation letter and, for Erasmus internships, a learning agreement — each stored in the same object-storage bucket as the CV"). Ambassador `pitch_video_url` appears to be an **external URL**, not a bucket upload (needs your confirmation). Scraped jobs are DB rows, not storage.
- **Location:** `ch4` §design-overview "Storage for uploaded CVs"; `tab:containers` "Uploaded CV files"; also `ch5` `tab:tech-stack` "Uploaded CV files".
- **Fix:** Broaden to "candidate documents (CVs, motivation letters, learning agreements)" in all three spots.
- **Status:** ✅ Confirmed (CVs+letters+agreements) · ❓ confirm ambassador videos (URL vs upload).

### Point 25 — Concentric-layers sentence duplicates the onion figure caption
- **Location:** `ch4` §design-onion sentence "Figure 4.2 draws this as concentric layers: the dependency-free Domain at the centre…" vs `fig:onion` caption "The onion architecture: a dependency-free Domain at the core, with Application, Infrastructure and Presentation around it."
- **Fix:** Lighten the sentence (drop the layer enumeration, just "Figure 4.2 draws this as concentric layers."), keep the caption.
- **Status:** ✅ Confirmed.

### Point 26 — Remove the AI-Interviewer-extraction sentence (repetition)
- **Location:** `ch4` §design-onion end: "This same separation is what later allowed the AI Interviewer to be extracted into its own process behind an unchanged contract." (Repeated as a lesson in `ch7` §concl-arch.)
- **Fix:** Delete the sentence here; keep the ch7 lesson.
- **Status:** ✅ Confirmed.

### Point 28 — Drop the schema filename
- **Location:** `ch4` §design-database "single canonical SQL file (\texttt{00000000000000\_schema.sql})".
- **Fix:** Remove the parenthetical filename → "a single canonical SQL schema file".
- **Status:** ✅ Confirmed.

### Point 27 — Future work: job-specific AI interviews (HR picks priority topics per job)
- **Issue:** Add as a future-work direction (per-job interview topic weighting).
- **Location:** add to `ch7` §concl-future (and optionally note in ch4 §design-interviewer).
- **Fix:** Add one future-work bullet.
- **Status:** ❓ Needs decision (confirm you want it added).

### Point 29 — Figure 4.3 should appear before §4.4 Database Design
- **Location:** `fig:status-sm` (Figure 4.3, `[ht]`, candidate lifecycle, in §design-domain) drifts past the section boundary.
- **Fix:** Likely change `[ht]`→`[H]` (float package already loaded) or reposition the block. **Confirm on PDF.**
- **Status:** 🔍 PDF-only.

### Point 30 — Remove "honestly"
- **Location:** `ch4:420` "…is recorded **honestly** as a limitation in \secref{sec:val-limitations}."
- **Fix:** Drop "honestly" → "is recorded as a limitation…". (Part of the whole-document honest-purge — see the honest sweep below.)
- **Status:** ✅ Confirmed.

### Point 31 — `fig:seq-cv` (Figure 4.6) message "persist candidate + children"
- **Issue:** "children" is unclear to a reader.
- **Location:** `fig:seq-cv` (`[H]`) message label "persist candidate + children".
- **Fix:** Relabel → "persist candidate + related rows (experiences, education, languages, skills)" or "…child records".
- **Status:** ✅ Confirmed (diagram edit).

### Point 32 — Automatic time-based deletion: implementation vs nice-to-have?
- **Finding:** Framed as **future work**, lightly: `ch6` §val-limitations "the time-based retention purge is not yet automated and still depends on a manual trigger"; `ch7` §concl-future "automating the time-based retention purge as a scheduled, GDPR-compliant job — paired with a consent-renewal reminder…". So: **nice-to-have direction**, minimal mechanism.
- **Fix (optional):** If you want it stronger, add one sentence on HOW (e.g. a scheduled Supabase/pg_cron job purging records past the 6-month mark). Otherwise leave as future work.
- **Status:** ❓ Needs decision.

### Point 33 — `tab:design-decisions` (Table 4.3) add more rows
- **Issue:** 7 rows; you want to add key stack decisions.
- **Fix:** Add rows for **shadcn/ui + Tailwind CSS**, **TypeScript (strict)**, **Vitest vs Jest**, **Next.js framework choice**. (Vitest-vs-Jest rationale already exists in ch6 §val-unit — reuse it.)
- **Status:** ❓ Needs decision (confirm which rows; I'll draft them).

---

## CHAPTER 5 (`chapters/ch5/chapter5.tex`)

### Point 34 — `tab:tech-stack` (Table 5.1) floats into §5.2
- **Location:** `tab:tech-stack` (`[ht]`), declared in §impl-stack (5.1), drifts into the Repository-Layout list of §5.2.
- **Fix:** `[ht]`→`[H]` (or `[t]` at top of 5.1). **Confirm on PDF.**
- **Status:** 🔍 PDF-only.

### Point 35 — `tab:feature-inventory` (Table 5.2) should precede §5.3
- **Location:** `tab:feature-inventory` (`[ht]`) in §impl-layout (5.2), drifts past into §5.3.
- **Fix:** `[ht]`→`[H]`. **Confirm on PDF.**
- **Status:** 🔍 PDF-only.

### Point 36 — Security-review injection as a prompt-engineering example
- **Finding:** Appendix D §app:prompts-development currently has 5 dev-prompt examples (repo impl, computeJobFit, tests, PGRST200 debug, logging refactor). **None** is the `.or()` injection discovery. The injection is only described as "found during a security review" (ch4, ch5 §impl-pool, ch6 §val-security).
- **Fix (optional):** Add a 6th `lstlisting` in Appendix D showing the prompt that surfaced/hardened the `.or()` vector (e.g. "Review this PostgREST `.or()` search filter for injection; the terms are user-supplied…"). **Only if that reflects what actually happened** — confirm the injection was found via an AI-assisted review, else keep "security review".
- **Status:** ❓ Needs decision (was it AI-assisted? add example?).

### Point 37 — §5.4.2 parse-cost intro sentence ≈ Table 5.3 caption (repetition)
- **Location:** `ch5` §impl-cv-cost "…applies the mid-2026 published list prices of three small/fast models to that token profile, and \figref{fig:parse-cost} plots…" vs `tab:parse-cost` (Table 5.3) caption "Estimated parsing cost per provider for the representative token profile (1,800 input + 900 output tokens per CV). List prices, mid-2026…".
- **Fix:** Trim the overlap — keep the token-profile numbers in the caption, shorten the sentence (or vice-versa).
- **Status:** ✅ Confirmed.

### Point 38 — §5.5 "the property the client asked for under the heading of transparency" — untrue
- **Issue:** The **client did not ask** for per-criterion transparency; it was **your** design principle.
- **Location:** `ch5` §impl-scoring "…which is the property the client asked for under the heading of transparency." (Also check ch4 §design-domain / §design-matching for "promised to the client" style attributions.)
- **Fix:** Reframe → "…which was a deliberate design principle: every criterion is individually explainable." Remove the client-attribution.
- **Status:** ✅ Confirmed (wording).

### Point 39 — §5.5 scoring paragraph omits the Location parameter
- **Issue:** The intro paragraph enumerates Languages/Experience/Years but not **Location (15%, distance from the Maia site)**. `tab:cv-scoring` (Table 5.4) does list it.
- **Location:** `ch5` §impl-scoring intro paragraph.
- **Fix:** Add a clause naming Location (15%, proximity to the single Maia origin — see also Point 39's future-work counterpart in ch7 §concl-partial "Single-origin location scoring").
- **Status:** ✅ Confirmed (small addition).

### Point 40 — "the better part of a minute" → "about a minute"
- **Location:** `ch5` §impl-jobs "Because a full portal sync can take **the better part of a minute**, it reuses the same fire-and-forget pattern…".
- **Fix:** → "can take **about a minute**".
- **Status:** ✅ Confirmed.

### Point 41 — §5.7 AI-Interviewer integration repeats §design-interviewer
- **Issue:** Overlap between `ch4` §design-interviewer (contract) and `ch5:466` §impl-interviewer (integration flow) — HMAC token, session, transcript turns described twice.
- **Fix:** Keep one full treatment; reduce the other to a cross-ref. Recommend keeping the ch5 implementation flow and trimming the ch4 design duplication (or vice-versa — your call).
- **Status:** ❓ Needs decision (which side to trim).

### Point 42 — Analytics saved widgets — RESOLVED (implemented, stays)
- **Location:** `ch5` §impl-analytics "A hand-written query service runs each validated specification… Saved widgets are stored per user…"
- **Outcome:** Widgets are implemented and working → **text stays unchanged.** Add a future-work bullet in `ch7` §concl-future for a **natural-language analytics chatbot** (HR asks for metrics in plain language → chart), lightly specified. Ref `docs/ANALYTICS_CHAT_PLAN.md`.
- **Status:** ✅ Confirmed (no edit to §5.9; add one future-work bullet).

### Point 43 — "At the request of the client's design team" (welcome page) — same as Point 21
- **Location:** `ch5` §impl-engagement, Welcome-and-onboarding paragraph.
- **Fix:** Same reword as Point 21 (our programme's branding/design sub-team, not the client's).
- **Status:** ✅ Confirmed.

### Point 44 — Welcome/login flow order is wrong
- **Issue:** Real order = **heropage → presentation/role-choice page (pick HR or candidate) → Google login → role dashboard**. Current text conflates the hero page and the role-choice step into one "welcome page… presents two entry paths… after Google sign-in routes to the dashboard".
- **Location:** `ch5` §impl-engagement Welcome paragraph. Note: there is a separate `heropage/` folder at the repo root — the hero page is a distinct artefact.
- **Fix:** Rewrite the sequence to three explicit steps. **Confirm the exact flow** (is the role choice before or after Google login? your note says the presentation page offers "log in as HR / candidate" before Google) — I'll match your description.
- **Status:** ❓ Needs decision (confirm exact sequence) then ✅ rewrite.

### Point 45 — Screenshots to add/replace
- **Issue:** (a) Add the **presentation/role-choice page** screenshot; (b) the **HR-side candidate profile** — verify `figure5_2` (`fig:ss-profile`, captioned "the per-candidate view a recruiter opens") actually shows the HR-side view, not the candidate-side.
- **Fix:** You supply/replace images; I adjust captions/labels/placement. **Need the files.**
- **Status:** ❓ Needs decision + assets.

### Point 46 — Figure placement (welcome/ambassador area)
- **Issue:** A figure lands mid-text; should sit after "…role boundaries enforced by the middleware (Section 5.11)" (end of the In-app user-guide paragraph).
- **Location:** Figures in ch5 renumber as: 5.1 pool, 5.2 profile, 5.3 upload, 5.4 ranking, 5.5 interview, 5.6 analytics, 5.7 widget, 5.8 welcome, **5.9 ambassador** (`figure5_10`, `[H]`), 5.10 portal. Your "Figure 5.9" = the **ambassador** image; move its `[H]` block to just after the user-guide paragraph, or retune placement.
- **Fix:** Reposition the figure block. **Confirm identity on PDF** (filename `figure5_N` ≠ LaTeX Figure number).
- **Status:** 🔍 PDF-only.

### Point 47 — "image 5.10 too big + wrong title"
- **Issue:** Ambiguous between `figure5_10` (ambassador, `width=0.5\linewidth`, `[H]`, caption "HR management of brand-ambassador programs" = **LaTeX Figure 5.9**) and **LaTeX Figure 5.10** = `figure5_11` (candidate portal, `width=0.95\linewidth`, caption "The candidate self-service portal").
- **Fix:** Tell me which one — then shrink `\includegraphics[width=…]` and correct the caption. **Need PDF/your pointer.**
- **Status:** ❓ Needs decision (which image) + 🔍 PDF.

### Point 48 — "a live feed that HR refreshes" — inaccurate
- **Finding (verified in code):** `POST /api/jobs/sync` has **no** `requireHr()` and is **not** in `HR_ONLY_API_PREFIXES` (middleware). The "Get current job offers" button on `/dashboard/jobs` is rendered **unconditionally** (sibling to, not inside, the `role === "hr"` block), so **both HR and candidates** can trigger the scrape/sync. Scraper = `AdidasJobScraperService` → `syncJobsFromCareerSite()` → `bulkUpsertByExternalId`.
- **Location:** `ch5` §impl-engagement candidate-self-service paragraph "Open positions are browsed from **a live feed that HR refreshes** from the adidas careers portal…"; also §impl-jobs opening.
- **Fix:** Reword → the job feed is synced from the adidas careers portal via a sync action available **to any authenticated user (HR or candidate)** from the jobs page. Fix both spots.
- **Status:** ✅ Confirmed (your doubt was right).

### Point 49 — §5.14 last page sparse → add 1–2 code excerpts
- **Location:** `sec:impl-code` currently has 3 excerpts (`computeJobFit`, middleware gating, `escapeOrTerm`).
- **Fix (optional):** If the last excerpt leaves a near-empty page, add 1–2 more (e.g. `camelizeKeys`/`snakeifyKeys` boundary, or the Zod CV schema). **Depends on PDF pagination.**
- **Status:** 🔍 PDF-only + ❓ (which excerpt).

---

## CHAPTER 6 (`chapters/ch6/chapter6.tex`)

### Point 50 — `fig:coverage-by-layer` (Figure 6.1) caption too long + placement
- **Issue:** Caption repeats the table caption and prose; you want it shorter and placed just before the "The glue between layers" paragraph.
- **Location:** `fig:coverage-by-layer` caption "Line coverage by layer (V8 provider). The decision-bearing layers … 80% and 100% … 46.9%." Paragraph "The glue between layers." is in §"What is Tested, and Why".
- **Fix:** Shorten caption → "Line coverage by architectural layer (V8 provider)." Reposition the figure. **Confirm placement on PDF.**
- **Status:** ✅ (caption) + 🔍 (placement).

### Point 51 — Analytics-catalog tests "impossible to express injected query"
- **Location:** `ch6` §val-unit Security-sensitive paths "…the analytics catalog tests confirm that the strict widget-specification schema rejects injected keys, so that the constrained chart builder can never be coerced into running an arbitrary query."
- **Status:** ✅ Confirmed — widgets are implemented, so this sentence is **correct and stays** unchanged.

### Point 52a — dislike "makes hot"
- **Location:** `ch6` §val-performance "Performance was addressed pragmatically, at the points the data model **makes hot**."
- **Fix:** → "…at the points **where the data model is read most heavily**" / "…at the **hot read paths**".
- **Status:** ✅ Confirmed.

### Point 52b — "reported here honestly rather than hidden"
- **Location:** `ch6:500` §val-limitations "Validation also surfaced limitations that are **reported here honestly rather than hidden**."
- **Fix:** → "…that are reported here **openly** / **explicitly**." Drop both "honestly" and "hidden".
- **Status:** ✅ Confirmed.

### Point 53 — Tables 6.1 / 6.2 / 6.3 next to their relevant test text
- **Location:** `tab:test-inventory` (6.1), `tab:coverage-layer` (6.2), `tab:traceability` (6.3), all `[ht]`.
- **Fix:** Tune placement so each sits by its discussion (`[H]` or reflow). **Confirm on PDF.**
- **Status:** 🔍 PDF-only.

---

## CHAPTER 7 (`chapters/ch7/chapter7.tex`)

### Point 54 — dislike "silent omission"
- **Location:** `ch7` §concl-po "…made deferral an explicit, defensible decision rather than a **silent omission**."
- **Fix:** → "…rather than **an unstated one** / **an unexplained gap**."
- **Status:** ✅ Confirmed.

### Point 55 — "The honest takeaway"
- **Location:** `ch7:96` §concl-po "The **honest** takeaway is that combining the roles is workable…".
- **Fix:** → "The **takeaway** is…" / "**In short**, combining the roles…".
- **Status:** ✅ Confirmed.

### Point 56 — "forgo an ORM"
- **Location:** `ch7` §concl-arch "The counter-lesson concerns the decision to **forgo** an ORM…".
- **Fix:** → "the decision **not to use** an ORM" / "**to do without** an ORM".
- **Status:** ✅ Confirmed.

### Point 57 — "Treating that use honestly"
- **Location:** `ch7:135` §concl-ai-dev "**Treating that use honestly** yielded its own lessons…".
- **Fix:** → "**Reflecting on that use critically** yielded its own lessons…" / "That use yielded its own lessons…".
- **Status:** ✅ Confirmed.

### Point 58 — §7.3.3+ too much bold
- **Location:** §concl-ai (7.3.3) bolds "structured-output prompting beats free-form", "LLM output schemas must be versioned", "fallback providers are a reliability mechanism, not a luxury"; §concl-ai-dev (7.3.4) bolds "the assistant does not hold the whole project in mind", "solve the local problem in the simplest way that compiles", "every output requires careful validation…", "prompting is a skill that improved with practice".
- **Fix:** Remove most `\textbf{}` emphasis; keep prose. Maybe retain the three AI-lesson lead-ins as italic or plain.
- **Status:** ✅ Confirmed (confirm: strip all, or keep the 3 lead-ins?).

### Point 59 — rewrite the "add feature X" prompt paragraph
- **Location:** `ch7` §concl-ai-dev "Early prompts were broad (``**add feature X**''), which is exactly when the context problem bites hardest…".
- **Fix:** Replace the toy example with a concrete one and reword → e.g. "Early prompts were too broad — asking for a whole feature in one step — which is exactly when the context problem bites hardest." (Appendix D's concrete dev prompts can be referenced as the contrast.)
- **Status:** ✅ Confirmed.

### Point 60 — Explain "Bias detection"
- **What it is (for you):** A **fairness/auditing module** that would check whether the automated scoring/ranking systematically disadvantages a protected group (e.g. gender, nationality, age, ethnicity) — for instance by comparing score/eligibility distributions across demographic slices and flagging **disparate impact**. In the report it's an unbuilt **placeholder** (FR-13).
- **Location:** `ch7` §concl-partial "Bias detection" paragraph already explains WHY it stayed a placeholder (no validated client pain point; fairness risk already mitigated because the assessment is advisory and matching is explainable per criterion; needs historical decision data that 6-month retention precludes).
- **Fix:** The paragraph is arguably sufficient. If you want, add one sentence defining what a bias-detection module *would do* (the disparate-impact check above) so a reader unfamiliar with the term understands it.
- **Status:** ❓ Needs decision (add a one-line definition?).

### Point 61 — Recommend 2 least-important bibliography refs to drop (keep to 2 pages)
- **Method:** Citations use `\parencite{}`. The `.bib` has ~45 entries; all are cited at least once (biblatex prints only cited keys, so there are no dead entries — trimming = dropping the most *redundant* single-use ones).
- **Recommended 2 to remove (lowest information loss — each is a single-use citation whose point is already carried by a stronger sibling):**
  1. **`LaumerEckhardt2011`** — cited once at `ch2:20` alongside `Holm2012Erecruitment` for e-recruitment background; Holm alone covers the claim.
  2. **`Fowler2002PoEAA`** — cited once at `ch4:200` for an enterprise-pattern point already supported by `Evans2003` + `Vernon2013IDDD`.
- **Alternatives if you'd rather trim vendor/marketing URLs:** drop one async-interview vendor page (`Sapia` or `MyInterview`, cited together once at `ch2:148`) and/or one ATS product page (`Recruitee` or `Manatal`, `ch2:28`) — but those groups exist to show market breadth, so removing them slightly weakens the survey.
- **Also single-use & droppable if two above aren't enough:** `SchwaberBeedle2002` (redundant with `ScrumGuide2020`), `CockburnHexagonal2005` (covered by `PalermoOnion2008`+`Martin2017`).
- **Status:** ❓ Approve the 2 to remove (recommend `LaumerEckhardt2011` + `Fowler2002PoEAA`).

---

## Whole-document "honest/honestly" sweep (supports Points 30, 52b, 55, 57)

You flagged 4, but the word appears **8×**. Recommend addressing all for consistency:
| # | File:line | Text | Flagged? |
|---|---|---|---|
| 1 | `ch4:420` | "recorded **honestly** as a limitation" | ✅ Point 30 |
| 2 | `ch6:500` | "reported here **honestly** rather than hidden" | ✅ Point 52b |
| 3 | `ch7:96` | "The **honest** takeaway" | ✅ Point 55 |
| 4 | `ch7:135` | "Treating that use **honestly**" | ✅ Point 57 |
| 5 | `ch5:241` | "It is important to be **honest** about what this number is and is not" | ➕ extra |
| 6 | `ch6:395` | "so the validation is read **honestly**" | ➕ extra |
| 7 | `ch6:413` | "keeps the platform's claimed scope **honest**" | ➕ extra |
| 8 | `appendixD:81` | prompt text "…**honestly** assess certainty…" | ➕ leave (quoted prompt) |

Plan: reword 1–7 with varied language (openly, candidly, plainly, explicitly, faithfully, accurate); leave 8 (it's reproduced prompt source).

---

## Glossary additions (Point 20)

Requested terms and whether they appear in the text (so a glossary entry is justified):
- **Whisper** — ch3 risk register, ch6/ch7 future work ✅
- **Zod** — many chapters ✅
- **shadcn/ui** — ch4, ch5 ✅
- **Tailwind CSS** — ch4, ch5 ✅
- **Vitest** — ch5, ch6 ✅
- **V8** — ch5, ch6 (coverage provider) ✅
- **Turbopack** — ch5 §impl-cicd ✅
- **GIN index** — ch4, ch6 ✅
- **CORS** — ch5 stack rationale ✅
- **MIME** — ch5 CV parsing ✅
- **Cookies** — ch4 §design-hardening (session cookies) ✅
- Current glossary has 22 entries; none of the above present.
- **Fix:** Add glossary entries for the 11 terms. Status: ✅ (I'll draft definitions).

---

## Summary of clarifying questions to ask the user
1. **Point 42/51 (CRITICAL):** Analytics custom-widget builder — code says fully implemented (saved per-user widgets, 6 chart types, mounted). Reconcile with your "not implemented" note.
2. **Point 5:** Out-of-scope cell wording for "Recruitment analytics and custom widgets" (depends on #1).
3. **Point 2:** Add the live app URL? Where?
4. **Point 7 / 17:** Want me to draft a JIRA-board build plan? How should the report describe the backlog?
5. **Point 8:** Draft the supervisor-feedback → report-change mapping now?
6. **Point 9:** Use Carla/Tiago more, or leave as one-off?
7. **Point 10:** GDPR repeat-applicant logic — what survives 6-month deletion?
8. **Point 11:** Confirm the subprojects-connection wording.
9. **Point 13/41:** Which duplicate to keep full (PO role; AI-interviewer integration)?
10. **Point 18:** Confirm true month spans so Gantt ↔ milestone table agree.
11. **Point 21/43:** Exact team name to credit for the welcome page.
12. **Point 24:** Ambassador videos — bucket upload or external URL?
13. **Points 16, 23, 27, 33, 36, 49, 58, 60:** add/expand (Figma screenshot; §3.8; job-specific interviews; decision-table rows; AI-injection example; extra code excerpts; strip all bold; bias one-liner)?
14. **Point 44/45/47:** Confirm exact welcome flow; supply presentation-page + HR-side-profile screenshots; which image is oversized.
15. **Point 61:** Approve the 2 bibliography entries to drop (list pending).
