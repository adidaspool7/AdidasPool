# Analytics AI Chat — Implementation Plan

> **Status**: Planning complete, not yet started.
> **Priority**: After catalog expansion (see Phase 1 below).

---

## Context

The custom widget builder is fully live:
- `src/server/domain/services/analytics-catalog.ts` — constrained Zod-validated catalog
- `src/client/components/analytics/widget-builder-dialog.tsx` — dropdown form UI
- `src/client/components/analytics/my-charts-section.tsx` — save/edit/delete widgets
- `src/server/infrastructure/database/widget-query.service.ts` — safe hand-written queries
- `/api/analytics/query` — already used by the form builder

What is missing: a **natural language → `WidgetSpec` translator** (one LLM call + chat UI).

---

## Why this is LOW–MEDIUM difficulty

The LLM's output space is tiny (~100 valid combinations). It doesn't write SQL or touch the DB — it only fills this object, validated server-side by `WidgetSpecSchema.strict()` before any query runs:

```ts
{ metric, dimension, chartType, limit?, lookbackDays?, filters? }
```

Any hallucinated field is auto-rejected by Zod. The catalog IS the guardrail.

---

## Genuine challenges

1. **Multi-turn refinement** — "show me the same but only for Germany" requires passing the previous spec as context to the LLM.
2. **Ambiguity** — "show me hires" could mean `candidates { status: HIRED }` or `applications { status: HIRED }`. LLM needs disambiguation instructions or a follow-up question.
3. **Filter value awareness** — LLM must know valid enum values (`ACTIVE`, `PENDING`, etc.) or it will invent them. Must be included in the system prompt.
4. **Validation failure loop** — if LLM returns `chartType: "line"` for `candidates by country` (invalid), server 400s. Need a self-correction retry loop: feed the Zod error back as a follow-up message (max 2 retries).

---

## Three implementation options

### Option A — "Describe it, fill the form" (MVP, recommended first)

A single text input at the top of the existing `widget-builder-dialog.tsx`:
> *"Describe the chart you want..."* → **Generate** button → dropdowns auto-fill.

HR still reviews the form before saving. No new page, no conversation history.

- New API route: `POST /api/analytics/suggest-spec` (~40 lines)
- Small addition to `widget-builder-dialog.tsx` (text field + Generate button)
- Reuses 100% of existing infrastructure
- **Estimate: ~half a day**

### Option B — "Chat with inline preview" (full feature)

A new **"Ask AI"** tab on `/dashboard/analytics` (alongside Overview and My Charts).
- Left panel: chat thread
- Right panel: live chart preview of the current spec
- "Save this chart" button adds to My Charts
- Conversation state in React (session-only, not persisted)

New pieces:
- `POST /api/analytics/chat` — takes `{ messages[], currentSpec? }`, returns `{ spec, suggestedTitle, data[], reply }`
- `AnalyticsChatPanel` component (~300 lines)
- Self-correction retry loop (Zod error → LLM feedback, max 2 attempts)
- **Estimate: ~1–1.5 days**

### Option C — Floating chat bubble

Same logic as Option B, different UI container: a chat icon (bottom-right corner) opens a side sheet. Less invasive than a full tab.

### Recommended rollout

1. Expand the catalog first (Phase 1 below) — pays off both the form builder and the chat
2. Build Option A — test prompt reliability with no conversation complexity
3. Build Option B — once the prompt is proven reliable

---

## LLM System Prompt Design

The system prompt is **generated server-side from the catalog** — when a new metric or dimension is added to `analytics-catalog.ts`, the LLM automatically knows about it.

Structure (~800 tokens total including enum values):

```
You are an analytics assistant for an HR recruitment platform.
Output ONLY a JSON object.

METRICS:
- candidates: people in the talent pool
- applications: job applications submitted
- jobs: job postings
- assessments: AI assessments issued or completed

VALID combinations (metric → dimension → allowed chart types):
candidates:
  status → bar, hbar, pie
  country → bar, hbar, pie
  source → bar, hbar, pie
  score_bucket → bar, hbar, pie
  none (total only) → stat
applications:
  status → bar, hbar, pie
  job → bar, hbar, pie
  day/week/month → line, area
  none → stat
[etc. — generated from CATALOG_METRICS at request time]

VALID filter values:
candidate status: ACTIVE | PENDING | REVIEW | SHORTLISTED | HIRED | REJECTED
application status: PENDING | REVIEWING | SHORTLISTED | REJECTED | HIRED | WITHDRAWN
[etc.]

OUTPUT JSON ONLY:
{ "metric": "...", "dimension": "...", "chartType": "...",
  "limit": 1-50, "lookbackDays": 1-365,
  "filters": { key: value }, "suggestedTitle": "..." }
```

**LLM**: Groq Llama 3.3 70B via existing `GROQ_API_KEY`, JSON mode (`response_format: { type: "json_object" }`). Fallback: OpenAI GPT-4o.
**Cost**: ~800 tokens/request on Groq — negligible.

---

## Phase 1 — Catalog Expansion (do this first)

Expanding the catalog makes both the existing form builder AND the upcoming chat more powerful. Every new entry in `analytics-catalog.ts` requires a matching runner in `widget-query.service.ts`.

### New metrics

| Metric | What it counts | Key dimensions to add |
|---|---|---|
| `interviews` | AI interview sessions | `mode` (TECHNICAL/LANGUAGE), `result` (PASSED/FAILED), `day`/`week`/`month` |
| `shortlists` | Candidates added to job shortlists | `job`, `day`/`month` |
| `improvement_tracks` | Failed-assessment recovery tracks (when Phase 5 is built) | `status`, `day`/`month` |

### New dimensions for existing metrics

| Metric | New dimension | Notes |
|---|---|---|
| `applications` | `job_type` | INTERNSHIP vs. regular — highly relevant for this platform |
| `candidates` | `language` | Group talent pool by primary/verified language |
| `candidates` | `score_quartile` | Finer than current 20-point buckets (Q1/Q2/Q3/Q4) |
| `candidates` | `verification_status` | How many have AI-verified skills |

### New chart types

| Type | Description | Complexity |
|---|---|---|
| `funnel` | Recruitment pipeline stages (Applied → Reviewed → Shortlisted → Assessed → Hired). `FunnelChart` already imported in `analytics/page.tsx`. | Medium — needs a new query type returning stages, not groupings |
| `table` | Raw tabular output for power users | Low — render `{ label, value }[]` as a `<table>` |
| `number_vs_target` | Gauge: actual vs. HR-configured target | Low for display; needs a way to store the target |

### Advanced spec capabilities (later, more work)

- `compareMode: 'prior_period'` — dual-series chart comparing current period vs. previous (e.g., applications this month vs. last month). High HR value, significant query work.
- `multiDimension` — two grouping axes (e.g., applications by job AND by month = heat map). Complex.

---

## Risk Table

| Risk | Likelihood | Mitigation |
|---|---|---|
| LLM picks invalid dimension+chartType combo | Low | `WidgetSpecSchema.strict()` rejects server-side; retry loop with Zod error as feedback |
| LLM invents filter values not in DB | Medium | Enumerate all valid enum values in the system prompt |
| LLM confuses "applications" vs "candidates" | Medium | Prompt examples + clarification follow-up in chat mode |
| HR asks for something the catalog can't represent | Certain (sometimes) | Chat replies "I can show X, Y, or Z — which would you like?" |
| Token cost | Negligible | ~800 tokens/request on Groq (essentially free) |

---

## Files to create / modify

### Option A (MVP)

| File | Change |
|---|---|
| `src/app/api/analytics/suggest-spec/route.ts` | **Create** — POST handler, calls Groq, validates with `WidgetSpecSchema`, returns spec + suggestedTitle |
| `src/client/components/analytics/widget-builder-dialog.tsx` | **Edit** — add "Describe your chart" text field + Generate button at top |

### Option B (full chat)

| File | Change |
|---|---|
| `src/app/api/analytics/chat/route.ts` | **Create** — POST handler with multi-turn context, self-correction loop |
| `src/client/components/analytics/analytics-chat-panel.tsx` | **Create** — chat thread + live chart preview |
| `src/app/dashboard/analytics/page.tsx` | **Edit** — add "Ask AI" tab alongside existing sections |

### Catalog expansion

| File | Change |
|---|---|
| `src/server/domain/services/analytics-catalog.ts` | **Edit** — add new metrics/dimensions/chartTypes |
| `src/server/infrastructure/database/widget-query.service.ts` | **Edit** — add matching query runners |
| `tests/analytics-catalog.test.ts` | **Edit** — add test cases for new combinations |
