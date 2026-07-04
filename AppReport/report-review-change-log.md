# Report Review & Change Log — TalentHub Report

<!-- Renamed from repetition-analysis.md on 2026-06-24 (file now covers three
review passes, not just repetition). -->

> Working notes for reviewing repeated concepts/explanations across the LaTeX report,
> plus a change log of the full-document deep review (inconsistencies, missing
> bibliography, repetition, improvements).
>
> Locations are given by chapter + section label + a short quote (stable across edits),
> rather than line numbers (which shift). Severity is the author's call, open to debate.
>
> **See [§ Eighth pass — supervisor / examiner feedback](#eighth-pass--supervisor--examiner-feedback--2026-07-04)
> at the bottom for the most recent review — six external examiner margin
> comments (S1 matching correctness/consistency p32, S2 CV-parsing quantitative
> eval p65, S3 test-coverage figure p80, S4 margin overflow p81, S5 missing
> limitations LLM-hallucination/external-API p85, S6 discuss decisions/challenges/
> trade-offs/alternatives p63; **S3/S4/S5 applied, S1/S2/S6 satisfied by existing
> prose — 2026-07-04**). Earlier:
> [§ Seventh pass — prose-quality analysis](#seventh-pass--prose-quality-analysis-repetition--compaction--improvements--2026-06-25)
> (LLM-naming cleanup, U1 NFR-prose
> compaction, U2 reference-direction fix, U3 table-wording vary;
> **all applied 2026-06-25, U4 left**). Earlier:
> [§ Sixth pass — prose-quality analysis](#sixth-pass--prose-quality-analysis-repetition--compaction--improvements--2026-06-25)
> (Q1–Q6 / i1–i2 — bridge-defect echo,
> Product-Owner/backlog/sprint-fusion duplication, CV-scoring double-count;
> **all applied 2026-06-25, i3 left**). Earlier:
> [§ Fifth pass — prose-quality analysis](#fifth-pass--prose-quality-analysis-repetition--compaction--improvements--2026-06-25)
> (P1–P10 — duplicated
> limitations sections, verbatim list/paragraph echoes, internal date contradiction,
> abstract-vs-validation tension; **all applied 2026-06-25**). Earlier:
> [§ Fourth pass — prose-quality analysis](#fourth-pass--prose-quality-analysis-repetition--compaction--improvements--2026-06-24)
> (read-only: repetition R1–R7, compaction C-a–C-e, improvements I1–I3 — R1–R6/I1/I2
> applied, R7/I3 left). Earlier:
> [§ Third triple-check pass](#third-triple-check-pass--2026-06-24) (Table B.1 overlay fix,
> T1–T4 — Appendix A enum count/listing, Appendix B renumbering, glossary wiring),
> [§ Deep-review pass](#deep-review-pass--2026-06-24)
> (A3–A9, B1–B4, C1–C6, D3/D4) and [§ Second double-check pass](#second-double-check-pass--2026-06-24)
> (items 1–6).**

---

## STATUS (updated as we go)

| Item | Status | Note |
|------|--------|------|
| A1 institutional-memory/liability | ✅ Done | Trimmed ch1 Context "countdown" → "begins to expire"; ch3 Retain "institutional memory" → "the record of who speaks what". Kept ch1 hook + ch2 home. |
| A2 explainable vs opaque embedding | ✅ Done | Dropped "(as opposed to opaque embedding ranking)" in ch1 contributions, "rather than opaque models" in ch3 NFR, "chosen over opaque embedding ranking" in ch7 summary. Full argument stays in ch2 §sota-matching. |
| A3 never auto-rejects (3× in ch3) | ✅ Done | ch3 NFR Transparency trimmed to "ranks rather than deciding automatically"; ch3 UC-3 alt clause removed. Home kept = FR-06 acceptance. |
| A4 "boundary change, not a rewrite" | ✅ Done | ch4 reworded to describe the mechanism only; punchline kept solely in ch7 §concl-arch. |
| A6 survey maps 1:1 to pain points | ✅ Done | Removed duplicate in ch1 §Approach; kept ch1 §Problem + ch3 §analysis-pains home. |
| B1 onion inward-rule (5× in ch4) | ✅ Done | Reduced ch4 figure prose to layout only; rule still in intro + caption + arrow label. |
| D email row inconsistency | ✅ Done | ch5 tech-stack email row aligned with corrected ch4 wording. |
| A5 provider fallback reasoning | ⏸ Left | ch3 (risk register, terse) and ch7 (lesson) serve different purposes; not true duplication. |
| B2 "not a replacement for ATS" | ⏸ Left | On re-read it appears once per chapter (ch1 scope vs ch2 landscape) — different purposes. |
| B3 HMAC token contract | ✅ Done | ch4 §design-interviewer trimmed: dropped "narrowness… allowed the two developers to work in parallel… dividend" (parallel-work is ch3's organizational point; "narrow contract" already made post-figure). ch3 = organizational home, ch4 = technical contract. |
| B4 seven matching criteria re-listed | ⏸ Left | ch6 re-enumeration is justified — it documents test coverage per criterion. |
| E1 pure function / testable / reproducible | ✅ Done | Was stated 3× back-to-back in ch4 §4.5 (paragraph, post-figure prose, caption). Trimmed all three; testability home = ch6, embedding trade-off home = ch4 decisions table, summary claim = ch7. ch6 also dropped misplaced "explainable vs opaque" rationale from a *testing* paragraph. |
| E2 untrusted boundary / Zod schema | ✅ Done | Conceptual home = ch2 §sota-structured. Removed ch4 post-figure re-explanation ("never trusted until it has passed the Zod schema" → reference only); removed ch5 within-section restatement of "tolerant Zod schema and single retry" (already in 9-stage step 6). |
| E3 borderline → improvement track | ✅ Done | ch4 §Domain-Model prose explained the branch, then fig:status-sm caption restated it. Caption neutralized to "permitted status transitions from NEW through to a terminal outcome." Cross-chapter ch5 mentions left (implementation detail). |
| E4 lazy JD parse / cached until version changes | ✅ Done | Was 4× in ch4 (post-figure prose self-introduced during E1 fix, figure step s1, caption, §design-jd). Refocused §4.5 post-figure prose on the `job_matches` output cache; lazy-parse home = §design-jd + figure step. |
| E5 telemetry / CEFR / MoSCoW / RLS in ch6 | ⏸ Left | Re-checked in deep pass: terse contextual mentions across different chapters/sections (tables, value-object lists, security-review motivation). Not full re-explanations. |
| R1 single-origin "Maia location" 2× | ✅ Done | ch5 §impl-scoring paragraph compressed; rationale/limit deferred to ch7 §concl-partial (home). |
| R2 provider-fallback rationale re-explained | ✅ Done | Refines A5: removed the duplicate "single outage could not stop CV parsing" clause in ch3 §method-risks; lesson home = ch7 §concl-ai. |
| R3 "institutional memory → liability" (ch1↔ch2) | ✅ Done | ch1 hook kept; ch2 §sota-gdpr metaphor → "the central design pressure for a platform of this kind". |
| R4 ch1 §Approach vs §Team Composition overlap | ✅ Done | §Approach module list dropped, split deferred to §Team Composition (§team). |
| R5 computeJobFit orchestration re-narrated (ch4↔ch5) | ✅ Done | ch5 §impl-jobs deferred to §design-matching / fig:match-flow; kept only `job_matches` cache detail. |
| R6 single-respondent caveat 2× in ch6 §val-survey | ✅ Done | Opening "rather than a statistical sample" removed; caveat stated once at section close. |
| R7 HMAC clean-seam / parallel-work | ⏸ Left | Intro→design→reflection arc (ch3/ch4/ch7); different purpose per location. |
| I1 5-dim weights vs 3 CEFR sub-scores | ✅ Done | Added reconciliation sentence after ch4 `tab:value-objects` distinguishing `ASSESSMENT_DEFAULT_WEIGHTS` (general template) from the 3-sub-score language mode. |
| I2 dangling "backup phrasings" reference | ✅ Done | ch3 §analysis-pains "backup phrasings" → "complementary angles", matching appendix C. |
| I3 acronym expansion gaps (LEI-PROJ/PESTI/ISEP) | ⏸ Left | User chose to leave for now. |
| C-a…C-e compaction candidates | ✅ Done | Reported in pass 4; applied 2026-06-25 (see pass-4 "Compaction opportunities" table for per-item detail). |
| P1 duplicated Limitations sections (ch6 §val-limitations ↔ ch7 §concl-limitations) | ✅ Done | Pass 5. ch7 §concl-limitations rewritten as a terse roll-up: keeps its unique items (survey sample, test-coverage concentration, bulk serial cap) and defers the shared items (Chromium speech, OCR, free-tier ceiling, manual purge) to `\secref{sec:val-limitations}`. ch6 kept as the validation-surfaced home. |
| P2 service-area list verbatim (ch1 Context ↔ ch3 §framework-profiles) | ✅ Done | Pass 5. ch1 enumeration dropped ("provides shared services to other adidas companies across Europe"); ch3 owns the list (feeds `tab:language-profiles`). |
| P3 "900 staff / 22% intl / 15 languages" triple stated 3× | ✅ Done | Pass 5. Appendix C §survey-meeting copy replaced with a back-reference ("the shared-services centre profiled in `\secref{sec:context}`"). Abstract + ch1 kept. |
| P4 "Danger Zone" deletion + CSV export described twice (ch4 §design-gdpr ↔ ch5 self-service) | ✅ Done | Pass 5. ch4 §design-gdpr trimmed to design intent (erasure/access by the data subject) and defers the concrete control + document enumeration to `\secref{sec:impl-engagement}`. ch5 keeps the implementation detail. |
| P5 "same app, role-driven navigation" recurs (ch3/ch4/ch5) | ✅ Done | Pass 5. ch4 §design-frontend kept as architectural home; trimmed the echo in ch5 welcome ("so that neither persona is shown controls it cannot use") and ch5 user-guide ("so each persona sees only the features it can actually use" — the later middleware sentence already makes the point). |
| P6 nine pain points fully restated in appendix C §survey-meeting | ✅ Done | Pass 5. Kept the evidentiary list (it carries unique per-point client annotations) but reframed the intro as "the raw source later consolidated into `\tabref{tab:pain-points-overview}`", making the relationship explicit. |
| P7 internal date contradiction in appendix C (four-question bank: Feb vs 28 Apr) | ✅ Done | Pass 5. Subsection header "(28 April session)" → "(February draft)", consistent with the `tab:meeting-log` "Feb 2026 … drafted" row. |
| P8 meeting-log end date under-runs internship window | ✅ Done | Pass 5. `tab:meeting-log` last row "May–Jun 2026" → "May–Jul 2026", consistent with the 9 July end. |
| P9 abstract overstates CV-time benefit vs ch6 honest finding | ✅ Done | Pass 5. Abstract "reduces manual CV-screening time" → "makes CV-derived data reusable across openings" — a claim the validation backs. |
| P10 Objective 4 wording drift ("verify candidate" vs "language" proficiency) | ✅ Done | Pass 5. ch7 Goals-Achieved item aligned to ch1's broader "Verify candidate proficiency" title and body now names both modes (CEFR language + rubric-based technical-skill). |
| Q1 job-matching-bridge defect told twice (ch5 §impl-jobs ↔ ch6 §val-unit) | ✅ Done | Pass 6. ch5 §impl-jobs paragraph compressed to a one-line pointer ("a subtle defect … and the regression suite that now locks it down — is discussed … in Chapter 6"); the full bug narration now lives only in ch6 §val-unit. |
| Q2 client-driven backlog / MoSCoW-makes-deferral-explicit (ch3 §method-backlog ↔ ch7 §concl-po) | ✅ Done | Pass 6. ch7 §concl-po now leans on `\secref{sec:method-backlog}` ("the MoSCoW-prioritised, pain-point-traceable ordering of §method-backlog") instead of restating it verbatim; ch3 keeps the methodology statement. |
| Q3 PO+lead-implementer scope-creep risk (ch1 §team, ch3 §method-scrum, ch3 §method-risks, ch7 §concl-po) | ✅ Done | Pass 6. ch3 §method-risks clause trimmed: the dual-role amplification now defers to `\secref{sec:concl-po}` and references `\secref{sec:method-backlog}` for MoSCoW; the full lesson stays in ch7. |
| Q4 "fusion of sprint review with client acceptance" (ch3 §method-scrum, ch6 §val-manual, ch7 §concl-po) | ✅ Done | Pass 6. ch7 §concl-po now references `\secref{sec:method-scrum}` ("the dedicated client-acceptance session that doubled as the sprint review") instead of restating the fusion; ch3 §method-scrum = methodology home, ch6 §val-manual brief mention kept. |
| Q5 lazy JD-parse description near-verbatim (ch4 §design-jd ↔ ch6 §val-performance) | ✅ Done | Pass 6. ch6 §val-performance now defers to `\secref{sec:design-jd}` and shortens "persisted with a schema version so that it is reused until the source changes" → "cached with a schema version"; ch4 §design-jd remains the home. |
| Q6 four-item contributions list near-identical (ch1 §Approach ↔ ch7 §concl-summary) | ✅ Done | Pass 6. ch7 §concl-summary bullets 1 and 4 reworded toward delivered/realised ("The reference architecture — … delivered and deployed to production"; "The project-management experience report … delivered as the Ch.analysis narrative") to reduce verbatim overlap with the ch1 claim list. |
| i1 CV-scoring table appears to weight years-of-experience twice (ch5 `tab:cv-scoring`) | ✅ Done | Pass 6. ch5 §impl-scoring prose now distinguishes the two experience components: 25% “Experience” = role-relevance proxy (replaced by job-anchored LLM relevance in fit mode), 10% “Years of experience” = raw tenure; notes the generic score proxies the former by the latter. |
| i2 "largest single weight" tie (ch5 §impl-scoring) | ✅ Done | Pass 6. Reworded to "Language proficiency carries the largest weight of any single criterion (35%)", pre-empting the experience 25%+10% objection (applied with i1 in the same edit). |
| i3 acronym expansions (LEI-PROJ/PESTI/ISEP) | ⏸ Left | Pass 6 re-confirmed — user keeps as-is (consistent with pass-2 disposition). |
| LLM-naming proliferation (Groq/OpenAI named ~11× in prose + tables) | ✅ Done | Pass 7. Genericised all linear-prose mentions to "LLM provider / fallback provider / provider fallback" (ch2 sota-positioning, ch3 §method-risks, ch3 NFR, ch4 §design-overview, ch4 §design-cv, ch5 §impl-cv, ch6 §val-limitations). Concrete names kept only where a reader looks them up: abstract, ch4 `tab:containers` + C4/sequence diagrams + decision log, ch5 `tab:tech-stack` + the cost-comparison section (which is *about* comparing them), ch3 risk-register table row, and the ch7 §concl-ai lesson. |
| U1 ch3 §analysis-nfr prose duplicates `tab:nfr` | ✅ Done | Pass 7. The five-item `description` list (same attributes the table already covers, with less info) compacted to a 2–3 sentence lead-in naming the attributes; `tab:nfr` now carries the per-attribute mechanism/verification. |
| U2 ch3 §framework-bridge backwards-in-time reference | ✅ Done | Pass 7. Demands now "echo the validated pain points of §analysis-pains and crystallise into the functional requirements of the next section" — backward ref (pains, earlier) and forward ref (FRs, next) no longer share one verb. |
| U3 Resend sender-domain note near-duplicated across two tables | ✅ Done | Pass 7. ch4 `tab:containers` Email row reworded ("live delivery gated on sender-domain verification") so it no longer echoes the ch5 `tab:tech-stack` row ("live delivery pending sender-domain verification"). |
| U4 FR table out-of-sequence IDs | ⏸ Left | Pass 7. Correct by design (grouped by module; caption states it); user chose to leave as-is. |

---

## STATUS legend

✅ Done = trimmed/de-duplicated this session. ⏸ Left = re-checked and judged
acceptable (different purpose per location, or terse fact rather than full
re-explanation).


---

## How to read this

The problem you described is the **"mention that already half-explains, then a full
explanation that adds little"** pattern. There are two distinct things happening in the
document:

1. **Signposting / forward references** (`...as detailed in Chapter X`) — these are
   *correct* and expected in a thesis. They are NOT the problem. Listed at the bottom
   as "leave alone".
2. **Concept re-explanation** — the same idea is explained in full, with similar
   wording, in 3–6 different places. This is what makes a reader feel they are reading
   the same paragraph twice. This is the real target.

Recommended rule of thumb: **each core concept gets ONE "home" where it is explained in
full; every other appearance is reduced to a single clause + a reference to the home.**

---

## A. High-severity repeated concepts (explained in full multiple times)

### A1. "Six-month GDPR rule turns institutional memory into a liability"
The single most repeated *phrase-level* idea. The "institutional memory → liability →
countdown" framing appears almost verbatim 4×.

| # | Location | Phrasing |
|---|----------|----------|
| 1 | ch1 §intro (1st para) | "...turns institutional memory into a liability rather than an asset." |
| 2 | ch1 §Context (last discovery para) | "...the institutional memory it generated starts a countdown." |
| 3 | ch2 §sota-gdpr | "This single constraint is what turns institutional memory into a liability..." |
| 4 | ch3 §framework-pillars (Retain) | "...the institutional memory of who speaks what is precisely the data the rule forces a team to delete." |

**Assessment:** #1 and #2 are in the *same chapter, two paragraphs apart* — that is the
most jarring. **Suggested home:** ch2 §sota-gdpr (it's the regulatory chapter).
Keep #1 as the motivating hook (it's the opening, it earns its place), trim #2 to remove
the "countdown" restatement, and in ch3 #4 keep it (different angle: framework/retain)
but it could drop the "institutional memory" clause since ch2 just said it.

---

### A2. "Explainable, per-criterion matching vs. opaque embedding ranking"
The core contribution — so *some* repetition is justified — but the **explicit contrast
with "opaque embedding ranking"** is spelled out ~7×.

| # | Location | Phrasing |
|---|----------|----------|
| 1 | ch1 §Objectives (obj. 3) | "rule-based fit algorithm ... exposes per-criterion explanations" |
| 2 | ch1 §Approach (contributions) | "auditable per-criterion (as opposed to opaque embedding-based ranking)" |
| 3 | ch2 §sota-matching | full embedding-vs-rule explanation + "opaque" |
| 4 | ch2 §sota-matching (explainability para) | the "$0.83$ is not an answer a recruiter can defend" example |
| 5 | ch2 §sota-summary table (tab:sota-positioning) | "Pure, unit-tested computeJobFit ... per-criterion breakdown" |
| 6 | ch3 §analysis-nfr (Transparency) | "Decisions are produced by deterministic formulas with per-component breakdowns rather than opaque models" |
| 7 | ch7 §concl-summary + §concl-goals | "chosen over opaque embedding ranking precisely because every criterion is explainable" |

**Assessment:** **Home = ch2 §sota-matching** (this is where the full argument belongs,
including the $0.83$ example). Everywhere else should *assert* explainability, not
*re-argue* it against embeddings. Specifically: ch1 #2, ch3 #6 and ch7 #7 each repeat
the "vs opaque" contrast — at least two of those can drop the contrast and just say
"explainable, per-criterion". The contribution can be claimed without re-litigating the
embedding comparison each time.

---

### A3. "The assessment never auto-rejects / is advisory / human review"
Stated ~6×, several almost identical.

| # | Location | Phrasing |
|---|----------|----------|
| 1 | ch1 §Scope | "any feature that would auto-reject a candidate without human review" |
| 2 | ch2 §sota-conversational | "the assessment never auto-rejects a candidate; it produces an explainable, rubric-based result for human review" |
| 3 | ch2 §sota-speech | "Because the assessment is advisory and never auto-rejects..." |
| 4 | ch3 §analysis-nfr (Transparency) | "the system only ranks — it never auto-rejects a candidate without human review" |
| 5 | ch3 §FR-06 (Acceptance) | "never auto-rejects" |
| 6 | ch3 §usecases UC-3 (Alt) | "the result never auto-rejects the candidate" |

**Assessment:** #2 and #3 are in the *same chapter*. #4, #5, #6 are all in ch3 (NFR, FR
spec, use-case table) — three times in one chapter. **Home = ch2 §sota-conversational.**
In ch3 it only genuinely needs to appear *once* (the FR-06 acceptance criterion is the
natural place); the NFR Transparency bullet and the UC-3 alt-path can both lose the
phrase or compress it.

---

### A4. "AI Interviewer extracted as a separate process → boundary change, not a rewrite"
The onion-architecture payoff story. Told 4×, with the punchline "boundary change, not a
rewrite" reused almost verbatim.

| # | Location | Phrasing |
|---|----------|----------|
| 1 | ch1 §Approach | "...proved decisive when the AI Interviewer module had to be slotted in as a separate process" |
| 2 | ch3 §method-boundary | "This clean seam is also what made the onion architecture pay off in practice" |
| 3 | ch4 §design-onion | "...made a contract change rather than a rewrite." |
| 4 | ch7 §concl-arch | "...was a boundary change, not a rewrite." |

**Assessment:** This is a *good story* and belongs in the conclusions (#4) as a lesson.
But #3 (ch4) and #4 (ch7) state the punchline twice. **Home = ch7 §concl-arch** (it's a
"lesson learned"). ch4 #3 should describe the *mechanism* (the boundary exists) without
pre-empting the "payoff" narrative that ch7 then delivers — otherwise ch7 reads as a
recap. ch1 #1 and ch3 #2 are brief enough to keep.

---

### A5. "Provider fallback Groq→OpenAI = single point of failure becomes degradation"
~6 appearances; mechanism re-described several times.

| # | Location | Phrasing |
|---|----------|----------|
| 1 | ch1 §Objectives (obj.2) | "Groq Llama 3.3 70B as primary, OpenAI GPT-4o as fallback" |
| 2 | ch2 §sota-cv | "constraining the model ... and a provider fallback" |
| 3 | ch3 §analysis-nfr (Cost) | "Groq as the primary LLM with an OpenAI fallback" |
| 4 | ch3 §method-risks | "...so that a single outage could not stop CV parsing" |
| 5 | ch4 §design-overview | "Groq as primary, OpenAI as fallback" |
| 6 | ch5 §impl-cv | "absorbed by retrying the same request against the OpenAI fallback" |
| 7 | ch7 §concl-ai | "turned a single point of failure into a degradation rather than an outage" |

**Assessment:** Naming "Groq primary / OpenAI fallback" repeatedly is fine (it's a
fact, stated tersely). The **reasoning*"single outage → degradation"** is the part that
recurs as an explanation — #4 and #7 say the same thing. **Home for the reasoning = ch7
§concl-ai** (AI lesson). ch3 §method-risks #4 can keep a short version since risk
register is its job, but it shouldn't be a full re-explanation.

---

### A6. "Survey maps one-to-one onto the nine pain points"
Stated 4×.

| # | Location | Phrasing |
|---|----------|----------|
| 1 | ch1 §Problem Statement | "an instrumented survey with one question per pain point" |
| 2 | ch1 §Approach | "a structured feedback survey mapped one-to-one onto the nine pain points" |
| 3 | ch3 §analysis-pains | "each pain point maps to exactly one question" |
| 4 | ch6 §intro | "a structured survey mapped one-to-one onto the pain points" |

**Assessment:** #1 and #2 are again *same chapter*. **Home = ch3 §analysis-pains** (that
section is literally "Pain Points and Survey Validation"). ch1 needs the survey mentioned
once, not twice; ch6 intro can keep a one-liner as it sets up the validation chapter.

---

## B. Medium-severity repetition (descriptions restated, lower wording overlap)

### B1. Onion "dependencies point inward / Domain has zero deps" — *stated 3× inside ch4 alone*
Within **ch4 §design-onion**, the inward-dependency rule is stated three times in close
succession:
- the intro sentence ("dependencies always point inward... Domain ... zero external dependencies"),
- the prose under Figure (fig:onion) ("its source-code dependencies point *inward*"),
- the **caption** of fig:onion ("All source-code dependencies point inward toward a dependency-free Domain").

Plus the same rule appears in ch1 §Approach, ch2 §sota-architecture, ch5 §impl-layout,
ch6 §val-verification. **Assessment:** the *cross-chapter* ones are fine (different
purposes). The *three-in-one-section* in ch4 is redundant — the caption + figure prose
say the identical thing back-to-back. Trim one of the two figure-adjacent statements.

### B2. "Not a replacement for the ATS / right-sized talent-intelligence layer"
- ch1 §Scope ("not a replacement for the enterprise ATS")
- ch2 §sota-recruitment ("not as a competitor to a full ATS but as a right-sized talent-intelligence tool")
- ch2 §sota-recruitment (2nd para, restates the same positioning)
- ch2 §sota-summary
**Assessment:** ch2 states the positioning twice within the same section. Keep one.

### B3. "HMAC-signed token contract" description
- ch1 §Approach/contributions + §team, ch3 §method-boundary, ch4 §design-overview, ch7 §concl-summary.
**Assessment:** the *contract* is described (core issues token → sidecar runs interview →
core persists result) in ch3 and ch4 in similar terms. Home = ch4 (design). ch3
§method-boundary can compress, since ch4 carries the full contract.

### B4. "computeJobFit: seven criteria, average of applicable only, isEligible flag"
- ch1 §Objectives (obj.3, lists the criteria families)
- ch4 §design (matching algorithm)
- ch6 §val-unit (re-lists all seven criteria + the rules)
**Assessment:** listing all seven criteria in both ch4 and ch6 is duplicative. ch6 can
say "all seven criteria (see §design-matching)" instead of re-enumerating.

### B5. Two-person team / PO + lead-dev / scope-creep guardrails
- ch1 §Team, ch3 §method-scrum + §method-risks, ch7 §concl-po.
**Assessment:** mostly OK because each has a different focus (composition / process /
lesson). Watch only the "same person = PO + implementer → scope creep" sentence, which
appears in ch3 §method-risks and again in ch7 §concl-po with similar wording.

### B6. Browser-native speech / Chromium-only / server-side fallback = future work
- ch1 §Scope, ch2 §sota-speech, ch3 §analysis-nfr (Cost), ch7 §limitations.
**Assessment:** each is brief; acceptable. Only ch2 gives the full explanation (correct
home). Others are one-liners — leave.

---

## E. Found in the deep pass (2026-06-22)

A second, systematic sweep across all seven chapters for recurring *motifs*
(not just phrases). Five new clusters were found and fixed; the worst were
**back-to-back restatements inside a single section** — the exact pattern that
makes a reader feel they are reading the same paragraph twice.

### E1. "Pure function / dependency-free / reproducible / unit-testable" (ch4 §4.5)
The reader's flagged example. The `computeJobFit` property was asserted **3×
within §4.5 alone**:
1. the `computeJobFit` paragraph ("pure and dependency-free… exhaustively unit-tested… preferred over opaque embedding"),
2. the post-figure prose ("scoring is a pure function… reproducible and exhaustively testable"),
3. the figure caption ("a pure, dependency-free function… reproducible and unit-testable").

Plus ch6 (testing) and ch7 (contribution). **Fix:** §4.5 paragraph now ends on
its unique fact (per-criterion explanation → traceable). Post-figure prose now
describes the *output cache* instead. Caption is a plain flow description.
ch6 kept the testability fact but dropped a misplaced "explainable vs opaque"
*design* rationale that didn't belong in a *testing* paragraph. **Homes:**
testability = ch6; embedding trade-off = ch4 decisions table; one summary
claim = ch7.

### E2. "Untrusted boundary / never trusted until it passes the Zod schema"
**Home = ch2 §sota-structured** (the conceptual argument: "treats the model as
an untrusted boundary… reliability lives less in the model than in the
contract"). Redundant restatements removed:
- ch4 post-figure prose explicitly *re-explained* it ("the model's output is never trusted until it has passed the Zod schema") → reduced to a reference to ch2.
- ch5 §impl-cv stated "tolerant Zod schema and the single retry" in the schema-drift sentence, immediately after step (6) of the 9-stage list already said "validate… against a strict Zod schema, retrying once" → schema-drift sentence reworded to "the schema's tolerant coercion rather than a hard rejection."

### E3. "Borderline → improvement track → re-evaluation" (ch4, back-to-back)
ch4 §Domain Model prose explained the borderline branch, then the very next
element — the **fig:status-sm caption** — restated it. Caption neutralized to
describe the figure ("permitted status transitions from NEW through to a
terminal outcome"). The cross-chapter ch5 implementation mentions were left
(different purpose: how the track is built).

### E4. "Lazy JD parse / cached until source or schema version changes" (ch4, 4×)
Stated four times within ch4: the §4.5 post-figure prose (introduced while
fixing E1), the matching figure's step s1, the matching figure caption, and
**§design-jd**, which is its natural home. **Fix:** the §4.5 post-figure prose
no longer re-explains lazy parsing — it now covers only the `job_matches`
output cache, which is the matching section's own concern. Lazy parsing stays
in the figure step and §design-jd.

### E5. HMAC "narrow contract → parallel work" (ch3 ↔ ch4, and ch4 internal)
- **Cross-chapter:** ch3 §method-boundary owns the *organizational* point
  ("the two members could work in parallel with minimal coordination"); ch4
  §design-interviewer repeated "allowed the two developers to work in
  parallel."
- **Within ch4:** §design-interviewer also made the "narrow contract" point
  twice (end-of-paragraph + post-figure prose).

**Fix:** dropped the end-of-paragraph sentence in ch4 ("The narrowness of this
token contract is what allowed the two developers to work in parallel and is
the clearest dividend of the onion boundary"). ch4 now describes the technical
contract and lets the post-figure sentence carry the "small contract" point
once; the parallel-work dividend stays in ch3.

### Re-checked and left as acceptable (deep pass)
- **Telemetry** ("fire-and-forget row per extraction"): full column list in ch4
  §design-cv; ch5 mentions are one-clause and in a different section
  (Observability). Not a re-explanation.
- **CEFR**: appears in tables, the value-object list and the interviewer
  result — all terse, context-specific.
- **MoSCoW / deferred feature families**: ch3 is the home; other mentions are
  brief.
- **RLS / server-side trust boundary in ch6**: the security review *references*
  the design decision to justify why the auth suites matter — it does not
  re-explain the mechanism. Full explanation stays in ch4 §Access-control.

---

## What is still open (nothing blocking)

- **A5, B2, B4, B5, B6** remain ⏸ Left — re-confirmed in the deep pass as
  serving distinct purposes per location, not true duplication.
- No further same-section back-to-back restatements were found after E1–E5.
  The "mention-then-full-re-explanation" pattern the reader objected to has
  been removed from its worst offenders (ch4 §4.5, §design-interviewer,
  §Domain Model; ch5 §impl-cv; ch6 testing rationale).

---

## C. Acceptable / structural repetition — **leave alone**

These are normal thesis scaffolding, not the problem you described:

- **Chapter intros** (each chapter opens by restating its own scope) — standard, keep.
- **Forward/back references** of the form `...as detailed in Chapter X` / `...revisited
  in Chapter Y` — these are signposting, not re-explanation. Keep all.
- **Objective list (ch1 §Objectives) vs. Goals-achieved (ch7 §concl-goals)** — the
  deliberate "promise then deliver" structure. Keep; the ch7 version is terse.
- **Pain-points table (ch1) referenced again in ch3/ch6** — same table reused, not
  re-explained. Keep.
- **Tech facts** restated tersely (Next.js 16 / Supabase / Vercel) — naming a fact in
  passing is fine; only flag if a *full rationale* is repeated.

---

## D. Bonus — factual inconsistency spotted while reading (not a repetition)

- **Email row, tech-stack table, ch5 §impl-stack (tab:tech-stack)** still reads
  *"Assessment invitations and outreach"* — but we just corrected the ch4 container
  table (tab:containers) to *"HR-to-candidate outreach; sender-domain verification
  required before live delivery"*. These two tables now disagree. Worth aligning ch5 to
  the (accurate) ch4 wording, and note that `sendMagicLink` (assessment invitations) is
  scaffolded-but-unwired, so "Assessment invitations" overclaims in *both* the tech
  stack and anywhere else it appears.

---

## Suggested order of attack (when you're ready)

1. **A1, A3, A6** — fix the *same-chapter* duplicates first (ch1 internal, ch3 internal,
   ch2 internal). These are the most visible to a linear reader.
2. **A2, A4, A5** — decide the single "home" for each core concept, reduce the others to
   a clause + reference.
3. **B1, B2** — trim the back-to-back restatements inside one section.
4. **D** — align the ch5 email row (factual, quick).

Tell me which items you agree with and I'll apply them one cluster at a time.

---

## Deep-review pass — 2026-06-24

Full chapter-by-chapter review of the whole document for (1) inconsistencies,
(2) missing bibliography references, (3) repetition/duplication, (4) things that
could be better described. Findings were presented first; the items below were
then **applied**. Items A1, A2, D1, D2 and D5 were reviewed and **deliberately
left unchanged** (see notes).

### Inconsistencies

| Item | Status | Change applied |
|------|--------|----------------|
| A1 Dedication names wrong people ("wife Pelin", "José Silva") | ⏸ Left | User confirmed the dedication is intentional/correct. No change. |
| A2 Supervisor count (Nuno only vs Nuno + Ana Cláudia in ch3) | ⏸ Left | By design: Nuno = supervisor, Cláudia = project coordinator. No change. |
| A3 Language sub-scores: 3 (grammar/vocab/fluency) vs 5 (adds clarity/customer handling) | ✅ Done | ch5 §impl-scoring reworded to average the **three** CEFR sub-scores, matching ch1/ch2/ch3/ch4/ch7. The 5-dimension `ASSESSMENT_DEFAULT_WEIGHTS` value object (ch4 table) is the separate generic template and stays. |
| A4 Survey sample: "distributed to employees" (ch3) vs single respondent (ch6) | ✅ Done | ch3 §analysis-pains rewritten: completed by the **single lead HR stakeholder**, treated as a single-respondent indicator, not a representative sample. |
| A5 Survey size: "one question per pain point" (~9) vs "fourteen-item" (ch6) | ✅ Done | ch1 → "a fourteen-item survey covering every pain point"; ch3 → "a fourteen-item survey in which each pain point is covered by at least one question (with backup phrasings)". |
| A6 CV-scoring worked example arithmetic (language score 60 didn't derive) | ✅ Done | ch5 example fixed: language score `60`→`55` (English C1 30 + Portuguese C2 25); overall `≈73`→`≈71`. |
| A7 "special-category personal data under GDPR" (ch6) — legally inaccurate | ✅ Done | ch6 §val-security → "personal data under GDPR" (CV data is ordinary, not Art. 9 special-category). |
| A8 Two token lifetimes (10-min interview token vs 48-h magic link) conflatable | ✅ Done | ch4 §design-interviewer now states the 10-min token governs the live session only and is distinct from the 48-h `MAGIC_LINK_EXPIRY_HOURS` invitation link. |
| A9 / D4 Abstract keyword "Retrieval-Augmented Prompting" (system uses no RAG) | ✅ Done | frontmatter abstract → "Structured-Output Prompting". |

### Missing bibliography references

| Item | Status | Change applied |
|------|--------|----------------|
| B1 ISO/IEC 25010 entry defined but never cited | ✅ Done | Added `\parencite{ISO25010}` at the NFR/ISO 25010 sentence in ch3. |
| B2 Vendors cited inconsistently (Workday/Greenhouse/Personio/Manatal cited; others not) | ✅ Done | Added `@misc` entries + `\parencite` for SmartRecruiters, Lever, Recruitee (ATS), Sovren, RChilli (CV parsers), HireVue, Sapia, MyInterview (interview vendors) in ch2. |
| B3 OWASP Top 10, Whisper, MoSCoW named without references | ✅ Done | Added `OWASPTop10`, `Radford2022Whisper`, `DSDMMoSCoW` to .bib and cited in ch4 (OWASP), ch2 (Whisper), ch3 (MoSCoW). |
| B4 `TMDEIThesisTemplate` entry defined but unused | ✅ Done | Deleted from `mainbibliography.bib` (confirmed no `\cite`/`\nocite`). |

### Repetition / duplication

| Item | Status | Change applied |
|------|--------|----------------|
| C1 job-matching-bridge "title vs jobTitle" bug told twice in full (ch5 + ch6) | ✅ Done | ch5 §impl-jobs compressed to one sentence; full account deferred to ch6 §glue-between-layers. |
| C2 "contract wrapped around it" metaphor near-verbatim twice in ch2 | ✅ Done | ch2 §2.2.1 (CV Parsing) reworded to "validation and recovery machinery"; the metaphor now appears only in §2.2.4 (Structured Output). |
| C3 "advisory / no auto-reject / Article 22" theme repeated ~6× | ✅ Done | ch7 bias paragraph trimmed to cross-ref the canonical statement (`sec:design-hardening`). |
| C4 "six-month GDPR retention rule" restated ~8× in full | ✅ Done | ch3 §framework-pillars consent-renewal detail condensed; full version kept only in ch7 future work. (Conceptual home remains ch2 §sota-gdpr.) |
| C5 CV-parsing pipeline described in full in both ch4 (design) and ch5 (impl) | ✅ Done | ch4 §design-cv made conceptual ("LLM as untrusted boundary"); stage-by-stage list, dedup tiers and telemetry deferred to ch5 §impl-cv. |
| C6 Maia hardcoded-origin mentioned 3× (ch5 + ch7 §partial + ch7 §future) | ✅ Done | ch7 future-work list reduced to a concise pointer (`sec:concl-partial`) instead of re-describing it. |

### Improvements / better description

| Item | Status | Change applied |
|------|--------|----------------|
| D1 `interview_sessions` in ER diagram but not in domain narrative | ⏸ Left | Out of scope (AI Interviewer is the teammate's module). No change. |
| D2 "33 application tables" stated without motivation | ⏸ Left | Judged not worth a change. |
| D3 Parse-cost table `$/CV` column rounding inconsistent | ✅ Done | ch5 `tab:parse-cost` `$/CV` values made consistent with per-1k figures: 0.00081 / 0.00177 / 0.00504 / 0.01350. |
| D4 Abstract misrepresents technical contribution (RAG) | ✅ Done | Same fix as A9 — keyword corrected to Structured-Output Prompting. |
| D5 Mixed float placement (`[ht]`/`[H]`/`[t]`) | ⏸ Left | To revisit during a later figure-arrangement pass. |

### New .bib entries added this pass

`SmartRecruiters`, `Lever`, `Recruitee`, `Sovren`, `RChilli`, `HireVue`, `Sapia`,
`MyInterview`, `OWASPTop10`, `Radford2022Whisper`, `DSDMMoSCoW`.
Removed: `TMDEIThesisTemplate`.

### Validation

`get_errors` clean on all edited files. Recompile order to refresh the new
citations: pdfLaTeX → biber → pdfLaTeX ×2.

### Still open (honesty caveats noted earlier, not yet actioned)

- Verify page numbers / first-author spelling for Holm, Faliagka, Laumer, Qin,
  Jiang citations before final submission.
- Optional float-placement consistency pass (D5).

---

## Second double-check pass — 2026-06-24

A fresh, independent chapter-by-chapter re-read of the **whole** document
(ch1–ch7, frontmatter, appendix C) after the first deep-review pass above, to
catch anything remaining or newly introduced. Six findings were reported; the
user then chose which to act on. The survey `.docx` source files
(`AppReport/client-pain-points/TalentPool-survey.docx` and
`…-answers.docx`) were extracted and used as ground truth.

### Verified CONSISTENT (no change needed)

- **305 test cases / 18 files** — agree across abstract, ch6 prose, table
  caption, and the row sum of `tab:test-inventory`.
- **Nine pain points**, **four contributions**, **seven objectives** — counts
  match across ch1/ch3/ch6/ch7.
- **CV/CEFR scoring** worked example (`≈71`) — arithmetic checks out
  (17.5+7+12+15+19.25 = 70.75).
- **job-matching-bridge bug** — ch5's compressed one-liner correctly defers to
  ch6's full account (C1 from the first pass holds).

### Findings and dispositions

| Item | Status | Change applied |
|------|--------|----------------|
| 1. Appendix C printed survey instrument listed only **9 questions + 3 backups (12 items)**, contradicting the "fourteen-item" claim and the 14-row `tab:survey-responses`. Rows 11 (30–60% unqualified CVs) and 14 (cross-team coordination) — both cited as Q11/Q14 in ch6 — had **no matching printed question**. | ✅ Done | Cross-checked against the two `.docx` files: the **real survey has 14 distinct questions** (no separate backup structure), and `tab:survey-responses` was already accurate. Replaced the outdated draft instrument in `appendixC.tex` with the **14 questions exactly as administered**, numbered 1–14 to align with the response rows. Historical "Original four-question bank (28 April session)" subsection kept as-is. |
| 2. ch5 §impl-engagement said "through **four further modules**" but then described **six** `\paragraph` modules (welcome page, user guide, ambassador programs, improvement tracks, candidate segments, candidate self-service). | ✅ Done | "four further modules" → "six further modules". |
| 3. Residual "audit" terminology in ch3 conflicted with the "security review" reframing used in ch5/ch6/ch7. Two spots: `tab:nfr` Security row ("Auth + redaction suites; **audit**") and risk register ("Leaked credential… **Audit**, key rotation…"). | ✅ Done | Both changed "audit" → "review". Generic feature terms ("audit trail", "auditable", "audited inventory") deliberately left untouched — different meaning. |
| 4. ch3 `tab:functional-requirements` "MoSCoW priority" column carries value **"Emerged"** (FR-16, FR-17) — not a MoSCoW level. | ✅ Done | FR-16 (Per-skill verification) → **Should**, FR-17 (Auth and RBAC) → **Must**. The column is now pure MoSCoW; the "several emerged only once the platform was in real use" provenance is preserved by the intro sentence above the table. |
| 5. ch6 §val-performance: ambiguous "the remediation identified during **that review**" — nearest antecedent is the security-review section, but this is a **performance** bottleneck. | ✅ Done | Reworded to "The remediation identified for this bottleneck…", removing the dangling reference. |
| 6. Objective 4 wording drift: ch1 "Verify candidate proficiency" (incl. technical mode) vs ch7 "Verify language proficiency" (CEFR only). | ⏸ Left | User chose to leave as-is. |

### Validation

`get_errors` clean on all edited files (`appendixC.tex`, ch3, ch5, ch6).
Recompile order to refresh references/labels: pdfLaTeX → biber → pdfLaTeX ×2.

### Note on the filename

The first-pass "rename" only changed the **H1 title inside** this file. The file
was later renamed on disk from `repetition-analysis.md` to
`report-review-change-log.md` (third pass, 2026-06-24) to reflect that it now
covers the repetition analysis **and** the deep-review / double-check /
triple-check change logs.

---

## Third triple-check pass — 2026-06-24

A second independent verification pass over the **whole** document plus the
appendices, run after the Table B.1 overlay fix below. Unlike the prose-focused
passes above, this one cross-checked the report's **claims against the actual
codebase** (the canonical schema `supabase/migrations/00000000000000_schema.sql`)
and ran mechanical integrity checks (glossary keys, citations, cross-references).
Findings reported to the user; **dispositions still pending** (user will decide
what to act on).

### Table B.1 overlay fix (two attempts)

- **Symptom**: Appendix B Table B.1, the row for
  `/api/candidates/[id]/skills/[skillId]/verification` overflowed its
  `p{6.4cm}` column and overlapped the "HR" text in the Access column.
  (After the Appendix B renumbering this is **row 7**, formerly row 42.)
- **Root cause**: the path never broke onto a second line. The original
  `\apiep` macro used `xstring`'s `\StrSubstitute{#1}{/}{\allowbreak/}`, which
  fails because xstring's optional-argument scanning chokes on the `[id]` /
  `[skillId]` **brackets** in the path.
- **Attempt 1 (insufficient)**: `\apiep` rewritten as `\nolinkurl{#1}`
  (hyperref/url). This still did **not** break the bracketed path — url-style
  breaking is also defeated by the `[`/`]` tokens — so the overlay persisted.
- **Attempt 2 (working)**: `\apiep` rewritten as a self-contained tokenizer in
  `main.tex` that walks the path one token at a time and inserts a real
  `\allowbreak` after every `/` and `]`. This is immune to the brackets and
  forces the long path to wrap. Longest unbreakable segment is now
  `verification` (~2.1 cm), well within the 6.4 cm column. `xstring` stays
  removed (confirmed `\Str*` used nowhere else). `get_errors` clean on
  `main.tex` and `appendixB.tex`.


### Verified CONSISTENT (mechanical checks, no change needed)

- **Bibliography hygiene**: 45 cited keys = 45 defined entries; **zero undefined
  citations, zero uncited entries**. The 11 entries added in pass 1 are well-formed.
- **Cross-references**: 153 labels / 78 distinct references — **none broken**
  (appendix targets `sec:design-authz`, `sec:design-security`, `app:survey`,
  `app:prompts-development`, etc. all resolve).
- **Glossary**: zero undefined `\gls{}` keys.
- **Document-wide counts agree**: 33 tables, 66 endpoints, 305 tests / 18 files,
  nine pain points, fourteen-item survey, 900 staff / 22% international /
  15 languages / four subprojects, nine-stage parsing, seven built-in charts,
  sixteen/twelve user-guide sections, sixteen fields of work.

### Findings and dispositions

| Item | Severity | Status | Detail |
|------|----------|--------|--------|
| T1. **Appendix A enum count wrong.** `appendixA.tex` claims "**27** enumerated types" in two places (intro: "consolidates 27 enumerated types and 33 tables"; `lst:enums` caption: "All 27 enumerated types."). The canonical schema has only **19** `CREATE TYPE` statements, and the listing itself shows **20**. So "27" matches neither the schema nor the listing. | Major | ✅ Done | "27" → "19" in both the intro and the caption. |
| T2. **Appendix A enum listing membership wrong.** `lst:enums` lists `interview_mode`, `ambassador_program_status`, `ambassador_application_status` as ENUM types — but in the real schema these are plain `TEXT` columns (`interview_mode TEXT NOT NULL DEFAULT 'TECHNICAL'`; ambassador tables use TEXT status fields), **not** enum types. It also **omits two real enums** that do exist: `internship_status` and `assessment_type`. | Major | ✅ Done | Removed the 3 non-enums; added `internship_status` (after `job_type`) and `assessment_type` (before `assessment_status`), matching schema order. Listing now = 19 enums. |
| T3. **Appendix B endpoint numbering out of sequence.** Count (66) is correct and every ID 1–66 appears exactly once, but within each module group the IDs jump (e.g. Candidates shows 1,2,3,4,5,41,42,52,53,54) because they were assigned in creation order then regrouped. | Minor (cosmetic) | ✅ Done | Renumbered 1–66 sequentially by group order; verified sequential. |
| T4. **Unused glossary entries.** Five entries are defined but never wired via `\gls{}`, so they won't surface: `hmac`, `jwt`, `po` (Product Owner), `rest`, `scrum`. The terms appear as plain prose. | Minor | ✅ Done | Wired first use of each: `\gls{scrum}` + `\gls{po}` (ch1 §Approach), `\gls{hmac}` (ch1 contributions), `\gls{rest}` (ch1 §team), `\gls{jwt}` (ch5 tech-stack table). Glossary now reports zero unused. |
| T5. **Dedication vs teammate name (residual).** Dedication thanks "José Silva… teammate… evenings and weekends we spent together working", which a reader may conflate with the TalentHub teammate Stratos Demertzoglou named in the acknowledgements/body. | Latent | ⏸ Left | User confirmed José Silva is a **course colleague**, not the project teammate — intentional, no change. |

### Root cause of the "27" figure (investigated on request)

The "27 enumerated types" claim was **inherited from stale project-memory docs
and never re-counted against the consolidated schema**. The figure originates in
three tracking documents that still carry the pre-consolidation pair
"27 ENUMs / 25 tables":

- `CLAUDE.md` migration-status table — "SQL schema migrated (27 ENUMs, 25 tables)".
- `AppReport/client-context-and-situation-point.md` — "canonical schema with
  25 tables and 27 ENUMs".
- `AppReport/latex-report/REPORT_TRACKING.md` — "27 ENUMs, 33 tables".

That pair predates the **2026-04-26 schema consolidation** (recorded in
`CLAUDE.md`: "every prior per-feature delta inlined"), during which three former
enums (`interview_mode`, `ambassador_program_status`,
`ambassador_application_status`) were demoted to plain `TEXT` columns — which is
exactly why the appendix listing still named them as enums. When Appendix A was
drafted, the **table** count was re-counted (25 → 33) but the **enum** count
"27" was copied across unchecked. Ground truth is the canonical schema
`supabase/migrations/00000000000000_schema.sql`, which has exactly **19**
`CREATE TYPE` statements. `REPORT_TRACKING.md` line 35 updated to "19 ENUMs";
`CLAUDE.md` and `client-context-and-situation-point.md` are historical migration
logs and were left as-is.

### Validation

`get_errors` clean on all edited files (`appendixA.tex`, `appendixB.tex`, ch1,
ch5, `REPORT_TRACKING.md`). Mechanical re-checks after the edits:
enum listing = 19 `CREATE TYPE`; Appendix B numbers sequential 1–66;
glossary reports **zero** undefined and **zero** unused entries.
Recompile order: pdfLaTeX → biber → pdfLaTeX ×2.

---

## Fourth pass — prose-quality analysis (repetition / compaction / improvements) — 2026-06-24

A read-only prose-quality pass over the **whole** document (all seven chapters
read in full, plus appendices C and D and the relevant source files
`src/server/domain/value-objects.ts` and `scoring.service.ts`). Goal was not
correctness-vs-codebase (that was pass 3) but **writing quality**: cross-document
repetition that survived earlier trims, verbose passages that could be compacted,
and improvements/additions. Every finding below was cross-checked against the
A/B/E items above to avoid re-flagging already-resolved or deliberately-`⏸ Left`
material. **No text changed yet — dispositions pending** (user will decide what
to act on).

### Repetitions still present (new findings, distinct from A/B/E)

| Item | Severity | Status | Detail |
|------|----------|--------|--------|
| R1. **Single-origin "Maia location" simplification told twice at full length.** ch5 §impl-scoring carries a full paragraph ("location distance measured from a single hardcoded origin, the adidas GBS site in Maia… bakes in an assumption…"); ch7 §concl-partial "Single-origin location scoring" restates the same in another full paragraph. | Medium | ✅ Done | ch7 kept as home (Partial Work). ch5 instance compressed to two sentences naming the origin and deferring the rationale/limit to `\secref{sec:concl-partial}`. |
| R2. **Provider-fallback rationale ("Groq→OpenAI turns an outage into a degradation") restated, not just mentioned, ~8×.** ch3 (NFR Cost + risk register + §method-risks), ch4 (decisions table), ch5 (§impl-cv + §impl-cv-cost), ch6 (§val-limitations), ch7 (§concl-ai). Distinct from **A5** (which only compared ch3-terse vs ch7-lesson and left them); the new observation is that the *full rationale* is re-explained in ch3, ch4 and ch7. | Medium | ✅ Done | The *lesson*-level rationale lives only in ch7 §concl-ai (kept as home, best phrased); ch4/ch5/ch6 are mechanism/contextual (kept). The duplicate rationale clause in ch3 §method-risks ("so that a single outage could not stop CV parsing") removed, leaving the pure mitigation fact — the risk register table below already lists it. |
| R3. **"GDPR six-month rule turns institutional memory into a liability" metaphor.** A1 trimmed ch1↔ch3, but the ch1-Context↔ch2 §sota-gdpr near-verbatim "liability" phrase pair was not de-duplicated. | Low | ✅ Done | ch1 hook kept. ch2 §sota-gdpr metaphor ("turns institutional memory into a liability") replaced with the SOTA-specific framing ("the central design pressure for a platform of this kind"). |
| R4. **Intra-chapter overlap in ch1 §Approach vs §Team Composition.** Both describe the two-person split, author = PO + full-stack owner, and Stratos owning the AI interviewer; each person's responsibilities are stated in both sections. | Medium | ✅ Done | §Approach trimmed: full module list removed, deferring the responsibility split to `\secref{sec:team}`; §Team Composition keeps the full breakdown. |
| R5. **`computeJobFit` enumeration** (7 criteria / average of applicable / `isEligible` conjunction / per-criterion explainable) fully restated in ch4 §design-matching, ch5 §impl-jobs, ch6 §val-unit. **B4** already ruled ch6 acceptable (test coverage); the residual ch4↔ch5 overlap is ch5 re-narrating the orchestration `fig:match-flow` already shows. | Low | ✅ Done | ch5 §impl-jobs orchestration narration compressed to defer to `\secref{sec:design-matching}` (`\figref{fig:match-flow}`), keeping only the impl outputs (`job_matches` cache). |
| R6. **"Single respondent / directional not statistical" caveat 4×** — ch3 §analysis-pains, ch6 §val-survey (**twice within the same section**), ch7 §concl-limitations. The two occurrences *inside* ch6 §val-survey are the avoidable ones. | Low | ✅ Done | ch6 §val-survey opening "rather than a statistical sample" removed; caveat now stated once, at the section's analytical close. ch3/ch7 mentions left (different chapters/purpose). |
| R7. **HMAC "clean seam / parallel work" point** in ch3 §method-boundary, ch4 §design-onion, ch7 §concl-arch. Acceptable intro→design→reflection arc (related to **B3**); logged for awareness only. | — | ⏸ Left | Different purpose per location; no action. |

### Compaction opportunities (verbose passages)

| Item | Status | Detail |
|------|--------|--------|
| C-a. ch5 §impl-cv-cost | ⏸ Pending | Table + figure + 3 prose paragraphs; the "three conclusions" paragraph restates the 202/`after()`/100–120-CV background model already in §impl-cv. Cut the wall-clock paragraph; reference §impl-cv. |
| C-b. ch5 §impl-cv-confidence | ⏸ Pending | "Loud failure" philosophy stated twice ("route uncertain results to a human" / "far better to flag than write a confident-but-wrong record"). Merge to one statement. |
| C-c. ch7 §concl-partial | ⏸ Pending | Four detailed paragraphs each re-explaining the *why*, much from ch5. Tighten each to "what's missing + one-line why + ref" — this section is consolidation, not first-telling. |
| C-d. ch3 §framework "From Framework to Requirements" | ⏸ Pending | Filler bridge ("pain points say what hurts, framework says what an answer must do…"). Trim to 1–2 sentences. |
| C-e. ch4 §design-di | ⏸ Pending (optional) | Composition-root + ISP example is thorough but long for the point. |

### Improvements / additions

| Item | Severity | Status | Detail |
|------|----------|--------|--------|
| I1. **Genuine inconsistency: 5-dimension assessment weights vs 3 CEFR sub-scores.** ch4 `tab:value-objects` lists `ASSESSMENT_DEFAULT_WEIGHTS` as grammar, vocabulary, **clarity**, fluency and **customer handling** at 20% each (5 dims) — confirmed against `src/server/domain/value-objects.ts` and `appendices/schema.sql`. But ch1, ch2, ch3, ch5 §impl-scoring ("averaging the **three** CEFR sub-scores: grammar, vocabulary and fluency"), ch7 and appendixD all describe the language interview as returning **3** sub-scores. A reader sees a 5-component weight set and a 3-component result with no reconciliation. | Major | ✅ Done | Added a clarifying sentence after `tab:value-objects` in ch4: `ASSESSMENT_DEFAULT_WEIGHTS` applies to the general assessment template (customer-service and technical rubrics) and is distinct from the language interview, which averages the three CEFR sub-scores at equal weight (`\secref{sec:impl-scoring}`). |
| I2. **Dangling "backup phrasings" reference.** ch3 §analysis-pains says the survey covers each pain point "(with **backup phrasings** where a single question was insufficient)". But `appendixC.tex` (rewritten in pass 2, item 1) now frames it as "several pain points contributing more than one question… probed from complementary angles" — no backup/fallback structure exists. | Minor | ✅ Done | ch3 parenthetical changed to match the appendix: "(several pains contributing more than one, to probe a single friction from complementary angles)". |
| I3. **Acronym expansion gaps.** `LEI-PROJ` / `PESTI` / `ISEP` appear without first-use expansion (GBS is expanded once). | Minor | ⏸ Left | User chose to leave for now. |

### Suggested priority if acting

1. **I1** (real inconsistency) and **I2** (dangling reference) — correctness.
2. **R1, R4** — clearest avoidable duplication (a full echo + an intra-chapter one).
3. **R2, R3** — trim restated *rationale*, keep contextual mentions.
4. Compaction items C-a…C-e — polish, lowest risk.

### Validation

Read-only pass — no files edited, so no `get_errors` run required. All findings
verified by direct read of the seven chapter files, appendices C/D, and the two
domain source files (`value-objects.ts`, `scoring.service.ts`).

### Edits applied (2026-06-24, after user disposition)

User approved **R1–R6, I1, I2**; left **R7, I3** as-is. Applied:

- **R1** — `ch5/chapter5.tex` §impl-scoring Maia paragraph compressed; full
  rationale deferred to ch7 §concl-partial.
- **R2** — `ch3/chapter3.tex` §method-risks: removed the duplicated
  "so that a single outage could not stop CV parsing" rationale clause; ch7
  §concl-ai remains the home for the reliability lesson.
- **R3** — `ch2/chapter2.tex` §sota-gdpr: "turns institutional memory into a
  liability" → "the central design pressure for a platform of this kind".
- **R4** — `ch1/chapter1.tex` §Approach: dropped the duplicated module list,
  deferring the responsibility split to `\secref{sec:team}`.
- **R5** — `ch5/chapter5.tex` §impl-jobs: orchestration narration deferred to
  `\secref{sec:design-matching}` / `\figref{fig:match-flow}`.
- **R6** — `ch6/chapter6.tex` §val-survey: removed the early "rather than a
  statistical sample" duplicate; caveat kept once at the section close.
- **I1** — `ch4/chapter4.tex` after `tab:value-objects`: added the
  5-dim-vs-3-CEFR reconciliation sentence.
- **I2** — `ch3/chapter3.tex` §analysis-pains: "backup phrasings" →
  "complementary angles", matching `appendixC.tex`.

`get_errors` clean on all six edited chapter files (ch1–ch6). ch7 unchanged
(it was already the home for R1's deferred content). Recompile order:
pdfLaTeX → biber → pdfLaTeX ×2.

---

## Fifth pass — prose-quality analysis (repetition / compaction / improvements) — 2026-06-25

A fresh read-only pass over the **current (post-pass-4) state** of the whole
document: all seven chapters re-read, plus appendices C and D and the front
matter (abstract + acknowledgements). Goal was the same as pass 4 —
cross-document repetition, verbose passages, and improvements — but on text that
already incorporates the R1–R6/I1/I2 edits, so every finding is genuinely new or
explicitly a relative of a still-pending item. Cross-checked against the
A/B/E/R/I/C items above to avoid re-flagging resolved or `⏸ Left` material.
**Findings applied 2026-06-25** (P1–P10 — see "Edits applied" subsection below).

### Repetitions still present (new findings)

| Item | Severity | Status | Detail |
|------|----------|--------|--------|
| P1. **Two near-duplicate "Limitations" sections.** ch6 §val-limitations and ch7 §concl-limitations enumerate almost the same list in almost the same words (Chromium-only Web Speech, free-tier LLM ceiling, no OCR for scanned PDFs, un-automated retention purge). Near-verbatim pair on the manual purge. ch7 adds the bulk-import serial cap; ch6 frames as "found during validation", ch7 as "the work's limits". | Medium-High | ✅ Done | **Largest remaining echo.** ch7 §concl-limitations rewritten as a terse roll-up keeping its unique items and deferring the shared ones to `\secref{sec:val-limitations}`; ch6 kept as the validation-surfaced home. |
| P2. **Service-area list duplicated verbatim** (ch1 Context "Finance, Human Resources, Accounts and Sales Management, Supply Chain, Digital Services and Tech" ↔ ch3 §framework-profiles same list). ch3 needs it (feeds `tab:language-profiles`). | Low-Medium | ✅ Done | ch1 enumeration dropped ("provides shared services to other adidas companies across Europe"); ch3 owns the list. |
| P3. **"900 staff / ~22% international / 15 business languages" triple stated 3×** — ch1 Context, abstract, appendix C §survey-meeting. Abstract + ch1 are both legitimately expected. | Low | ✅ Done | Appendix-C copy replaced with a back-reference to `\secref{sec:context}`; abstract + ch1 kept. |
| P4. **Candidate "Danger Zone" deletion + CSV export described twice at near-identical length** (ch4 §design-gdpr ↔ ch5 §impl-engagement self-service). Both spell out delete-full-record + documents + CSV export operationalising GDPR access/erasure. | Low-Medium | ✅ Done | ch4 §design-gdpr trimmed to design intent and defers the concrete control + document enumeration to `\secref{sec:impl-engagement}`; ch5 keeps the implementation detail. |
| P5. **"Same app, role-driven navigation" sentence recurs** (ch3 personas, ch4 §design-frontend, ch5 welcome/user-guide). Justifiable as different views; ch4 and ch5-welcome instances are close. | Low | ✅ Done | ch4 §design-frontend kept as home; trimmed the echo in ch5 welcome and user-guide paragraphs. |
| P6. **Nine pain points fully restated in appendix C §survey-meeting** (enumerated 1–9) in addition to ch1 `tab:pain-points-overview`. | Low | ✅ Done | Kept the evidentiary list (unique per-point client annotations) but reframed the intro as the raw source consolidated into `\tabref{tab:pain-points-overview}`. |

### Improvements / additions (new findings)

| Item | Severity | Status | Detail |
|------|----------|--------|--------|
| P7. **Internal date contradiction in appendix C.** `tab:meeting-log` row says "Feb 2026 — … original four-question survey bank drafted", but the later subsection is headed "Original four-question bank (28 April session)". Same artefact, two origin dates. | Minor (correctness) | ✅ Done | Subsection header "(28 April session)" → "(February draft)", matching the `tab:meeting-log` row. |
| P8. **Meeting-log end date under-runs internship window.** Appendix C intro + ch3 + Gantt state 16 Feb – 9 July 2026; `tab:meeting-log` last row is "May–Jun 2026 — Final report and presentation". | Minor | ✅ Done | `tab:meeting-log` last row "May–Jun 2026" → "May–Jul 2026". |
| P9. **Abstract overstates the CV-time benefit relative to ch6's honest finding.** Abstract claims TalentHub "reduces manual CV-screening time", but ch6 §val-survey records the client (with an enterprise ATS) already extracts key fields "in under a minute" and "rarely" opens an unsuitable CV (Q7/Q8). The abstract headlines a benefit validation deliberately tempers. | Minor (credibility) | ✅ Done | Abstract "reduces manual CV-screening time" → "makes CV-derived data reusable across openings" — a validation-backed claim. |
| P10. **Objective 4 wording drift** ("Verify candidate proficiency" ch1 vs "Verify language proficiency" ch7). | — | ✅ Done | Pass 5 (initially ⏸ Left from pass 2, then applied at user request 2026-06-25). ch7 Goals-Achieved item retitled "Verify candidate proficiency" to match ch1; body now covers both the CEFR language mode and the technical-skill mode rather than language alone. |

### Compaction opportunities

The pass-4 candidates **C-a … C-e were applied 2026-06-25** (see the pass-4
"Compaction opportunities" table above for per-item detail). One new candidate:

| Item | Status | Detail |
|------|--------|--------|
| P-cmp1. ch3 §method-scrum "Tooling" bullet | ⏸ Left | Reviewed 2026-06-25 — user judged the current wording acceptable as-is; no change. (Was: the Discord/WhatsApp/Figma sentence is long and operational, "living knowledge base storing meeting notes, brainstorming artefacts, architectural decisions and cross-team reference material in a single space accessible to all participants regardless of subproject".) |

### Suggested priority if acting

1. **P1** — the duplicated Limitations sections (largest remaining echo).
2. **P7** — internal date contradiction in appendix C (correctness).
3. **P2, P4** — verbatim list / near-identical paragraph duplication.
4. **P9** — abstract vs ch6 tension (credibility).
5. **P8, P3, P5, P6** + the ch3 "Tooling" compaction (P-cmp1) + the still-pending
   pass-4 **C-a … C-e** — polish, low risk.

> **Outcome:** P1–P10 were all applied (P1–P9 on 2026-06-25, P10 on a follow-up
> request the same day). The pass-4 compaction items **C-a … C-e** were applied
> on 2026-06-25 (see the pass-4 "Compaction opportunities" table above).
> **P-cmp1** (the ch3 "Tooling" bullet) was reviewed 2026-06-25 and left as-is
> --- the current wording is acceptable; no change.

### Validation

Findings verified by direct read of the seven chapter files (post-pass-4
state), appendices C/D, and the front matter (`frontmatter/frontmatter.tex`).
The applied edits (P1–P10) are `get_errors`-clean on all touched files
(ch1, ch4, ch5, ch7, appendix C, frontmatter) — see the "Edits applied"
subsection below. Recompile order: pdfLaTeX → biber → pdfLaTeX ×2.
### Edits applied (2026-06-25, after user disposition)

User approved **all of P1–P9** initially; **P10** was applied on a follow-up
request (2026-06-25). Applied:

- **P1** --- `ch7/chapter7.tex` §concl-limitations rewritten as a terse roll-up;
  shared items deferred to `\secref{sec:val-limitations}` (ch6 kept as home).
- **P2** --- `ch1/chapter1.tex` Context: service-area enumeration dropped; list
  owned by ch3 §framework-profiles.
- **P3** --- `appendices/appendixC.tex` §survey-meeting: staff/language triple
  replaced with a back-reference to `\secref{sec:context}`.
- **P4** --- `ch4/chapter4.tex` §design-gdpr: trimmed to design intent; the
  "Danger Zone" control + document enumeration deferred to
  `\secref{sec:impl-engagement}` (ch5 home).
- **P5** --- `ch5/chapter5.tex`: trimmed the role-gating echo in the welcome and
  user-guide paragraphs; ch4 §design-frontend remains the architectural home.
- **P6** --- `appendices/appendixC.tex`: pain-point list intro reframed as the
  raw source consolidated into `\tabref{tab:pain-points-overview}`.
- **P7** --- `appendices/appendixC.tex`: four-question-bank header
  "(28 April session)" → "(February draft)", matching `tab:meeting-log`.
- **P8** --- `appendices/appendixC.tex`: `tab:meeting-log` last row
  "May–Jun 2026" → "May–Jul 2026".
- **P9** --- `frontmatter/frontmatter.tex`: abstract "reduces manual
  CV-screening time" → "makes CV-derived data reusable across openings".
- **P10** (applied 2026-06-25 on follow-up request) --- `ch7/chapter7.tex`
  Goals-Achieved item retitled "Verify language proficiency" → "Verify
  candidate proficiency" to match ch1 Objective 4; body now names both the
  CEFR language mode and the technical-skill mode.

`get_errors` clean on all six edited files (ch1, ch4, ch5, ch7, appendix C,
frontmatter). Recompile order: pdfLaTeX → biber → pdfLaTeX ×2.

---

## Sixth pass — prose-quality analysis (repetition / compaction / improvements) — 2026-06-25

A fresh read-only pass over the **current (post-P1–P10, post-C-a…C-e) state**.
Re-read all seven chapters, appendices C/D and the front matter. Goal identical
to passes 4–5 but on text that already incorporates every prior edit, so each
finding is genuinely new. Cross-checked against the full A/B/E/R/I/C/P log to
avoid re-flagging resolved or `⏸ Left` material. The document is in good shape;
the remaining findings cluster around the **Product-Owner / project-management
narrative** and the **CV-scoring model**. **All of Q1–Q6 and i1–i2 applied
2026-06-25; i3 kept as-is per the user.**

### Repetitions / duplications (new findings)

| Item | Severity | Status | Detail |
|------|----------|--------|--------|
| Q1. **Job-matching-bridge defect told at full length twice.** ch5 §impl-jobs ("an early version read the wrong property for the job title, silently emptying the evidence text … discussed … in Chapter 6") explicitly defers to ch6 **and then narrates the bug anyway**; ch6 §val-unit ("glue between layers") carries the same story plus the testing lesson and the 25-case suite. | Medium | ✅ Done | **Strongest remaining echo.** ch5 paragraph compressed to a one-line pointer; the bug narration now lives only in ch6 §val-unit. |
| Q2. **Client-driven backlog / MoSCoW-makes-deferral-explicit** near-verbatim. ch3 §method-backlog ("kept deliberately client-driven: every item traced back to a pain point, … MoSCoW") ↔ ch7 §concl-po ("disciplined to be client-driven by construction: every item traced to a validated pain point, and MoSCoW … made deferral explicit"). | Low-Medium | ✅ Done | ch7 §concl-po now leans on `\secref{sec:method-backlog}` rather than restating; ch3 keeps the methodology statement. |
| Q3. **PO + lead-implementer → scope-creep risk → MoSCoW/client-driven guardrail** recurs 4×: ch1 §team, ch3 §method-scrum (tension), ch3 §method-risks (risk row), ch7 §concl-po (full lesson). | Low-Medium | ✅ Done | ch3 §method-risks clause trimmed: dual-role amplification defers to `\secref{sec:concl-po}`, MoSCoW to `\secref{sec:method-backlog}`; the full lesson stays in ch7. |
| Q4. **"Fusion of sprint review with client acceptance"** stated 3×: ch3 §method-scrum ("the clearest benefit … was the fusion …"), ch6 §val-manual ("doubling as both acceptance testing and Scrum ceremony"), ch7 §concl-po ("the fusion … meant the people who owned the problem signed off each increment"). | Low-Medium | ✅ Done | ch7 §concl-po now references `\secref{sec:method-scrum}` instead of restating the fusion; ch3 = methodology home, ch6 brief mention kept. |
| Q5. **Lazy JD-parse description near-verbatim** (ch4 §design-jd ↔ ch6 §val-performance: "parsed the first time an HR user opens the ranking screen … cached with its schema version … reused until the source changes"). | Low | ✅ Done | ch6 §val-performance now defers to `\secref{sec:design-jd}` and shortens the schema-version clause; ch4 remains the home. |
| Q6. **Four-item contributions list near-identical** (ch1 §Approach ↔ ch7 §concl-summary). | Low | ✅ Done | ch7 §concl-summary bullets 1 and 4 reworded toward delivered/realised to reduce verbatim overlap with the ch1 claim list. |

### Compaction opportunities (new findings)

| Item | Status | Detail |
|------|--------|--------|
| (covered by Q1) ch5 §impl-jobs bridge-defect paragraph | ✅ Done | Compressed to a pointer — biggest single compaction win this pass. |
| ch6 §val-unit "What is Tested, and Why" five `\paragraph` blocks | ⏸ Left (flagged) | Genuinely informative (distinct test categories); left as-is — flagged only for visibility. |

### Improvements / additions (new findings)

| Item | Severity | Status | Detail |
|------|----------|--------|--------|
| i1. **CV-scoring table appears to weight years-of-experience twice.** `tab:cv-scoring` (ch5 §impl-scoring) lists **Experience 25%** ("proxied by years of experience") *and* **Years of experience 10%** (`min(100,(years/10)×100)`). In the generic score both derive from the same quantity — the worked example uses **70 for both** — so ~35% of the score is effectively tenure under two labels, tying the "largest single weight" the prose attributes to Languages (35%). Not necessarily a bug (the 25% slot is a placeholder the job-anchored fit later replaces with LLM-assessed relevance), but as written it reads as double-counting. | Minor (correctness/credibility) | ✅ Done | ch5 §impl-scoring prose now distinguishes the two components: 25% = role-relevance proxy (replaced by job-anchored LLM relevance in fit mode), 10% = raw tenure; notes the generic score proxies the former by the latter. |
| i2. **"Largest single weight" tie.** Given i1, "Language proficiency carries the largest single weight" holds only row-by-row (35% Languages vs 25%+10% experience). | Minor | ✅ Done | Reworded to "the largest weight of any single criterion (35%)", applied with i1 in the same edit. |
| i3. **Acronym expansions** (LEI-PROJ/PESTI/ISEP). | — | ⏸ Left | User keeps as-is (consistent with the pass-2 disposition). |

### Suggested priority if acting

All actionable items applied 2026-06-25 (Q1–Q6, i1–i2); i3 left per the user.
For the record, the applied order of importance was:

1. **Q1** — de-duplicated the bridge-defect story (compressed ch5 → pointer).
2. **Q2–Q4** — trimmed the PO/backlog/sprint-fusion previews in ch3/ch7; ch7
   §concl-po kept as the lesson home.
3. **i1 / i2** — clarified the two experience components in `tab:cv-scoring`
   (correctness/credibility).
4. **Q5, Q6** — polish.

> **Outcome:** Q1–Q6 and i1–i2 all applied 2026-06-25; **i3** kept as-is per the
> user. Edits below.

### Edits applied (2026-06-25)

- **Q1** — `ch5/chapter5.tex` §impl-jobs: bridge-defect paragraph compressed to
  a one-line pointer to `\chapref{cap:validation}`; full narration removed (ch6
  §val-unit is the home).
- **Q2** — `ch7/chapter7.tex` §concl-po: first practice now leans on
  `\secref{sec:method-backlog}` instead of restating the client-driven/MoSCoW
  mechanism verbatim.
- **Q3** — `ch3/chapter3.tex` §method-risks: scope-creep clause trimmed —
  dual-role amplification defers to `\secref{sec:concl-po}`, MoSCoW to
  `\secref{sec:method-backlog}`.
- **Q4** — `ch7/chapter7.tex` §concl-po: second practice now references
  `\secref{sec:method-scrum}` ("the dedicated client-acceptance session that
  doubled as the sprint review") instead of restating the fusion; ch3
  §method-scrum kept as methodology home.
- **Q5** — `ch6/chapter6.tex` §val-performance: JD-parse sentence now defers to
  `\secref{sec:design-jd}` and shortens the schema-version clause.
- **Q6** — `ch7/chapter7.tex` §concl-summary: bullets 1 and 4 reworded toward
  delivered/realised to cut verbatim overlap with the ch1 §Approach claim list.
- **i1 / i2** — `ch5/chapter5.tex` §impl-scoring: added a sentence distinguishing
  the 25% role-relevance "Experience" proxy from the 10% tenure weight, and
  reframed the lead claim as "the largest weight of any single criterion (35%)".

`get_errors` clean on all four edited chapter files (ch3, ch5, ch6, ch7).
Recompile order: pdfLaTeX → biber → pdfLaTeX ×2.

### Validation

Findings verified by direct read of the current state of all seven chapter
files, appendices C/D and the front matter. Edits applied and `get_errors`-clean.

---

## Seventh pass — prose-quality analysis (repetition / compaction / improvements) — 2026-06-25

A fresh read-only pass over the **current (post-Q1–Q6 / i1–i2) state**, with
special attention to the sections not re-read in pass 6: ch2 in full, the
unread halves of ch4 and ch5, appendix D, and the ch3 requirements / use-case /
NFR sections. **The document has essentially converged** — the findings curve
has flattened, as predicted. Only one substantive compaction, one clarity nit,
one slight rewording, and an LLM-naming cleanup at the user's request.

### Repetitions / duplications

| Item | Severity | Status | Detail |
|------|----------|--------|--------|
| **LLM-naming proliferation.** "Groq (primary) / OpenAI (fallback)" was named ~11× across prose, tables and diagrams. The recurring *prose* mentions create a repetition feel. | Low-Medium | ✅ Done | At the user's request. Genericised every linear-prose mention to "LLM provider / fallback provider / provider fallback" (ch2, ch3 §method-risks, ch3 NFR, ch4 §design-overview, ch4 §design-cv, ch5 §impl-cv, ch6 §val-limitations). Concrete names retained only in reference/lookup material: the abstract, ch4 `tab:containers` + the C4 and CV-sequence diagrams + the design decision log, ch5 `tab:tech-stack` + the cost-comparison section (`tab:parse-cost`/`fig:parse-cost`, which is *about* comparing the two providers), the ch3 risk-register table row, and the ch7 §concl-ai reliability lesson. |
| U3. **Resend sender-domain caveat near-duplicated** across ch4 `tab:containers` Email row ("sender-domain verification required before live delivery") and ch5 `tab:tech-stack` Email row ("live delivery pending sender-domain verification"). Two self-contained tables, so defensible. | Low | ✅ Done | Per user, reworded slightly: ch4 row → "live delivery gated on sender-domain verification", removing the verbatim echo. |
| (re-audited, no action) "no auto-reject / ranks rather than deciding" (ch2, ch3 NFR, ch4 Article 22, ch7); "Chromium-only Web Speech" (ch2/ch3/ch6/ch7); "accent-sensitive dedup / unaccent" (ch5/appx A/ch7). | — | ⏸ Left | Each spread is purpose-distinct per location; consistent with prior A3 / E5 dispositions. No new duplication. |

### Compaction opportunities

| Item | Status | Detail |
|------|--------|--------|
| U1. **ch3 §analysis-nfr prose duplicates `tab:nfr`.** The `description` list (Transparency, Security, Reliability, Maintainability, Cost/portability) immediately precedes `tab:nfr`, which restates the same attributes *with more* information (adds Mechanism + Verified-by columns and a Usability row). Same prose-then-richer-table pattern compacted earlier as C-a…C-e. | ✅ Done | Per user. Shortened to a 2–3 sentence lead-in naming the five attributes and framing why they mattered; `tab:nfr` now carries the per-attribute mechanism/verification. Saved ~15 lines, no information loss. Highest-value edit this pass. |

### Improvements / additions

| Item | Severity | Status | Detail |
|------|----------|--------|--------|
| U2. **ch3 §framework-bridge reads backwards in time.** The demands "reappear, sharpened, as the functional requirements of the next section **and as the validated pain points of §analysis-pains**" — but §analysis-pains appears *earlier* in the chapter, so "reappearing as" something already presented is temporally backwards, and one verb governed both a forward and a backward reference. | Minor (clarity) | ✅ Done | Per user. Reworded: pillars now "echo the validated pain points of §analysis-pains (backward) and crystallise into the functional requirements of the next section (forward)". |
| U4. **FR table out-of-sequence IDs** (FR-02, 07, 08, then FR-01, …) because grouped by module. Caption states the grouping. | — | ⏸ Left | Per user, correct by design; left as-is. |

> **Outcome:** Pass 7 confirms convergence. The LLM-naming cleanup, U1, U2 and
> U3 were applied 2026-06-25; U4 left per the user. The next real value is a
> **compile + rendered-PDF review** (cross-references, float placement, TikZ
> overflow), not another source-only pass.

### Edits applied (2026-06-25)

- **LLM naming** — `ch2` sota-positioning cell → "free-tier LLM providers";
  `ch3` §method-risks → "a provider fallback"; `ch3` NFR (folded into U1) →
  "free service tiers"; `ch4` §design-overview prose → "a primary and a
  fallback"; `ch4` §design-cv prose → "the primary model" / "the secondary
  provider"; `ch5` §impl-cv → "the fallback provider"; `ch6` §val-limitations →
  "the provider fallback". Concrete names kept in the abstract, ch4/ch5 tables
  and diagrams, the decision log, the cost-comparison section, the risk register
  and the ch7 lesson.
- **U1** — `ch3/chapter3.tex` §analysis-nfr: five-item `description` list
  replaced by a 2–3 sentence lead-in; `tab:nfr` retained as the detail home.
- **U2** — `ch3/chapter3.tex` §framework-bridge: rewording for clean reference
  direction.
- **U3** — `ch4/chapter4.tex` `tab:containers` Email row reworded.

`get_errors` clean on all five edited chapter files (ch2, ch3, ch4, ch5, ch6).
Recompile order: pdfLaTeX → biber → pdfLaTeX ×2.

---

## Eighth pass — supervisor / examiner feedback — 2026-07-04

**Different in kind from passes 1–7.** Those were the author's own
prose-quality / consistency reviews. This pass records **external supervisor
(examiner) feedback** left as six margin comments on the near-final compiled
PDF (pages 32, 63, 65, 80, 81, 85). The feedback targets **evidence of
effectiveness** and **formatting**, not repetition. Feedback is recorded
verbatim (Portuguese, as written) with an English gloss, my analysis, severity,
and disposition. **Updated 2026-07-04: S3/S4/S5 applied to the report; S1/S2/S6
satisfied by existing prose — the substantive S1/S2 validation studies (Spearman
$\rho$, precision/recall) are deferred to future work by design, as no recruiter
ranking data or labelled CV corpus was available.**

### Feedback items and analysis

| Item | PDF page | Section (report) | Severity | Status |
|------|----------|------------------|----------|--------|
| S1. Matching correctness / consistency | 32 | ch4 §design-matching / ch6 §val-limitations / ch7 | **High** | ✅ Done (reframe) |
| S2. CV-parsing quantitative evaluation | 65 | ch5 §impl-cv / ch6 §val-limitations / ch7 | **High** | ✅ Done (reframe) |
| S3. Test-coverage figure | 80 | ch6 §val-unit | Low (factual) | ✅ Done |
| S4. Text overflows margin | 81 | ch6 (element TBC) | Low (mechanical) | ✅ Done |
| S5. Missing limitations (LLM hallucination, external-API dependency) | 85 | ch6 §val-limitations / ch7 §concl-limitations | Medium | ✅ Done |
| S6. Discuss decisions/challenges/trade-offs/alternatives | 63 | ch4 §design-decisions / ch5 | Low | ✅ Done |

---

#### S1 — page 32 — matching algorithm correctness & consistency

> *"Demonstras que este algoritmo de matching produz avaliações/rankings
> corretos? coincidentes com a avaliação dos profissionais? Como provas a
> consistência?"*
> (Do you demonstrate that this matching algorithm produces correct
> evaluations/rankings? Coinciding with the professionals' assessment? How do
> you prove consistency?)

**Assessment — valid, the sharpest of the five.** The examiner separates two
claims the report currently conflates:

- **Consistency / determinism** — *partly proven.* `computeJobFit` is a pure
  function (same inputs → same output) and the 47-case `job-fit` suite exercises
  every criterion. This is genuine internal validity and the report does argue
  it (ch4 §design-matching, ch6 §val-unit).
- **Correctness vs. professional judgment** — *not established.* Nothing shows
  the algorithm's ranking agrees with how a real recruiter would rank the same
  candidates against the same job. The unit tests confirm the formula computes
  what was designed; they do not validate that the *design* matches expert
  judgment. This is external validity, and it is absent.

**Options.** (a) *Reframe (cheap):* explicitly separate "consistency"
(proven — determinism + test corpus) from "agreement with experts"
(not established), and move the latter to acknowledged limitations. (b) *Small
study (strong):* one real job + N candidates (8–12), a recruiter (or defensible
self-labelling as domain proxy) hand-ranks them, then compare against
`computeJobFit` with **Spearman's ρ** or Kendall's τ. Even n=1 recruiter / one
job illustrates agreement and directly answers *"coincidentes com a avaliação
dos profissionais?"*. Recommendation: do the ρ study if any recruiter access is
possible; otherwise reframe honestly.

**Resolution (2026-07-04) — ✅ Done (honest reframe; substantive $\rho$ study deferred by design).**
Option (a) turns out to be **already in the report** — the log row was simply
never ticked. The consistency-vs-agreement distinction is stated explicitly in
ch6 §val-limitations ("the matching engine's logic is proven deterministic and
regression-locked … its rankings were never compared against a recruiter's own
ordering — no such agreement study was run") and in ch7 §concl-limitations
("validated for internal consistency but not against external ground truth"),
with the **Spearman's $\rho$ agreement study named as the deferred step** in
ch7 §concl-future. Option (b) — actually running the $\rho$ study — is not done
because no recruiter ranking data was available; it is carried as future work,
not claimed. **No new prose required.**

#### S2 — page 65 — quantitative evaluation of CV-parsing quality

> *"não tens dados para uma avaliação quantitativa da qualidade do CV Parsing?
> Era interessante ter uma noção do seu valor efetivo."*
> (Don't you have data for a quantitative evaluation of the CV-parsing quality?
> It would be interesting to have a notion of its effective value.)

**Assessment — valid, same structural gap as S1.** What the report has today:
**parse-confidence** (the *model's self-assessment* — a model can be confidently
wrong) and **cost analysis** ($/CV — measures price, not quality). What is
missing is a **ground-truth accuracy metric**. Fix: take ~20–30 CVs, manually
label the correct fields (name, email, # experiences, languages, skills), run
the parser, and report **field-level precision/recall or per-field accuracy**.
This is the single highest-value addition to the report — it converts "the
pipeline exists" into "the pipeline extracts X% of experiences and Y% of
languages correctly." If the labelling exercise is infeasible, frame explicitly
as a limitation + future work, but a small manual eval is far stronger.

**Resolution (2026-07-04) — ✅ Done (honest reframe; ground-truth accuracy table deferred by design).**
Same situation as S1: the acknowledgment is already in the report. ch6
§val-limitations states extraction "was not quantified against a labelled
ground-truth set in precision-and-recall terms", and ch7 §concl-future defers
the labelled-corpus precision/recall measurement. The ~20–30-CV manual accuracy
table (option b) was not produced — same root cause (no labelled real
application data). Reframe complete; substantive metric deferred. Log row never
ticked; **no new prose required.**

#### S3 — page 80 — test coverage figure

> *"qual é a cobertura destes testes?"* (What is the coverage of these tests?)

**Assessment — easy factual fix, but present it per-layer, never as the bare
global number.** Figures pulled from the on-disk `coverage/` report
(Istanbul/V8 HTML, `coverage/index.html`) on 2026-07-04:

| Scope | Statements | Lines | Functions |
|-------|-----------:|------:|----------:|
| **Global (all instrumented src)** | 23.97% | 24.74% | 24.3% |
| `server/domain/services` (`computeJobFit`, scoring, job-fit) | 90.84% | **96.06%** | 98.24% |
| `server/domain` + value-objects | 100% | 100% | 100% |
| `lib` (core utils) | 100% | 100% | 100% |
| `server/infrastructure/extraction` (PDF/DOCX) | 73.91% | 73.91% | 80% |
| `server/infrastructure/logging` (PII redaction) | 71.42% | 74.46% | 72.72% |
| `server/infrastructure/scraping` | 35.08% | 33.11% | 25% |
| `server/application/use-cases` (orchestration) | 16.85% | 17.68% | 21.01% |
| `server/infrastructure/database` (repositories) | 0.21% | 0.24% | 0.47% |
| `server/infrastructure/ai` (LLM adapters) | 0% | 0% | 0% |
| `server/infrastructure/email` | 0% | 0% | 0% |

Recommended action: add a short per-layer coverage table to ch6 §val-unit with
the **~96% domain-services line coverage** as the headline, and explain the low
global figure as *risk-proportional testing* — the decision-critical pure logic
is ~90–100% covered while the I/O adapters (DB repos, LLM/email clients) are
near-zero because they require live external services and are verified
indirectly. This aligns with the argument the section already makes.

> ⚠️ **Correctness flag surfaced by S3.** ch6 §val-unit currently states the
> suite "concentrates on the layers where logic lives — the Domain **and the
> Application**." The coverage data contradicts the Application half:
> `server/application/use-cases` is only **~17%**. The sentence should be
> corrected to name the **Domain decision logic** specifically (the
> `server/application` *root* — DTOs/mappers — is 64%, but the use-case
> orchestration is thinly covered), or an examiner reading the coverage report
> will catch the mismatch. Logged as a new correctness item, not yet applied.
>
> Note: the on-disk `coverage/` artefact may be stale — re-run
> `vitest run --coverage` before citing these exact figures in the report.

**Resolution (2026-07-04) — ✅ Done.** Coverage was substantially raised this
session: added ~15 new test files (use-cases, DTOs, `db-utils`, and the
`resolve-caller` / `require-hr` auth guards); the suite is now **33 files /
527 cases**. Re-ran `vitest run --coverage`, so the figures in the table above
are **superseded** — `application/use-cases` is now **85.7% lines** (was ~17%),
global **46.9%** (was ~24%), domain services **96.2%**, `lib/auth` **100%**.
Applied to the report: added a **per-layer coverage table** (`tab:coverage-layer`)
and a **pgfplots bar chart** (`fig:coverage-by-layer`) to ch6 §val-unit, updated
the suite counts (305→527, 18→33 files) and the inventory table, and **fixed the
S3 correctness flag** — the "Domain **and** Application" claim is now factually
true because the application use-cases are genuinely ~86% covered. Also corrected
the two stray count references (frontmatter, ch3 reliability row). Full breakdown
in `AppReport/test-coverage-additions.md`.

#### S4 — page 81 — text out of margin

> *"formatted text not good (some text gets our [out] of margin limits)"*

**Assessment — pure LaTeX fix, mechanical.** Page 81 sits immediately after the
test-inventory table (`tab:test-inventory`, page 80), so the overflowing element
is most likely a wide `tabular`, a long unbroken path/URL, or a code listing
running past `\textwidth`. Standard remedies once the element is identified:
`\resizebox{\textwidth}{!}{…}` or `adjustbox` on the table, narrower `p{}`
column widths, `\seqsplit`/`\url`/the project's `\apiep` tokenizer for long
tokens (cf. the pass-3 Table B.1 overlay fix), or `\small`. **Needs the compiled
PDF page (or a paste of the ch6 source around page 81) to pinpoint the exact
element** — see Open Questions.

#### S5 — page 85 — discuss LLM hallucination & external-API dependency as limitations

> *"Seria interessante discutir também limitações como: alucinação dos LLM ou
> dependência de APIs externas…"*
> (It would be interesting to also discuss limitations such as: LLM
> hallucination or dependency on external APIs…)

**Assessment — partly present, but not consolidated where the examiner looks.**
Today: hallucination is touched in ch2 (SOTA) and mitigated via tolerant Zod
validation / schema-drift handling in ch5; external-API dependency appears in
the ch7 risk register (provider outage + Groq→OpenAI fallback). But the
**Limitations section itself** (ch7 §concl-limitations / ch6 §val-limitations)
does not name them as *residual* limitations — mitigation ≠ the limitation
disappearing. Cheap, high-value add: two short paragraphs in the limitations
section explicitly stating (a) LLM output can hallucinate — mitigated by schema
validation + confidence gating, **not eliminated**; (b) the platform depends on
third-party LLM/Auth/DB providers, creating availability, cost, and
data-residency exposure, only partially mitigated by the provider fallback.

**Resolution (2026-07-04) --- ✅ Done.** First verified the examiner's premise:
both concepts are in fact **already discussed across the report** --- hallucination
in ch2 §sota-parsing / §sota-structured, ch4 §design-cv ("untrusted boundary"),
ch5 §impl-cv ("schema drift / invented fields"), ch7 §concl-ai, and the glossary;
external-API dependency in ch4/ch5 (provider fallback), ch3 (reliability NFR),
ch7 §concl-ai, and **already partly in ch6 §val-limitations** as the free-tier
cost/rate ceiling. To avoid duplicating that design-mitigation material, applied
a **minimal targeted edit in ch6 §val-limitations** (the 6.5 section the note is
attached to) rather than two fresh paragraphs: (a) broadened the external-LLM
sentence to name the standing dependence on third-party *availability* --- not
just cost/rate --- and that a simultaneous dual-provider failure halts ingestion
entirely; (b) added an explicit **residual-hallucination** statement --- schema
validation is a *structural*, not *semantic*, guarantee, so a well-formed but
incorrect value (a plausible-yet-wrong employer, date or skill) passes unflagged,
leaving silently-wrong rather than corrupt records, which only ground-truth
comparison or human review would catch. This ties directly into the existing
"not quantified against a labelled ground-truth set" limitation and keeps the
human-review stance explicit.

#### S6 — page 63 — discuss engineering decisions, challenges, trade-offs, alternatives (ch5)

> *"neste capítulo consegues discutir: decisões de engenharia / desafios
> encontrados / compromissos assumidos / alternativas consideradas/rejeitadas?"*
> (In this chapter can you discuss: engineering decisions / challenges
> encountered / trade-offs assumed / alternatives considered-and-rejected?)

**Assessment — already covered; not new content, at most a cross-reference.**
Checked the whole report before adding anything (the author's explicit
question). All four dimensions are present:

- **Decisions + alternatives + trade-offs** — ch4 §design-decisions carries a
  dedicated **Design Decision Log** table (`tab:design-decisions`) with columns
  *Decision | Alternative | Rationale/trade-off*: Supabase vs ORM+Neon+Blob+auth,
  no-ORM vs Prisma/Drizzle, RLS-off vs per-row RLS, rule-based `computeJobFit`
  vs embedding similarity, Groq+OpenAI fallback vs single provider, FastAPI
  sidecar vs in-process JS, text UUID vs serial. ch3 §method-risks (Risks and
  Decision Log) additionally narrates the Prisma/Neon→Supabase migration and its
  driver.
- **Challenges** — ch5 §impl-cv covers schema drift, provider outages, silent
  parse failures, accent-sensitive dedup, and the search-injection vector.
- **Trade-offs** — ch5 parse-confidence heuristic (0.7 loud-failure threshold),
  single-origin location simplification, copy-link email fallback, free-tier
  ceiling; ch7 §concl-ai ORM lesson (manual camelize/snakeify).
- **Framework alternative rejected** — ch5 §impl-stack ("weighed against five
  criteria"; React/Express, Angular, Vue, Remix rejected); ch6 Vitest-over-Jest.

**So the Prisma→Supabase story is NOT missing — it is already told three times**
(ch3 decision log, ch4 `tab:design-decisions`, ch7 ORM lesson). Adding it to ch5
would duplicate and reopen the P1/R2-class echoes that passes 1–7 removed. The
only genuine (minor) gap is that this note sits on **page 63 (ch5)** while the
systematic decision log lives one chapter earlier (ch4), so a reader in ch5
isn't pointed to it. **Minimal safe fix (optional):** a single cross-reference
sentence in ch5 §impl-stack pointing to `\secref{sec:design-decisions}` /
`tab:design-decisions`. No new narrative. **Disposition (2026-07-04): ✅ Done —
added the one-line cross-reference after the "single most consequential choice"
paragraph in ch5 §impl-stack, directing the reader to the ch4 Design Decision
Log for the Supabase / no-ORM / provider-fallback alternatives and trade-offs.
No content duplicated.**

### Open questions to the author (blocking full disposition)

1. **Scope** — action just S3/S4/S5 (implementable now), or also draft the
   S1/S2 validation studies?
2. **S1** — any access to a recruiter's rankings, or a defensible hand-ranking
   of one candidate set for one job? Otherwise → reframe + acknowledged
   limitation only.
3. **S2** — is a small set of CVs with manually-known correct fields available
   (or quickly buildable) for a precision/recall table? Otherwise → limitation.
4. **S4** — which element overflows on page 81 (share the compiled page / paste
   the source)? Otherwise I inspect the most likely candidates and guess.
5. **S3** — re-run `vitest run --coverage` for fresh figures before citing?

### Priority if acting

1. **S1 / S2** — substantive; convert the two biggest criticisms into strengths
   (even tiny studies: one Spearman ρ, one ~20-CV accuracy table).
2. **S3** — add per-layer coverage table + fix the "Domain **and Application**"
   claim (correctness flag above).
3. **S5** — two limitation paragraphs (near-free).
4. **S4** — mechanical margin fix once the element is identified.

### Log-currency check (report vs. this change-log, 2026-07-04)

Requested by the author. Findings:

- **Passes 1–7 are internally consistent and self-describe as applied.** The
  report is at its **post-pass-7 state**; no pass-1–7 item has been reopened by
  this feedback.
- **No conflict introduced.** None of the six supervisor items contradicts a
  prior disposition. S5 is adjacent to **A5 / R2** (provider-fallback) and the
  P1 Limitations consolidation, but asks for *new* residual-limitation prose,
  not a re-trim — so it is additive, not a reversal.
- **One latent correctness item now on record** (S3 sub-note): the ch6
  "Domain **and** Application" coverage claim is not supported by the coverage
  artefact (use-cases ~17%). This was not caught in passes 1–7 (they checked
  prose/consistency, not coverage numbers) and is logged here for the first
  time.
- **Coverage %** — the report deliberately states *no* coverage figure today, so
  the log/report are consistent; adding S3's numbers is a net-new addition, not
  a correction of an existing claim.

**Currency verdict:** with this eighth-pass section added, the change-log now
reflects the current state of the report — i.e. "post-pass-7 prose, plus the
eighth-pass supervisor items, of which **S3, S4 and S5 are applied and S1, S2
and S6 are satisfied by existing prose (2026-07-04)**." S1 and S2 are answered
by the honest consistency-vs-ground-truth reframe (ch6 §val-limitations + ch7),
with the substantive Spearman-$\rho$ / precision-recall studies deferred to
future work by design (no recruiter/labelled data). S6's four dimensions are
already covered by the ch4 Design Decision Log, the ch3 decision log, and
ch5/ch7 — a one-line cross-reference from ch5 to ch4 was added (2026-07-04).
The S3 correctness flag is resolved. The log and the report are in sync.

### Validation

Read-only analysis pass — no report files edited, so no `get_errors` run
required. Coverage figures read directly from `coverage/index.html`
(per-directory summary rows). Feedback text transcribed from the author's
message. When S1–S5 are actioned, add an "Edits applied" subsection here per the
pass-4…pass-7 convention.

---

## Ninth pass — full-report editorial read-through — 2026-07-04

**Author-requested deep pass, "before committing".** Re-read all seven chapters
end-to-end looking for: (a) duplicated text that annoys the reader, (b) parts to
improve, (c) long/annoying phrasing to condense, (d) project-aware
add/remove/improve, and (e) — the standing priority — **reduce AI-Interviewer
detail**, since the conversational FastAPI service is the second team member's
work and the author does not want to over-detail it. The report is already at
its post-pass-8 state (well-converged), so this pass targets a small set of
genuine remaining echoes, not another broad sweep.

### Findings

| Item | Where | Severity | Status |
|------|-------|----------|--------|
| **D1. AI-Interviewer ownership disclaimer restated ~8×.** "Conversational service is the second member's; this documents only the integration contract." | ch1 §scope, ch1 §approach, ch1 §team, ch3 §method-boundary, ch4 §design-interviewer, ch5 §impl-interviewer, ch6 "Module ownership note", ch7 §concl-summary | **Medium** (biggest remaining echo; also serves the "less AI detail" goal) | ✅ Done |
| **D2. CEFR "grammar, vocabulary and fluency sub-scores" phrase ~8×** (grep-confirmed: ch1 obj, ch2 §sota-cefr, ch2 positioning table, ch3 FR-06, ch4 value-objects, ch4 §design-interviewer, ch5 §impl-scoring, ch7 goals). | ch1, ch2 ×2, ch3, ch4 ×2, ch5, ch7 | Low-Medium | ✅ Done |
| **D3. "Single respondent / directional-not-statistical" caveat** — on grep it is **once per chapter** (ch3 §analysis-pains, ch6 §val-survey, ch7 §concl-limitations), not twice in ch6 as first estimated. | ch3, ch6, ch7 | Low | ✅ Done (ch3 trimmed) |
| **D4. Single-origin "Maia" location simplification** explained in ch5 scoring-table Location row + adjacent standalone paragraph, then ch7 §concl-partial + ch7 §concl-future. | ch5 ×2, ch7 ×2 | Low | ✅ Done (ch5 para tightened) |
| **D5. Lazy JD parse / "cached with schema version"** fully restated in ch6 §val-performance (already in ch4 §design-jd + ch5 §impl-jobs). | ch4, ch5, ch6 §val-performance | Low | ✅ Done (ch6 condensed) |
| **D6. "`tsc --noEmit` canonical because build needs deploy-only env vars"** explained in both ch5 §impl-cicd and ch6 §val-static. | ch5, ch6 | Low | ✅ Done (ch5 xref) |
| **T1. Trim AI-Interviewer internal detail** (evaluator/system-prompt refs are the 2nd member's). Keep only the author's HMAC token/session contract. | ch4 §design-interviewer | Low-Medium | ✅ Done |
| **T2. Appendix D reproduces the interviewer system prompts** (both modes) — 2nd member's work; flag for possible removal from the author's report. | Appendix D | Low | ✅ Done (reduced to minimum) |
| **C1. Over-detailed "In-app user guide" paragraph** (sixteen/twelve sections, scroll-spy). | ch5 §impl-engagement | Low | ✅ Done |
| **I1. Value-objects `ASSESSMENT_DEFAULT_WEIGHTS`** lists 5 components (grammar/vocab/clarity/fluency/customer-handling) while the language interview uses 3 CEFR sub-scores — reconciled by a following sentence but still a reader-confusion source. **Correction:** this constant is the *author's* general-assessment template (scoring presets), **not** the 2nd member's evaluator. | ch4 tab:value-objects | Low | ✅ Done |

**Note on prior dispositions.** Several cross-chapter AI-Interviewer mentions
were previously kept as "purpose-distinct" (B3 disposition: ch3 = organizational
home, ch4 = technical contract). D1 does not reopen that — it consolidates the
repeated *ownership disclaimer sentence*, keeping the single full statement in
ch1 §team and reducing the others to a short clause or cross-reference. The
distinct structural roles (scope delimitation, methodology boundary, design
contract, test attribution) remain; only the redundant "developed by the second
member / documents only the integration contract" wording is thinned.

#### D1 — consolidate the AI-Interviewer ownership disclaimer

**Plan.** Canonical full statement stays in **ch1 §team** (the responsibility
split table). The other seven mentions are reduced to a brief clause or a
`\secref{sec:team}` cross-reference, removing the repeated "developed by the
second team member … integration contract only" phrasing while preserving each
location's distinct structural purpose.

**Edits applied (2026-07-04).**

- **ch1 §team** — unchanged; remains the single full statement of the split.
- **ch1 §approach** — removed the duplicated name "Stratos Demertzoglou" and the
  "(a Python FastAPI service)" parenthetical (both live in §team); kept the
  role-split sentence and its `\secref{sec:team}` pointer.
- **ch4 §design-interviewer** — "developed by the second team member" → "(the
  second member's module; \secref{sec:team})", threading to the canonical home.
- **ch5 §impl-interviewer** — added `(\secref{sec:team})` to the section framer;
  wording otherwise intact (section legitimately scopes itself to the
  integration surface).
- **ch6 Module ownership note** — "was developed by the second team member" →
  "is the second team member's (\secref{sec:team})"; deleted the redundant
  closing sentence ("They are part of the shared suite but are attributed
  accordingly to keep the contribution boundary explicit") — the xref plus
  "cover only the Next.js side" already convey it.
- **Left intentionally:** ch1 §scope (genuine scope delimitation, already
  xrefs §team), ch3 §method-boundary (the *organizational* home for the
  boundary rationale — purpose-distinct, not the ownership disclaimer), and
  ch7 §concl-summary (natural authorship statement in the contributions list).

Net effect: every ownership mention now threads to the single canonical home in
ch1 §team; duplicated specifics (developer name, "Python FastAPI service",
redundant attribution sentence) removed. No structural mention deleted.

#### D2 — thin the CEFR sub-score enumeration

**Plan.** Spell out "grammar, vocabulary and fluency" exactly twice — at its
**introduction** (ch1 objectives, item 4) and at the **scoring-mechanism home**
(ch5 §impl-scoring, where the equal-weight average + banded CEFR lookup are
defined). Everywhere else reduce to "sub-scores".

**Edits applied (2026-07-04).**

- **ch1 objectives** — kept full (first mention; defines the three sub-scores).
- **ch5 §impl-scoring** — kept full (mechanism home: equal-weight average, banded
  lookup, editable weight tables).
- **ch2 §sota-cefr** — "translate cleanly into the grammar, vocabulary and
  fluency sub-scores" → "…into the sub-scores".
- **ch2 positioning table** — "a CEFR level with grammar, vocabulary and fluency
  sub-scores" → "a CEFR level with sub-scores".
- **ch3 FR-06 (Behaviour)** — "a CEFR level with grammar, vocabulary and fluency
  sub-scores, stored for human review" → "a CEFR level with sub-scores, stored
  for human review".
- **ch4 value-objects** — "averages the three CEFR sub-scores (grammar,
  vocabulary and fluency) at equal weight (\secref{sec:impl-scoring})" →
  dropped the parenthetical (the xref already points to where they're named).
- **ch4 §design-interviewer** — "a CEFR level with grammar, vocabulary and
  fluency sub-scores" → "a CEFR level with sub-scores" (also serves T1).
- **ch7 goals (item 4)** — "level with grammar, vocabulary and fluency
  sub-scores in language mode" → "level with sub-scores in language mode".

Net: 8 full enumerations → 2 (intro + mechanism); six reduced to "sub-scores".

#### D3 — thin the single-respondent survey caveat

**Correction to the finding.** Grep shows the caveat is **once per chapter**, not
twice in ch6: ch3 §analysis-pains (line ~66), ch6 §val-survey (close of the
honest-reading paragraph), ch7 §concl-limitations (first limitation). Each is a
distinct structural home — methodology setup → validation analysis → formal
limitations register — consistent with the report's established "purpose-distinct
cross-chapter mention" philosophy.

**Edits applied (2026-07-04).**

- **ch3 §analysis-pains** — the mention already forward-references ch6, so trimmed
  it to a lean pointer: "a single-respondent indicator rather than a
  statistically representative sample --- a constraint made explicit when the
  responses are analysed in \chapref{cap:validation}" → "a single-respondent
  indicator --- a constraint analysed in full when the responses are examined in
  \chapref{cap:validation}". Drops the "statistically representative sample"
  framing (which ch6 and ch7 both carry).
- **ch6 §val-survey** — kept (the analysis home; the honest-reading caveat belongs
  where the survey is actually interpreted).
- **ch7 §concl-limitations** — kept (formal limitations register; first bullet).

Net: three full statements → one lean forward-reference + two purpose-distinct
homes; the verbatim "statistically representative/generalisable" echo drops from
three chapters to two.

#### D4 — tighten the single-origin location note (not delete)

**Tension with S6.** The standalone ch5 paragraph is also exactly the kind of
implementation-chapter trade-off discussion the examiner's **S6** requested, so
deleting it would weaken the S6 response. Resolved by **tightening** rather than
removing.

**Edits applied (2026-07-04).**

- **ch5 §impl-scoring standalone paragraph** — "measured from a single hardcoded
  origin, the adidas GBS site in Maia. The rationale for the choice and the
  point at which it becomes a real limitation are examined in …" → "measured
  from a single fixed origin, a choice whose rationale and the point at which it
  becomes a real limitation are examined in …". Drops the repeated "adidas GBS
  site in Maia" (already in the scoring-table Location row directly above, and
  fully examined in ch7) while keeping the deliberate-trade-off signpost + xref.
- **Left:** ch5 scoring-table Location row (mechanism), ch7 §concl-partial
  (limitation home), ch7 §concl-future (future-work item) — purpose-distinct.

#### D5 — condense the JD-parse-cache restatement in ch6 §val-performance

**Edit applied (2026-07-04).** ch6 §val-performance already cross-referenced
\secref{sec:design-jd} but then re-explained the whole lazy-parse mechanism.
Condensed: "as designed in \secref{sec:design-jd}, a job description is parsed by
the Large Language Model only the first time an HR user opens its ranking screen
and the result is cached with a schema version" → "the lazy, schema-versioned JD
parse designed in \secref{sec:design-jd} runs the Large Language Model only on
first use". Keeps the performance point (two caches: JD parse + \texttt{job\_matches})
while leaning on the design home. ch4 §design-jd and ch5 §impl-jobs unchanged.

#### D6 — point ch5 §impl-cicd at the ch6 §val-static home

**Edit applied (2026-07-04).** Both chapters explained that \texttt{tsc -{}-noEmit}
is the canonical local validation step because a full production build fails
locally on deployment-only env vars. Kept the full reasoning in ch6 §val-static
(the static-analysis home); in ch5 §impl-cicd replaced "The canonical local
validation mirrors the first step, since a full production build depends on
deployment-only environment variables" with "that same type-check is the
canonical local validation step (\secref{sec:val-static})". CI description (GitHub
Actions type-check + Vitest + coverage artefact) retained.

#### T1 — trim AI-Interviewer internals in ch4 §design-interviewer

**Edit applied (2026-07-04).** Kept the author-owned contract (session creation,
HMAC-SHA256 token with TTL + hash storage, turn proxying, evaluation persistence,
the magic-link-window distinction) and the sequence diagram. Condensed the
internals: "The interview has two modes --- **technical** skill validation and
**language** assessment --- and the evaluator returns a structured result (for
the language mode, a CEFR level with sub-scores) that is stored as JSONB. The
system prompts for both interview modes are reproduced in \appref{app:prompts}"
→ "The interview runs in one of two modes (technical or language), and the
sidecar's evaluator returns a structured result that the Next.js side persists as
JSONB; the conversational internals and the mode prompts are the second member's,
documented in \appref{app:prompts}". Drops the CEFR-sub-score internal (covered in
ch1/ch5), keeps the author's persistence fact, and reframes the appendix pointer
as explicitly the 2nd member's work (sets up the T2 decision).

#### C1 — condense the in-app user-guide paragraph

**Edit applied (2026-07-04).** Dropped the precise section counts ("sixteen
sections for the HR manager and twelve for the candidate"), the scroll-spy
table-of-contents mechanics, and the parenthetical feature list ("CV upload, job
matching, assessments, data export, and so on"). Kept the substance: in-product
role-aware documentation that stays consistent with the deployed feature set and
reinforces the middleware role boundaries. ~4 lines saved.

#### I1 — disambiguate the ASSESSMENT_DEFAULT_WEIGHTS row

**Correction + edit applied (2026-07-04).** First corrected the finding: this
constant is the **author's** general-assessment template (persisted in
`scoring_presets`), not the second member's evaluator. The confusion is purely
visual — its "grammar, vocabulary … fluency" components overlap the CEFR
sub-score names. Prefixed the table row with "General-assessment rubric:" so it
self-disambiguates at the point of reading, before the existing clarifying
sentence. No numbers changed.

#### T2 — Appendix D interviewer system prompts (✅ Done — reduced to a minimum)

**Author decision (2026-07-04): reduce to a minimum.** The two full interviewer
system-prompt listings (`lst:prompt-tech`, `lst:prompt-lang`) were the second
member's FastAPI-sidecar work. Verified no `\ref` pointed at those labels, then
removed both listings and merged their two subsections into a single short note
(`app:prompts-interview`) stating the prompts run in the sidecar, are the second
member's (\secref{sec:team}), are not reproduced, and that the only Next.js-side
concern is the schema-validated-JSON→JSONB contract (\secref{sec:design-interviewer}).
Also updated the appendix intro (now: reproduces only the two Next.js-owned
prompts — CV parsing + JD extraction; interviewer prompts only summarised),
trimmed the conventions paragraph (dropped the FastAPI/Pydantic mentions), and
softened the ch4 §design-interviewer pointer from "documented in" to "summarised
in \appref{app:prompts}". Appendix D now reproduces only the author's two
application prompts in full.

### Ninth-pass outcome (2026-07-04)

Applied this session: **D1, D2, D3, D4, D5, D6, T1, T2, C1, I1** — all ten items.
No item deferred. Report edits are `.tex`/`.md` only — no TS/CI/deploy impact;
validation is a LaTeX recompile in Overleaf (pdfLaTeX → biber → pdfLaTeX ×2).