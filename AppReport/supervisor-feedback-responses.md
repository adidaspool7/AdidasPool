# Supervisor Feedback — Response & Change Map

> **Purpose.** A quick, supervisor-facing reference showing, for each feedback
> point, how the report now addresses it and where to find the change. Use it to
> reply to the supervisor and let him confirm his feedback was taken into account.
>
> **How to read.** "Where" gives chapter + section (labels are stable even when
> page numbers shift after recompiling). Status: ✅ applied · 🔄 in progress ·
> 💬 answered (no change needed) · ⏳ awaiting your decision.
>
> **Source of truth for detail:** `final-feedback-points-analysis.md` (full
> per-point log). This file is the condensed, send-to-supervisor version.

---

## Addressed in the current draft

| # | What you flagged | How the report now addresses it | Where | Status |
|---|------------------|----------------------------------|-------|--------|
| 1 | "Four-team" wording implied four separate teams | Rephrased: four **sub-teams** within one team, all serving adidas as client | Ch. 1 §Context | ✅ |
| 3 | "HR teams" — there was only **one** adidas HR team | Client described consistently as a single HR & Talent Acquisition team; abstract wording made singular | Ch. 1 abstract; Ch. 3 §Stakeholders | ✅ |
| 4 | Dangling footnote "1" on "Onboarding of hired employees" | Footnote was trapped inside a table (never rendered); explanation moved into running prose, table cell left plain | Ch. 1 §Scope (Table 1.2) | ✅ |
| 5 | Empty "out of scope" cell for analytics/widgets | Filled: "Free-form SQL access or a full business-intelligence suite" | Ch. 1 Table 1.2 | ✅ |
| 6 | Reference to the user guides (HR & candidate) | Confirmed present; the guides are referenced from the report | Ch. 6 / appendices | ✅ |
| 9 | Personas "Carla" and "Tiago" named once, never reused | Removed named personas; replaced with generic **HR member** and **candidate** (job / internship / ambassador) profiles | Ch. 3 §Stakeholders and User Profiles | ✅ |
| 10 | GDPR: what survives the 6-month deletion? | Clarified retention model + future pseudonymised repeat-applicant record | Ch. 4 §Design (GDPR) | ✅ |
| 11 | How do the four sub-projects connect? | Added a paragraph explaining the shared candidate journey (research/branding → TalentHub → onboarding) | Ch. 1 §Context | ✅ |
| 12 | Figure 3.1 missing the job-matching use case | Use-case coverage corrected | Ch. 3 (use-case diagram) | ✅ |
| 14 | "a dedicated client-acceptance session" — there were several | Made plural | Ch. 3 / Appendix C | ✅ |
| 15 | "meeting minutes (Appendix C)" was inaccurate | Reworded to "the client-engagement log records the cadence" (matches the appendix's actual title) | Ch. 3 (Appendix C ref) | ✅ |
| 19 | Table 3.7 title should define L and I | Added "Likelihood (L) and Impact (I)" to the caption | Ch. 3 (risk table) | ✅ |
| 20 | Glossary missing several terms | Added 11 entries: Whisper, Zod, shadcn/ui, Tailwind CSS, Cookies, CORS, MIME, Vitest, V8, Turbopack, GIN index | Frontmatter §Glossary | ✅ |
| 21 | "adidas Design team" requested the welcome page — inaccurate | Corrected to the author's own group/team design | Ch. 5 | ✅ |
| 24 | "uploaded CVs" too narrow | Enumerated candidate documents once (CVs, motivation letters, learning agreements); tables use "candidate documents"; ambassador videos now external URLs | Ch. 4 §Design; Ch. 5 tech stack | ✅ |
| 25–57 (various) | Wording/accuracy fixes (see full log) | Applied per the analysis log (e.g. welcome-flow order, job-sync wording, "about a minute", honest-limitations phrasing) | Various | ✅ |
| 50 | Figure 6.1 caption too long / repetitive; placement | Caption shortened to "Line coverage by architectural layer (V8 provider)."; figure relocated before the "glue between layers" paragraph | Ch. 6 §Coverage | ✅ |
| 58 | Too much bold introduced in §7.3.3–7.3.4 | Stripped inline bold from body prose; kept it only on structural list labels/titles | Ch. 7 §7.3 | ✅ |
| 59 | Toy prompt example "add feature X" | Rewritten to "asking for a whole feature in a single step"; verified no similar toy examples remain | Ch. 7 §7.3 | ✅ |
| 61 | Two suggested citations should be dropped | Removed `LaumerEckhardt2011` and `Fowler2002PoEAA` (citations + bibliography entries) | Ch. 2 §SOTA; Ch. 4; bibliography | ✅ |

> The block "25–57 (various)" stands in for the many small wording/accuracy edits
> already applied; each is itemised individually in
> `final-feedback-points-analysis.md` if the supervisor wants line-by-line detail.

---

## Answered (no change required)

| # | Question | Answer given |
|---|----------|--------------|
| 2 | Are there links to the live app in the document? | No links exist anywhere; decision taken to keep it that way (appropriate for a public academic thesis) | 💬 |
| 60 | What is meant by "bias detection"? | A fairness/disparate-impact auditing module (compares score/eligibility distributions across demographic slices); an unbuilt placeholder / future work, referenced 5× in the report | 💬 |

---

## Still open (awaiting decision or in progress)

| # | Item | Needs |
|---|------|-------|
| 7 / 17 | JIRA backlog not yet built | Backlog plan drafted in `jira-backlog-plan.md`; JIRA CSV to be generated | 🔄 |
| 8 | This response map | Being maintained here | 🔄 |
| 13 | Product-Owner responsibilities feel repetitive | Which instance to keep full (recommend Ch. 7) | ⏳ |
| 16 | Screenshot of the (unreadable) Figma board | Include or not? | ⏳ |
| 18 | Gantt (Fig. 3.2) timeline edits + 2nd situation line (24 Mar) | Confirm month spans | ⏳ |
| 23 | §3.8 conclusion feels short | Expand or leave? | ⏳ |
| 27 | Job-specific AI interview | Add as future-work bullet? | ⏳ |
| 32 | How auto-deletion would work | Add a sentence or leave as nice-to-have? | ⏳ |
| 33 | Decision-table rows (stack choices) | Draft rows? | ⏳ |
| 36 | AI-injection (`.or()`) example | Was it found via AI-assisted review? | ⏳ |
| 41 | AI-Interviewer integration repeated (Ch. 4 vs Ch. 5) | Which side to trim? | ⏳ |
| 45 / 47 | Screenshots / oversized image | Need assets / which image | ⏳ |

---

*Keep this file in step with `final-feedback-points-analysis.md` as remaining
points close, then send the "Addressed" + "Answered" sections to the supervisor.*
