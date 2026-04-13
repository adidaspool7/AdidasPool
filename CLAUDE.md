# CLAUDE.md — Project Memory

> **Auto-loaded by Claude Code, Cowork, and any Claude-based agent entering this repo.**
> **KEEP THIS FILE UP TO DATE.** After every session that changes architecture, completes a phase, or introduces a decision, update the relevant section below. Do not add raw session logs — synthesize only.

---

## Project Identity

| Field | Value |
|---|---|
| **Name** | Talent Intelligence & Language Verification Platform |
| **Context** | Academic project — multinational recruitment screening tool (adidas-like) |
| **Owner** | Stratos (ECE + MSc Telecommunications) |
| **Production URL** | `https://adidas-pool.vercel.app/` |
| **Hosting** | Vercel |
| **Repo root** | `adidas-talent-pool/` |

---

## Current Tech Stack (as of 2026-04-13)

| Layer | Technology |
|---|---|
| Framework | Next.js 16.1.6 — App Router, TypeScript |
| UI | shadcn/ui + Tailwind CSS 4 |
| Auth | Supabase Auth — Google OAuth only |
| Database | Supabase PostgreSQL (migrated from Neon/Prisma) |
| ORM | **None** — raw Supabase JS client with manual `camelizeKeys`/`snakeifyKeys` |
| Storage | Supabase Storage — bucket: `talent-pool` |
| Supabase client libs | `@supabase/ssr ^0.5.2`, `@supabase/supabase-js ^2.49.4` |
| LLM (primary) | Groq — Llama 3.3 70B via OpenAI SDK (`GROQ_API_KEY`) |
| LLM (fallback) | OpenAI GPT-4o (`OPENAI_API_KEY`) |
| AI Interview backend | FastAPI (Python) at `INTERVIEW_BACKEND_URL` |
| TTS / STT | Browser APIs — `window.speechSynthesis` (TTS) + `window.SpeechRecognition` (STT). Chrome/Edge only. Configured via Vercel env vars. |
| Validation | Zod 4.3.6 |
| Email | Resend 6.9.2 + copy-link fallback |
| CSV export | papaparse |
| Charts | Recharts 3.7 |
| Testing | Vitest 4.0.18 (unit) |

---

## Architecture — Onion / Clean

```
Presentation  →  Application  →  Domain  ←  Infrastructure
(API routes)     (use cases)     (ports)     (implements ports)
```

- **Domain** (`src/server/domain/`): zero external deps. Ports/interfaces only.
- **Application** (`src/server/application/`): use cases, DTOs (Zod). No DB imports.
- **Infrastructure** (`src/server/infrastructure/`): Supabase repos, AI services, storage. Only layer that knows about external services.
- **Presentation** (`src/app/`, `src/client/`): API routes + React components. Thin — delegates to use cases.

**Dependency rule is enforced.** If you find a use case importing from infrastructure, that is a violation.

---

## Database

### Connection
- **Admin client** (server-side, bypasses RLS): `src/server/infrastructure/database/supabase-client.ts`
- **User client** (SSR, session-aware): `src/lib/supabase/server.ts`
- **Browser client**: `src/lib/supabase/client.ts`
- **RLS**: Disabled on all tables. All DB access is server-side via service role key.

### Key Conventions
- DB columns: `snake_case`. JS objects: `camelCase`.
- Conversion utilities: `camelizeKeys()` / `snakeifyKeys()` in `src/server/infrastructure/database/db-utils.ts`
- JSONB fields are **excluded from recursive camelization**: `parsedData`, `evaluationRationale`, `errorLog`, `result`, `breakdown`, `rawAiResponse`, `details`, `parsingConfidence`
- IDs: `TEXT PRIMARY KEY`, generated with `crypto.randomUUID()` via `generateId()`
- `updated_at`: handled by PostgreSQL trigger `set_updated_at()` — no app-level timestamp management
- Migration file: `supabase/migrations/20260413000000_initial_schema.sql` — run once in Supabase SQL Editor

### Key Tables
`candidates`, `experiences`, `education`, `candidate_languages`, `skills`, `candidate_tags`, `candidate_notes`, `jobs`, `job_applications`, `job_matches`, `assessment_templates`, `assessments`, `assessment_results`, `interview_sessions`, `interview_transcript_turns`, `interview_proctoring_events`, `improvement_tracks`, `improvement_progress`, `notifications`, `notification_preferences`, `promo_campaigns`, `parsing_jobs`, `scoring_weights`, `scoring_presets`, `sync_jobs`

---

## Auth

- **Provider**: Supabase Google OAuth only
- **Role**: stored in `user_metadata.role` — either `"candidate"` or `"hr"`. Set at first login via `/auth/select-role`.
- **Middleware** (`middleware.ts`): refreshes session, protects `/dashboard/*`, redirects new users to `/auth/select-role`
- **Candidate ↔ User link**: `candidates.user_id UUID REFERENCES auth.users(id)`. `ProfileUseCases.resolveCurrentCandidate()` looks up by `user_id`, auto-creates PLATFORM candidate if none exists.
- **Role context** (`src/client/components/providers/role-provider.tsx`): reads from `supabase.auth.getUser()`, exposes `userEmail`, `userName`. `clearRole()` calls `supabase.auth.signOut()`.

---

## AI Interviewer

### Architecture
- **Frontend**: popup window (`/interview/[sessionId]`) with camera + audio + chat
- **Backend**: FastAPI at `INTERVIEW_BACKEND_URL`
  - `POST /interview/start` — initializes session, returns first AI question
  - `POST /interview/turn` — submits candidate answer, returns next question
  - `POST /interview/evaluate` — finalizes session, returns `AssessmentResult`
- **Token**: HMAC-SHA256 custom JWT, 10-min TTL, stored hash in `interview_sessions.token_hash`
- **API routes** (Next.js, all under `/api/interview/`):
  - `session/` — create session, generate token
  - `realtime/` — update session status
  - `realtime/turn/` — record transcript turns
  - `realtime/terminate/` — terminate session
  - `proctoring/` — log proctoring events
  - `results/` — save evaluation result

### Known Bugs (to fix in Phase 2)
1. **Timer resets on clarification** — per-question timer should not reset when the candidate asks a clarifying question. Fix: track `turnType` and only reset timer on `type = "question"` turns.
2. **TTS not working** — Python backend returns no audio. Fix: switch to `window.speechSynthesis` browser API on client side.
3. **STT accuracy unknown** — `window.SpeechRecognition` not yet validated in production.
4. **No close button until results** — after interview ends, user must wait for evaluation before popup can be closed. Fix: show close button after `terminate` call, poll for results separately.
5. **Voice answer transcript not shown** — spoken answers should appear in chat as text. Fix: display STT transcript in chat bubble immediately.

### Planned Modes (Phase 4)
- **Language Assessment mode**: CEFR-rubric scoring, single-language focus, free-form conversation
- **Technical Assessment mode**: current behavior (skill validation Q&A)
- Pre-interview dropdown to select mode

---

## Improvement Tracks

- Auto-created when `finalDecision = "FAIL"` on an assessment result (Phase 5)
- Table: `improvement_tracks` with `improvement_progress`
- Dashboard page: `/dashboard/improvement` — not yet built
- Link from interview results to improvement track

---

## Environment Variables (Vercel)

```
NEXT_PUBLIC_SUPABASE_URL
NEXT_PUBLIC_SUPABASE_ANON_KEY
SUPABASE_SERVICE_ROLE_KEY
INTERVIEW_BACKEND_URL
GROQ_API_KEY
OPENAI_API_KEY            # fallback only
RESEND_API_KEY
NEXT_PUBLIC_APP_URL       # https://adidas-pool.vercel.app
```

---

## Completed Migration Status

| Step | Description | Status |
|---|---|---|
| 1 | Supabase project created, Auth URLs configured | ✅ Done |
| 2 | Supabase Auth files (login, callback, select-role, middleware, role-provider) | ✅ Done |
| 3 | SQL schema migrated (27 ENUMs, 25 tables) | ✅ Done |
| 4 | All 10 Prisma repositories rewritten as Supabase repositories | ✅ Done |
| 5 | SupabaseStorageService replacing VercelBlobStorageService | ✅ Done |
| 6 | Prisma removed from package.json, build script, and all imports | ✅ Done |
| 7 | OAuth wired into dashboard — `user_id` → candidate lookup + auto-create | ✅ Done |

---

## How to Update This File

After any session that:
- Completes a phase or step → update the relevant status table
- Introduces a new architectural decision → add to the relevant section
- Fixes a known bug → remove from "Known Bugs", add to a "Fixed" note
- Adds new env vars → update the env vars section
- Changes the tech stack → update the stack table

**Do NOT** append raw session transcripts. Synthesize only the delta.
