# Documentation Map

> Single index of every documentation file in the repository (excluding the `AppReport/` academic report,
> which is maintained separately). Use this to navigate, and keep it in sync when docs are added, retired,
> or moved.
>
> **Last updated:** 2026-06-21

---

## Legend

| Tag | Meaning |
|---|---|
| 🟢 **Active** | Current source of truth — keep updated. |
| 📘 **Guide** | End-user / setup documentation. |
| 🧭 **Reference** | Stable reference material (schema, queries, design notes). |
| 🟡 **Plan (open)** | Proposal / roadmap not yet fully implemented. |
| 🗄️ **Historical** | Superseded or fully implemented; kept for context only. |

---

## Start here

| Order | Document | Purpose |
|---|---|---|
| 1 | [CLAUDE.md](../CLAUDE.md) | 🟢 Project memory — stack, architecture, current decisions. **Read first.** |
| 2 | [INSTRUCTIONS.md](../INSTRUCTIONS.md) | 🟢 Non-negotiable coding rules (onion architecture, DB conventions, auth). |
| 3 | [README.md](../README.md) | 🟢 Public overview — features, stack, getting started, deployment. |
| 4 | [docs/TODO.md](TODO.md) | 🟢 Active work tracker (status legend + completed log). |
| 5 | **docs/DOCUMENTATION_MAP.md** | 🧭 This file — index of all documentation. |

---

## Setup & operations

| Document | Tag | Purpose |
|---|---|---|
| [supabase/README.md](../supabase/README.md) | 📘 | Supabase setup checklist — SQL migration, Google OAuth, env vars, storage bucket. |
| [ai_interviewer_backend/README.md](../ai_interviewer_backend/README.md) | 📘 | FastAPI AI-interviewer sidecar — files, quick start, deployment. |
| [docs/CONTACT_EMAIL_OPTION_B_SETUP.md](CONTACT_EMAIL_OPTION_B_SETUP.md) | 📘 | Resend verified-domain setup to enable real HR contact-email delivery (pending). |
| [docs/TODO_MANUAL_WORK.md](TODO_MANUAL_WORK.md) | 🟢 | Manual ops follow-ups (env vars, OAuth consent screen, manual interview QA). |

---

## End-user guides

| Document | Tag | Purpose |
|---|---|---|
| [docs/USER_GUIDE_HR.md](USER_GUIDE_HR.md) | 📘 | HR manager guide (v1.4) — every HR workflow + feature status. |
| [docs/USER_GUIDE_CANDIDATE.md](USER_GUIDE_CANDIDATE.md) | 📘 | Candidate guide (v1.3) — sign-in, CV upload, applying, assessments. |

---

## Reference material

| Document | Tag | Purpose |
|---|---|---|
| [docs/ER_DIAGRAM.md](ER_DIAGRAM.md) | 🧭 | Mermaid ER diagram of all 33 tables — derived from the canonical schema. |
| [docs/db-queries.md](db-queries.md) | 🧭 | Reusable SQL snippets (e.g. experience-years computation across date formats). |
| [docs/talent_intelligence_language_verification_platform_spec.md](talent_intelligence_language_verification_platform_spec.md) | 🧭 | Original project specification (the brief the platform was built against). |

---

## Plans & roadmaps

| Document | Tag | Status | Purpose |
|---|---|---|---|
| [docs/UIUX_improvements.md](UIUX_improvements.md) | 🟡 | Open | Prioritized UI/UX improvement backlog (effort/impact tagged). |
| [docs/GDPR_COMPLIANCE_PLAN.md](GDPR_COMPLIANCE_PLAN.md) | 🟡 | Partially done | GDPR gap analysis + remediation roadmap. Required before any real launch. |
| [docs/CV_PARSING_IMPROVEMENT_PLAN.md](CV_PARSING_IMPROVEMENT_PLAN.md) | 🟡 | Proposal | Correctness/robustness/privacy hardening of the CV parsing pipeline. |
| [docs/ANALYTICS_CHAT_PLAN.md](ANALYTICS_CHAT_PLAN.md) | 🟡 | Planned | Natural-language → `WidgetSpec` chat layer over the analytics catalog. |
| [docs/archive/JOB_ANCHORED_MATCHING_PLAN.md](archive/JOB_ANCHORED_MATCHING_PLAN.md) | 🗄️ | Implemented | Design reference for job-anchored matching (live spec lives in CLAUDE.md). |

---

## Audits

| Document | Tag | Purpose / open items |
|---|---|---|
| [docs/audit-7-06-2026.md](audit-7-06-2026.md) | 🟢 | Current authoritative health snapshot (2026-06-07): ~95% feature-complete, tests green, type-safe. Lists the remaining finalization items. **Read this for current state.** |
| [docs/archive/audit-6-5-2026.md](archive/audit-6-5-2026.md) | 🗄️ | Superseded by the June audit. Dead-code/security sweep; its key items (service-role key rotation, security warnings) were addressed and are reflected in `audit-7-06-2026.md`. |
| [docs/archive/audit-2026-04-26.md](archive/audit-2026-04-26.md) | 🗄️ | Earlier severity-graded audit; most findings resolved, remainder rolled into later audits. Kept for historical context. |

---

## Archive (superseded / fully shipped)

| Document | Tag | Purpose |
|---|---|---|
| [docs/archive/JOB_ANCHORED_MATCHING_PLAN.md](archive/JOB_ANCHORED_MATCHING_PLAN.md) | 🗄️ | Design reference for job-anchored matching (shipped; live spec in CLAUDE.md). |
| [docs/archive/TODO_JOB_ANCHORED_MATCHING.md](archive/TODO_JOB_ANCHORED_MATCHING.md) | 🗄️ | Implementation checklist for job-anchored matching (shipped). |
| [docs/archive/PER_JOB_SHORTLIST_PLAN.md](archive/PER_JOB_SHORTLIST_PLAN.md) | 🗄️ | Per-job shortlist design (shipped; live spec in CLAUDE.md). |
| [docs/archive/audit-6-5-2026.md](archive/audit-6-5-2026.md) | 🗄️ | Code/security audit (2026-05-06), superseded by `audit-7-06-2026.md`. |
| [docs/archive/audit-2026-04-26.md](archive/audit-2026-04-26.md) | 🗄️ | Severity-graded audit (2026-04-26), superseded by later audits. |

---

## AppReport (out of scope here)

The `AppReport/` folder holds the formal academic report (10 numbered chapters plus a LaTeX build).
It is maintained on its own cadence and is intentionally **not** covered by this map.

---

## Maintenance notes

- When you add a doc, add a row here under the right section with a tag.
- When a 🟡 plan ships, move its row to **Archive** (or mark 🗄️ Implemented) and point readers to the live
  spec in [CLAUDE.md](../CLAUDE.md).
- Keep verifiable numbers (table count, test count, versions) consistent across `README.md`, `CLAUDE.md`,
  and `ER_DIAGRAM.md`. As of 2026-06-06: **33 tables**, **258 tests across 17 files**.
