# CV Parsing Improvement Plan

> **Status**: Proposal — awaiting approval before implementation
> **Scope**: Candidate single-upload, HR single-upload, and HR bulk upload flows
> **Owner**: Stratos
> **Last updated**: 2026-04-22

---

## 1. Why We Need to Improve

CV parsing is the **fulcral point** of the platform — every downstream feature (matching, scoring, business-area classification, skill verification, AI interviews, improvement tracks) depends on the structured data we extract. Current results are *acceptable in manual spot-checks* but the code path has several latent risks that will surface once traffic grows or CV variety widens (non-ASCII names, scanned PDFs, multi-column layouts, recruiter ZIP drops of 50+ files).

The audit below groups findings by the category of harm they cause.

### 1.1 Correctness Risks (A — highest priority)

| # | Issue | File | Impact |
|---|---|---|---|
| A1 | **No OCR fallback.** `extractFromPdf` throws if extracted text is `< 50 chars`. Scanned PDFs (very common from older candidates, mobile scans, agencies that re-export) are rejected outright. | `src/server/infrastructure/extraction/text-extraction.service.ts` | Candidate cannot upload → silent drop of qualified talent. |
| A2 | **`mergePages: true` flattens multi-column layouts.** Two-column CVs (very common in EU market) get text interleaved row-by-row, corrupting section boundaries. LLM then hallucinates or misattributes experience. | same file | Wrong employer on wrong job, skills merged into education, etc. |
| A3 | **Zod validation retry reuses the identical prompt.** When the LLM returns a structurally invalid JSON, we retry with the *same* instructions, so we usually get the same failure. | `src/server/infrastructure/ai/cv-parser.service.ts` | Wasted tokens; final fallback to partial data. |
| A4 | **`firstName`/`lastName` coerced to `"Unknown"`.** Missing names silently become `"Unknown Unknown"` candidates in the DB, polluting dedup and search. | `src/server/application/dtos.ts` (`CvExtractionSchema`) | False positives in dedup; fake candidates in HR pool. |
| A5 | **Invalid emails silently become `null`.** No `needsReview` flag; HR never sees that a field failed. | same file | Data loss with no audit trail. |
| A6 | **Diacritics-unaware deduplication.** `ILIKE` name match treats `João` ≠ `Joao`, `Müller` ≠ `Muller`. | `src/server/infrastructure/database/dedup.repository.ts` | Duplicate profiles for international candidates. |
| A7 | **No race-condition guard on insert.** Two concurrent uploads of the same candidate (e.g. bulk + self-upload) both pass dedup and both insert. | same file | Real duplicates in production. |

### 1.2 Robustness / Performance Risks (B)

| # | Issue | Impact |
|---|---|---|
| B1 | **`after()` is not a durable queue.** Bulk jobs rely on Next.js `after()` which has a ~17 min serverless cap on Vercel. A ZIP with 60 CVs at 500 ms throttle + LLM latency will truncate mid-batch. | Silent data loss on large uploads. |
| B2 | **Serial bulk loop with fixed 500 ms throttle.** No concurrency, no adaptive backoff — so a 30-CV ZIP takes 4–8 minutes even when providers have spare capacity. | Poor HR UX; timeouts. |
| B3 | **`cancelledJobs: Set<string>` is in-memory.** On a horizontally scaled deployment (Vercel preview → prod), cancel signals issued on one instance don't reach the instance running the job. | Cancel button lies to the user. |
| B4 | **Storage-before-parse.** We upload the file to Supabase Storage first, then parse. If parsing fails, the blob is orphaned forever. | Slow storage leak; bill grows over time. |
| B5 | **`/api/upload/route.ts` claims 202 but awaits synchronously.** Legacy endpoint; misleading. | Client waits indefinitely thinking job is async. |
| B6 | **No per-candidate rate limit.** Nothing stops a user from uploading 200 CVs of themselves. | Abuse / LLM cost blowout. |

### 1.3 Privacy / Compliance Risks (C)

See the companion document [GDPR_COMPLIANCE_PLAN.md](GDPR_COMPLIANCE_PLAN.md) — this is treated as its own workstream.

### 1.4 UX Risks (D)

| # | Issue |
|---|---|
| D1 | No progress granularity in bulk — HR sees a single spinner, not "12/30, currently parsing `jane_doe.pdf`". |
| D2 | No "re-parse" button; if a CV parses poorly, HR must delete + re-upload. |
| D3 | No side-by-side "raw text vs extracted fields" review modal for HR triage. |

### 1.5 Testing Gaps (E)

- No fixture-based integration test that runs the full pipeline (ZIP → extract → LLM → Zod → DB). Current 101 tests mock the LLM.
- No CV corpus (scanned, multi-column, non-Latin, tables-heavy) committed under `tests/fixtures/`.

---

## 2. Proposed Improvements

Ranked by ROI. Items are tagged **[CORE]** (must-do), **[HARD]** (recommended), **[NICE]** (polish).

### Sprint 1 — Quality & Correctness (recommended first)

| # | Recommendation | Tag | Tech |
|---|---|---|---|
| R1 | **OCR fallback for scanned PDFs.** If `unpdf` yields `< 200 chars`, run Tesseract.js on a rasterised page. Cap at first 5 pages. Mark candidate `parsingConfidence: "ocr"`. | CORE | `tesseract.js` (browser + server, WASM), `pdfjs-dist` for rasterising |
| R2 | **Replace `mergePages: true` with structured page-aware extraction.** Keep per-page arrays, send them to the LLM with explicit page markers so multi-column content is preserved. | CORE | Rework of `unpdf` consumer; no new dep |
| R3 | **Smarter Zod-failure retry ladder.** On validation failure: (1) resend with a *repair prompt* including the validator errors and the previous JSON; (2) if still failing, fall back to a stricter JSON-schema-mode call on OpenAI. | CORE | Existing Groq/OpenAI clients. Add `response_format: { type: "json_schema" }` on fallback |
| R4 | **Stop the `"Unknown Unknown"` coercion.** Let Zod fail; surface `needsReview: true` on the candidate record; HR triage queue. | CORE | Schema edit + new `needs_review` column on `candidates` |
| R5 | **Diacritic + case folding in dedup.** Add a generated column `name_key = unaccent(lower(first_name || ' ' || last_name))`; match on that. | CORE | Postgres `unaccent` extension |
| R6 | **Unique partial index on `(email)` WHERE email IS NOT NULL.** Hard race protection. | CORE | Postgres migration |
| R7 | **Storage cleanup on parse failure.** Wrap upload+parse in try/finally; delete blob if parse throws. | CORE | Supabase JS client |

### Sprint 2 — Bulk Throughput & Reliability

| # | Recommendation | Tag | Tech |
|---|---|---|---|
| R8 | **`p-limit(3)` concurrent bulk processing** with adaptive backoff on 429s. Reduces 30-CV ZIP from ~5 min to ~90 sec. | HARD | `p-limit` npm |
| R9 | **DB-backed cancellation.** Add `cancel_requested BOOLEAN` on `parsing_jobs`; loop checks it each iteration. Works across instances. | HARD | Migration + use-case edit |
| R10 | **Per-file progress.** Persist `currentFileName` + `processedCount` on `parsing_jobs`; HR dashboard polls. | HARD | Migration + UI edit |
| R11 | **Graduate bulk off `after()` onto a real queue** for jobs > 20 files. | NICE | Either Upstash QStash (serverless-friendly), Inngest, or Supabase Edge Functions + pg_cron. See §4. |
| R12 | **Fix `/api/upload/route.ts`** — either remove it (it's legacy) or make it actually async. | HARD | Delete or rewire to bulk use-case |

### Sprint 3 — HR Quality Tools

| # | Recommendation | Tag |
|---|---|---|
| R13 | **Re-parse button** per candidate (re-runs LLM against the stored raw text without re-uploading). | NICE |
| R14 | **Review modal**: raw extracted text on the left, parsed fields on the right, HR can edit + save. Fields edited by HR override AI values and are locked from re-parse. | NICE |
| R15 | **Triage queue page** for candidates with `needs_review = true`. | NICE |
| R16 | **Per-field confidence scores** returned by the LLM (not just overall). | NICE |

### Sprint 4 — Testing & Observability

| # | Recommendation | Tag |
|---|---|---|
| R17 | **Golden-corpus fixtures**: commit 10–15 CVs covering scanned, multi-column, non-Latin, tables-heavy, 1-page, 10-page cases under `tests/fixtures/cvs/`. | CORE |
| R18 | **End-to-end integration test** that runs the pipeline with a real (stubbed) LLM returning canned responses. | CORE |
| R19 | **Observability**: log token usage, latency, retry counts, OCR-hit rate per CV into `parsing_jobs`. Surface a `/dashboard/admin/parsing-metrics` page. | HARD |
| R20 | **Per-CV rate limit**: max 20 CVs/user/hour on self-upload. | HARD |

---

## 3. Technology Additions Required

| Tech | Purpose | Where | Notes |
|---|---|---|---|
| `tesseract.js` | OCR fallback | `text-extraction.service.ts` | WASM; ~11 MB cold start. Load lazily. Consider serverless function runtime size budget. |
| `pdfjs-dist` | Rasterise PDF pages to canvas for OCR | same | Heavy dep. Alternative: call a hosted OCR API (AWS Textract, Google Document AI) — lower bundle but per-page cost. See §4. |
| `p-limit` | Concurrency primitive | `upload.use-cases.ts` | Zero infra impact. |
| Postgres `unaccent` extension | Diacritic-aware dedup | Supabase migration | `CREATE EXTENSION IF NOT EXISTS unaccent;` — ensure Supabase plan supports it (all paid plans do). |
| `@t3-oss/env-nextjs` *(optional)* | Type-safe env vars | Cross-cutting | Not CV-specific but helpful for keeping LLM keys managed. |
| Queue system *(Sprint 2 R11)* | Durable bulk processing | New infra | **Options below** — recommend **Upstash QStash** or **Inngest** over self-hosted BullMQ. |

### 3.1 Queue Options for R11

| Option | Pros | Cons | Est. cost (30k CVs/month) |
|---|---|---|---|
| **Upstash QStash** | Serverless HTTP-based, pay-per-request, no infra | Retry semantics simpler than BullMQ | ~$10/mo |
| **Inngest** | Great DX, step functions, built-in UI | Vendor lock-in | Free tier up to 50k steps/mo |
| **Supabase Edge Functions + pg_cron** | Stay on existing stack | Manual retries | Included in Supabase plan |
| **BullMQ + Redis** | Industry standard | Requires a long-running worker → not Vercel-native | Upstash Redis ~$10/mo + worker host |

**Recommendation**: Upstash QStash. Smallest footprint, aligns with Vercel + Supabase.

---

## 4. LLM Cost Analysis

### 4.1 Current Token Footprint per CV

Measured from `cv-parser.service.ts` defaults (`temperature 0.1`, `max_tokens 5000`):

| Phase | Input tokens | Output tokens |
|---|---|---|
| Extraction prompt (system + CV text) | ~3,500 (typical 2-page CV) | ~1,500 (structured JSON) |
| Retry on Zod fail (worst case) | +3,500 | +1,500 |
| **Average case** | **~3,500 in / ~1,500 out** | |
| **Worst case (retry)** | **~7,000 in / ~3,000 out** | |

### 4.2 Provider Pricing (as of April 2026)

| Provider | Model | Input $/1M tok | Output $/1M tok |
|---|---|---|---|
| Groq (primary) | Llama 3.3 70B Versatile | $0.59 | $0.79 |
| OpenAI (fallback) | GPT-4o-mini | $0.15 | $0.60 |
| OpenAI (fallback for R3 strict JSON) | GPT-4o | $2.50 | $10.00 |

> **Note**: Prices are volatile; verify against [console.groq.com](https://console.groq.com) and [openai.com/api/pricing](https://openai.com/api/pricing) before any sprint kickoff.

### 4.3 Cost per CV

| Scenario | Provider | Cost |
|---|---|---|
| Average, Groq success | Groq | **$0.0033** (~⅓ of a cent) |
| Average, OpenAI fallback (gpt-4o-mini) | OpenAI | **$0.0014** |
| Worst case (Groq retry) | Groq | **$0.0067** |
| Worst case (Groq → OpenAI fallback → GPT-4o strict) | Mixed | **$0.035** |

### 4.4 Monthly Cost Projections

| Volume | Average-path cost (Groq) | Worst-path cost (all fallbacks) |
|---|---|---|
| 1,000 CVs/mo | $3.30 | $35 |
| 10,000 CVs/mo | $33 | $350 |
| 100,000 CVs/mo | $330 | $3,500 |

### 4.5 Cost Controls (Build Into Sprint 1)

1. **Cache raw-text → parsed-JSON** in a `parsed_cv_cache` table keyed by `sha256(rawText)`. Re-parsing an identical CV becomes free.
2. **Truncate CV text aggressively**: cap at 15k chars (~3.7k tokens). Anything longer is almost certainly noise (unrelated scanned pages, repeated headers).
3. **Budget guard**: track monthly spend per provider in `llm_usage_log` table; auto-disable fallback if monthly cap (e.g. $100) exceeded.
4. **Prefer Groq over OpenAI for bulk** — Groq is 4× cheaper at similar quality for this task. OpenAI only on final-fallback strict JSON.
5. **Skip re-parse on identical `sha256`** in bulk flows (HR re-uploading the same ZIP twice).
6. **OCR cost**: Tesseract.js is free but CPU-heavy. If we switch to hosted OCR (AWS Textract): $0.0015/page → add ~$0.003 per 2-page scanned CV. Keep Tesseract.js as default, make hosted OCR an opt-in config.

### 4.6 Token Budget Alerting

Add a Supabase cron job that:
- Aggregates `llm_usage_log` daily.
- Emails admin if daily spend > $5 or monthly projection > $150.
- Auto-throttles non-premium accounts on breach.

---

## 5. Suggested Execution Order

```
Sprint 1 (quality)     → R1, R2, R3, R4, R5, R6, R7, R17, R18
Sprint 2 (throughput)  → R8, R9, R10, R12, R20, R19
Sprint 3 (HR tools)    → R13, R14, R15, R16
Sprint 4 (queue R11)   → Only if bulk volume > 50 CVs/job regularly
```

Sprint 1 delivers the biggest perceived quality jump (OCR + no more "Unknown Unknown" + dedup correctness) without any new infra. Everything else builds on it.

---

## 6. Open Questions for Stakeholder

1. Do we have budget approval for an LLM monthly cap (recommend $100 dev, $500 prod)?
2. Is hosted OCR (AWS Textract / Google Document AI) acceptable, or must we stay OSS (Tesseract.js)?
3. For R11 queue, do we prefer Upstash QStash (recommended) or stay on `after()` until volume forces the issue?
4. For R15 triage queue — who reviews? HR team, or is there a designated "data quality" role?
5. Do we retain raw extracted text after parsing? (Interacts with GDPR — see companion doc.)

---

## 7. Success Metrics (post-Sprint 1)

- **Parse success rate**: from current ~92% (estimated, untested) → ≥ 98%.
- **Scanned-PDF acceptance**: 0% → ≥ 85%.
- **Duplicate candidate rate** (same person, different accent): unmeasured → < 1%.
- **HR bulk-upload cancel reliability**: ~70% → 100%.
- **Orphaned storage blobs/week**: unmeasured → 0.
