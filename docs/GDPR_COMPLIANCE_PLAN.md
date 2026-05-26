# GDPR Compliance Plan

> **Status**: Partially implemented — see §2.0 for current state
> **Scope**: Entire Talent Intelligence & Language Verification Platform, with special focus on CV parsing, AI interviews, and assessments
> **Owner**: Stratos
> **Last updated**: 2026-05-25
> **Legal reference**: Regulation (EU) 2016/679 — General Data Protection Regulation

---

## 1. Why This Plan Exists

The platform processes **large volumes of special-category and sensitive personal data**: full CVs, names, contact details, employment history, education, language proficiency, AI-generated skill evaluations, recorded voice (during interviews), transcripts, and in some cases webcam video for proctoring. It also routes personal data to **third-country LLM providers** (Groq, OpenAI) for inference.

Under GDPR this creates concrete obligations. We are currently **not compliant**. This document lays out what needs to change, in what order, and why.

This plan must be implemented **before any real production launch with non-test candidates** or any commercial pilot with HR teams handling real applicants.

---

## 2. Current State Assessment (Gaps)

### 2.0 Implementation Status (May 2026 audit)

| Priority | Item | Status | Notes |
|----------|------|--------|-------|
| P0-1 | Privacy Policy published | ✅ Done | `/privacy` page covers legal basis, Art. 22 text, SCCs, cookies, data subject rights. Linked from landing + login. No separate ToS page. |
| P0-2 | Granular consent at signup | ❌ Missing | No `user_consents` table in schema. No onboarding consent step. |
| P0-3 | HR-upload consent workflow | ❌ Missing | No `consent_status` column on `candidates`, no invitation email, no 30-day auto-purge cron. |
| P0-4 | DPAs with Groq / OpenAI | ❌ Missing | `legal/` folder does not exist. Privacy page mentions "enterprise DPAs" but no signed copies stored. |
| P0-5 | Transfer Impact Assessments | ❌ Missing | No `legal/tia-groq.md` or `legal/tia-openai.md`. |
| P0-6 | `DELETE /api/me` (right to erasure) | 🟡 Partial | Route exists (`src/app/api/me/route.ts`). Deletes candidate row + storage blobs. **Auth user NOT deleted** — `supabase.auth.admin.deleteUser()` never called. Google/Supabase auth account persists. |
| P0-7 | `GET /api/me/export` (portability) | ❌ Missing | Route does not exist. Privacy policy promises "export as CSV from settings" but neither the endpoint nor the settings button exists. |
| P0-8 | Consent withdrawal button in settings | ❌ Missing | Settings page has notification opt-outs (different concern). No processing-consent withdrawal flow. |
| P0-9 | Art. 22 notice + `request_human_review` | 🟡 Partial | Text-only in privacy policy and interview pre-consent checkbox. No `request_human_review` button/flag on AI results or match scores. |
| P0-10 | Cookie consent banner | ✅ Done | `cookie-consent.tsx` — Accept/Decline, localStorage, links to privacy policy. Correct for strictly-necessary-only setup. |
| P0-11 | ROPA (`legal/ropa.md`) | ❌ Missing | |
| P0-12 | DPIA (`legal/dpia.md`) | ❌ Missing | |
| P1-1 | Retention cron jobs | ❌ Missing | No pg_cron jobs anywhere in the codebase. |
| P1-2 | Breach response runbook | ❌ Missing | Privacy policy commits to 72h notification; no actual runbook document exists. |
| P1-3 | `hr_audit_log` table | ❌ Missing | Table not in schema. |
| P1-4 | Least-privilege Supabase (RLS) | ❌ Missing | Service role used in all routes; no RLS enabled. |
| P1-5 | Sub-processor list page | ❌ Missing | No `/legal/subprocessors` page. |
| P1-6 | Log sanitisation (no PII in logs) | 🟡 Partial | `createLogger` with field redaction exists. No confirmed PII audit pass across all routes. |
| P1-9 | Source type tracking (G28) | 🟡 Partial | `candidates.source_type` column exists (EXTERNAL / PLATFORM / AMBASSADOR). No `consent_status` column. |
| P2-5 | EU region confirmed | ❓ Unknown | Supabase region not verified programmatically. |

**Summary — P0**: 2 done, 2 partial, 8 missing. **P1**: 0 done, 1 partial, 7 missing.

### Prioritised next actions

1. **Fix erasure gap** *(30 min)* — call `supabase.auth.admin.deleteUser(userId)` at end of `deleteCurrentProfile()` in `profile.use-cases.ts`.
2. **Add `GET /api/me/export`** *(2–3 h)* — candidate self-service JSON/CSV download; add button in `/dashboard/settings`.
3. **Add `request_human_review` flag + button** *(2–3 h)* — `assessment_results.human_review_requested BOOLEAN`; button on results page; email HR.
4. **Write ROPA + DPIA** *(1 day)* — markdown documents in `legal/`; no code changes.
5. **Granular consent at signup** *(2–3 days)* — `user_consents` DB table + onboarding modal (biggest P0 dev effort).

### 2.1 Legal Basis & Consent

| # | Gap | Risk |
|---|---|---|
| G1 | No consent collection UI at candidate signup or CV upload. | Article 6/7 violation. |
| G2 | No differentiated consent for: (a) core processing, (b) AI evaluation, (c) sharing with HR, (d) marketing/promo emails. | Consent must be granular. |
| G3 | No record of *when* / *how* consent was given (timestamp, IP, consent version). | Can't prove consent (Art. 7(1)). |
| G4 | No consent withdrawal mechanism. | Art. 7(3) violation. |
| G5 | No "Terms of Service" / "Privacy Policy" page linked from signup. | Art. 13 violation. |

### 2.2 Data Subject Rights

| # | Gap |
|---|---|
| G6 | No "download my data" (portability, Art. 20) endpoint. |
| G7 | No "delete my account + all data" button (right to erasure, Art. 17). |
| G8 | No "correct my data" flow beyond the profile edit page — AI-generated assessments cannot be contested. |
| G9 | No restriction-of-processing mechanism (Art. 18). |
| G10 | No automated-decision opt-out (Art. 22) — AI interview scoring is automated processing. |

### 2.3 Third-Country Transfers

| # | Gap |
|---|---|
| G11 | CV text is sent to Groq (US) and OpenAI (US) with no Standard Contractual Clauses on record, no Transfer Impact Assessment. |
| G12 | No Data Processing Agreement (DPA) signed with Groq/OpenAI. |
| G13 | No mention of third-country transfers in the (missing) privacy policy. |

### 2.4 Data Minimisation & Retention

| # | Gap |
|---|---|
| G14 | Raw CV text kept indefinitely alongside parsed fields — unnecessary duplication. |
| G15 | AI interview audio retained indefinitely (no retention policy). |
| G16 | Proctoring events + webcam snapshots kept forever. |
| G17 | `llm_usage_log` (if added) may leak prompt content = CV content = personal data. |
| G18 | No automated deletion of inactive accounts (e.g. after 2 years). |

### 2.5 Security & Breach Readiness

| # | Gap |
|---|---|
| G19 | No breach notification workflow. Art. 33 requires notification of supervisory authority within 72h. |
| G20 | No encryption-at-rest documentation (Supabase encrypts by default but we must document it). |
| G21 | Service-role key exposed in many server files — principle of least privilege not enforced; one leaked env var = full DB access. |
| G22 | No audit log of who (HR) viewed which candidate. |

### 2.6 Organisational

| # | Gap |
|---|---|
| G23 | No Data Protection Officer (DPO) designated — likely required for systematic profiling of candidates at scale (Art. 37(1)(b)). |
| G24 | No Record of Processing Activities (ROPA, Art. 30). |
| G25 | No Data Protection Impact Assessment (DPIA, Art. 35) — required because we do AI-based scoring (high risk). |
| G26 | No vendor / sub-processor register. |

### 2.7 Candidate & HR-Specific Concerns

| # | Gap |
|---|---|
| G27 | HR users can bulk-upload CVs **of candidates who never consented** to our platform. This is the single biggest legal risk. |
| G28 | No "source of data" tracking — we cannot distinguish candidate self-uploads from HR-bulk-uploads on the candidate record. |
| G29 | AI interview transcripts + audio are special-category adjacent (biometric voice data under some interpretations). |
| G30 | Skill verification results influence hiring decisions → Art. 22 automated decision-making. |

---

## 3. Remediation Plan

Ranked by legal priority. **P0** = blocks production launch. **P1** = required within 90 days of launch. **P2** = required within first 12 months.

### 3.1 P0 — Before Production Launch

| # | Action | Artefact |
|---|---|---|
| P0-1 | **Write and publish Privacy Policy + Terms of Service.** Cover controllers, purposes, legal bases, retention, third-country transfers (Groq/OpenAI), data subject rights, DPO contact, supervisory authority. | `/legal/privacy` page + `/legal/terms` page |
| P0-2 | **Granular consent at signup.** Four checkboxes: (a) core processing [required], (b) AI evaluation [required], (c) visibility to HR users [required], (d) marketing [optional]. Record `consent_version`, `granted_at`, `ip_address`. | DB table `user_consents`; onboarding step |
| P0-3 | **HR-upload consent workflow (G27 fix).** When HR bulk-uploads, the system auto-emails each candidate a *consent invitation link*. Candidates marked `consent_status: "pending"` are invisible to HR matching until they click through. If not accepted within 30 days, the record is deleted. | Email template; `candidates.consent_status` column; cron job |
| P0-4 | **Sign DPAs with Groq and OpenAI.** Both publish standard DPAs. Store signed copies in `legal/dpas/`. | Vendor register |
| P0-5 | **Transfer Impact Assessment** for US transfers. Document that EU data is sent outside EU to providers bound by SCCs + DPF (Data Privacy Framework). | `legal/tia-groq.md`, `legal/tia-openai.md` |
| P0-6 | **Right to erasure endpoint**: `DELETE /api/me` — cascades to all tables (candidates, assessments, interviews, audio, transcripts, storage blobs). | New API route + cascade audit |
| P0-7 | **Right to access / portability endpoint**: `GET /api/me/export` — returns ZIP with JSON + original files. | New API route |
| P0-8 | **Consent withdrawal button** in `/dashboard/settings`. Triggers soft-lock of AI processing while data is retained for any active HR applications; then purge. | UI + backend |
| P0-9 | **AI automated-decision notice + opt-out (Art. 22).** Before any AI scoring, display: "Your answers will be evaluated by an AI. You have the right to request human review." Add `request_human_review` button on results. | Modal + DB flag |
| P0-10 | **Cookie banner** (if we add analytics). Currently only Supabase auth cookies = strictly necessary, so banner may be optional, but add disclosure. | `cookie-banner.tsx` |
| P0-11 | **ROPA document** (Art. 30). Template inventory of: purpose, categories of data, categories of subjects, recipients, retention, cross-border transfers, security measures. | `legal/ropa.md` |
| P0-12 | **DPIA for AI assessment + interview** (Art. 35). Document the systematic scoring, risks, mitigations. | `legal/dpia.md` |

### 3.2 P1 — Within 90 Days

| # | Action |
|---|---|
| P1-1 | **Retention policies** codified in DB + cron: CV raw text purged 90 days after parsing (keep parsed fields); interview audio purged 30 days after evaluation; proctoring events purged 30 days; inactive candidate accounts purged after 24 months of inactivity (after 6-month pre-deletion email). |
| P1-2 | **Breach response runbook**: detection → assessment → 72h notification template → user notification template → post-mortem. |
| P1-3 | **Audit log**: every HR view/search of a candidate record logged to `hr_audit_log` (who, what, when, from where). Retained 12 months. |
| P1-4 | **Principle of least privilege on Supabase**: replace service-role key usage in non-privileged routes with RLS-backed user client. Service role only in admin/cron paths. |
| P1-5 | **Vendor register + sub-processor list** published at `/legal/subprocessors`. |
| P1-6 | **Data minimisation pass on logs**: ensure we never log CV text, never log prompts containing PII to external tools (Sentry, Vercel logs, etc.). |
| P1-7 | **LLM usage log sanitisation**: `llm_usage_log` must store only token counts + hash of content, never raw content. |
| P1-8 | **Designate DPO or DPO-equivalent contact**. For a small team this can be an external fractional DPO. |
| P1-9 | **Candidate source tracking**: `candidates.source IN ('self','hr_bulk')` for G28. |

### 3.3 P2 — Within 12 Months

| # | Action |
|---|---|
| P2-1 | **Annual DPIA review.** |
| P2-2 | **Annual vendor DPA audit.** |
| P2-3 | **Staff training log**: anyone with prod DB access must complete annual GDPR training. |
| P2-4 | **Pseudonymisation at rest** for free-text fields: encrypt CV raw text with a per-row key. |
| P2-5 | **EU region hosting**: confirm Supabase project is in EU region (Frankfurt / Ireland). If not, migrate. |
| P2-6 | **Independent privacy review** by external counsel before first enterprise HR client onboarding. |

---

## 4. Interactions with CV Parsing Plan

The CV parsing improvement work ([CV_PARSING_IMPROVEMENT_PLAN.md](CV_PARSING_IMPROVEMENT_PLAN.md)) touches GDPR at several points. Align the two as follows:

| CV Plan Item | GDPR Requirement |
|---|---|
| R1 OCR fallback | OCR'd text is still personal data → same retention policy. If we route to hosted OCR (AWS/Google), that's another sub-processor → DPA + ROPA update. **Recommendation**: stay on Tesseract.js (runs in-region) to minimise transfers. |
| R3 Smarter retry + LLM fallback | Every provider hit = a cross-border transfer. Log provider per call; aggregate in monthly transfer report. |
| R19 Observability / `llm_usage_log` | Must store hashes + token counts only, never prompt/response content (P1-7). |
| R11 Queue (QStash/Inngest/etc.) | New sub-processor → DPA + ROPA update. Pick an EU-region option if available. |
| Cache `parsed_cv_cache` (CV plan §4.5) | Personal data cache. Include in retention policy (purge 90 days after last use). |
| Bulk HR upload | Triggers P0-3 workflow — this is the highest-risk feature. Ship consent email at the same time as p-limit concurrency. |

---

## 5. Data Flow Map (To Build)

As part of P0-11 (ROPA), produce a Mermaid diagram covering:

```
Candidate → Browser → Supabase Storage (CV file)
                    → Supabase DB (user + consent)
                    → /api/upload → Text extraction (server, EU)
                                  → Groq API (US) — SCC+DPF
                                  → [fallback] OpenAI API (US) — SCC+DPF
                                  → Supabase DB (parsed fields)

HR     → Browser → Supabase DB (search/read candidates)
                 → /api/upload/bulk → same path as above, plus
                                    → Email (Resend, EU) — consent invitation

Interview → Browser → FastAPI sidecar (EU region)
                    → OpenAI Whisper (US) — SCC+DPF
                    → OpenAI GPT-4o-mini (US) — SCC+DPF
                    → Supabase DB (transcripts + scores)
                    → Supabase Storage (audio) — 30d retention
```

This diagram belongs in `legal/ropa.md`.

---

## 6. Technology & Cost Implications

| Need | Tech | Estimated cost |
|---|---|---|
| Legal drafting (privacy policy, ToS, DPIA, ROPA) | External lawyer or [iubenda](https://iubenda.com) / [termly.io](https://termly.io) templates as a starting point | €500–€3,000 one-off |
| Fractional DPO | Outsourced | €200–€500/mo |
| Consent management UI | Build in-house | 2–3 dev days |
| Data subject rights endpoints (export/delete) | Build in-house | 3–5 dev days |
| Retention cron jobs | Supabase Edge Functions + pg_cron (included) | €0 |
| Audit log storage | Supabase Postgres (included up to plan limits) | €0 |
| EU-region confirmation | Supabase plan upgrade if currently on non-EU | Check current plan |
| Staff training | Online courses (IAPP, CIPP/E self-study) | €50–€500/person |

---

## 7. Risk Register (Legal)

| Risk | Likelihood | Impact | Mitigation | Priority |
|---|---|---|---|---|
| HR bulk-uploads CVs of non-consenting candidates | **High** (current default behaviour) | Very high (up to 4% global turnover fine) | P0-3 |  P0 |
| Data subject files access request, we can't respond in 30d | Medium | High | P0-6, P0-7 | P0 |
| LLM provider breach exposes candidate CVs | Low | Very high | P0-4, P1-7 (no raw content in logs) | P0/P1 |
| Candidate challenges AI rejection under Art. 22 | Medium | Medium | P0-9 | P0 |
| Supervisory authority requests ROPA/DPIA, we don't have them | Low (academic project) / Medium (after launch) | High | P0-11, P0-12 | P0 |
| Orphaned CV blobs in Supabase Storage (from CV plan B4) | High | Low-Medium | CV plan R7 | P0 (via CV plan) |

---

## 8. Checklist for "Ready for Real Candidates" Launch

- [x] Privacy Policy published and linked on signup *(`/privacy` — complete; no separate ToS page yet)*
- [x] Cookie consent banner live *(strictly-necessary disclosure — complete)*
- [ ] Terms of Service page (`/legal/terms`)
- [ ] Granular consent collection live (`user_consents` table + onboarding step)
- [ ] Right to erasure endpoint fully live + tested *(route exists; auth user deletion missing)*
- [ ] Right to access/export endpoint live + tested (`GET /api/me/export` + settings button)
- [ ] Consent withdrawal live (distinct from notification opt-outs)
- [ ] AI Art. 22 notice + `request_human_review` button on results
- [ ] DPAs with Groq and OpenAI signed and stored in `legal/dpas/`
- [ ] TIAs written for US transfers (`legal/tia-groq.md`, `legal/tia-openai.md`)
- [ ] ROPA document complete (`legal/ropa.md`)
- [ ] DPIA for AI processing complete (`legal/dpia.md`)
- [ ] HR-upload candidate-invitation workflow live (`consent_status` + invitation email)
- [ ] Retention cron jobs scheduled (pg_cron for CV text, audio, inactive accounts)
- [ ] Breach runbook documented
- [ ] DPO contact (even if external/fractional) identified
- [ ] Supabase region confirmed EU
- [ ] Legal review (external) signed off

---

## 9. Disclaimer

This is an engineering-led plan, not legal advice. Before production launch the plan must be reviewed by qualified EU data-protection counsel. National laws (e.g. Greek Law 4624/2019, German BDSG, Italian Codice Privacy) may add requirements on top of the GDPR baseline.
