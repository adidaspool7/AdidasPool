# Talent Intelligence & Communication Verification Platform

> **Academic Project** — Multinational recruitment screening platform built for an adidas-like context.

**Live Demo:** [githubrepo-mocha.vercel.app](https://githubrepo-mocha.vercel.app)  
**Repository:** [github.com/Frsoul7/adidas-talent-pool](https://github.com/Frsoul7/adidas-talent-pool)

---

## What It Does

A standalone web application for early-stage recruitment screening that:

- **Scrapes live job postings** from the adidas careers portal (all pages, all countries)
- **Parses CVs with AI** — two-stage pipeline: text extraction (PDF/DOCX) → Groq/OpenAI LLM → structured data with inline editing
- **Builds a searchable talent pool** with structured candidate data and CV scoring
- **Manages internships** with full lifecycle (Draft → Active → Inactive → Finished), Erasmus support, and learning agreement uploads
- **Enables candidates to apply** directly to job openings and internships
- **Notifies HR in real-time** when candidates submit applications
- **Matches candidates to jobs** based on location, experience, language, and education
- **Verifies language ability** through two assessment modes:
  - **Written** — async, LLM-graded with CEFR estimation
  - **AI Interview** — real-time voice interview powered by a FastAPI sidecar (Whisper STT + GPT-4o-mini) with evidence-array guardrails
- **Verifies individual skills** through LLM-graded role-play Q&A (`skill_verifications`)
- **Surfaces recruitment analytics** — pipeline funnel, top skills/languages, score distribution, country breakdown (Recharts)
- **Identifies borderline candidates** for micro-learning improvement tracks

---

## Architecture

**Onion Architecture** (Clean Architecture / Ports & Adapters) with strict layer separation:

```
Presentation (API Routes + Pages + middleware.ts auth gate)
    → Application (Use Cases)
        → Domain (Ports, Services, Value Objects)
            ← Infrastructure (Supabase repos, Groq/OpenAI, Resend, Cheerio, unpdf/mammoth, Supabase Storage)

Sidecar: FastAPI (Python) — AI Interviewer (Whisper + GPT-4o-mini)
```

Dependencies always flow **inward**. Domain has zero external dependencies.

| Layer | Location | Purpose |
|-------|----------|---------|
| Domain | `src/server/domain/` | Business rules, ports (interfaces), scoring & matching engines |
| Application | `src/server/application/` | Use cases, DTOs (Zod 4), orchestration |
| Infrastructure | `src/server/infrastructure/` | 10 Supabase repos, LLM (Groq/OpenAI), Resend, Supabase/Local storage, unpdf/mammoth, Cheerio scraper |
| Presentation | `src/app/` + `middleware.ts` | Next.js pages + ~30 API route files; middleware handles Supabase session refresh and RBAC |
| Client | `src/client/` | React components, providers, layout, UI utilities |
| Sidecar | `ai_interviewer_backend/` | FastAPI app for real-time AI interviews |

See [AppReport/04_Architecture_Design.md](AppReport/04_Architecture_Design.md) for the full architecture documentation.

---

## Features Implemented

### Candidate Side
- **Sign in with Google** (Supabase Auth — only IdP)
- Browse all adidas job openings (scraped live, paginated, multi-word search)
- Browse active internships (Erasmus badge, date range, status filtering)
- Apply to jobs and internships via hover overlay
- Upload CV (PDF/DOCX/TXT) → AI-parsed → inline edit → save to profile
- Upload motivation letter and Erasmus learning agreements
- View "My Applications" with status tracking; withdraw and re-apply
- Take **written** assessments and **real-time AI interviews** via magic link
- Complete **per-skill verifications** (role-play Q&A, LLM-graded)
- Edit profile (personal info, nationality, availability, work model, bio)

### HR Side
- **Sign in with Google**; role (`hr`) is server-assigned in `app_metadata.role`
- **Dashboard** with overview stats (candidates, open positions, assessments, shortlisted)
- **Job Openings** — browse, create, edit, trigger scraper ("Get current job offers")
- **Internships** — create/edit with lifecycle states (Draft/Active/Inactive/Finished), Erasmus support
- **Received Applications** — all candidate applications with search
- **Notifications** — real-time feed + promotional campaigns (TipTap rich text, targeting by country/field/education)
- **CV Upload & Processing** — single drag-and-drop or bulk (async via Next.js `after()` + `parsing_jobs` progress polling, ZIP supported)
- **Candidates Evaluation** — filterable candidate list, configurable scoring weights, presets, rescore, rerank
- **Candidate Detail Page** — full CV, applications, assessment results (with evidence trails), skill verifications, score breakdown, collaborative notes (TipTap)
- **Assessments** — create Written or Interview assessments; magic link delivery via Resend
- **Skill Verification** — launch per-skill role-play graded by LLM
- **Analytics** — pipeline funnel, top skills/languages, applications per job, trend, score distribution, country breakdown (Recharts)
- **CSV Export** — filter-aware candidate list export

### AI Interview — Voice Input & Output (Web Speech API)

The AI interview supports browser-native speech recognition (STT) and text-to-speech (TTS) via the [Web Speech API](https://developer.mozilla.org/en-US/docs/Web/API/Web_Speech_API), fronting the FastAPI backend that uses Whisper + GPT-4o-mini under the hood.

- **Browser requirement:** Chrome or Edge (desktop). Other browsers fall back to typed input.
- **Push-to-talk:** Press 🎤 **Voice** to start recording, press ⏹ **Stop & Send** to stop and auto-submit.
- **TTS:** Assistant responses are spoken aloud automatically. Toggle with the 🔊/🔇 button.
- **Chat parity:** Both user speech transcripts and assistant responses appear in the chat log.
- **Fallback:** If speech recognition is unavailable, a guidance message appears in chat prompting typed input.
- **Guardrails (server-side):** `evaluator.py` enforces minimum turn count, non-empty `evidence` arrays, `max_tokens=500`, and auto-promotes FAIL verdicts with empty evidence to PASS (anti-hallucination).

### Security & Platform
- **Authentication:** Supabase Auth + Google OAuth (only IdP); role stored in `app_metadata.role`
- **Authorization:** `middleware.ts` gates `/api/*` with `PUBLIC_API_PREFIXES` + `HR_ONLY_API_PREFIXES` — 401/403 enforced at the edge
- **Row-Level Security:** Supabase RLS policies on candidate-owned tables keyed on `auth.uid()`
- **Data layer:** 23 tables, 4 SQL migrations under `supabase/migrations/`
- **Dual-mode storage:** `SupabaseStorageService` (prod) / `LocalStorageService` (dev)
- **Async processing:** Next.js `after()` (no Redis/BullMQ)
- **Testing:** **101 unit tests** across 6 files (Vitest)
- **Deployed on:** Vercel (Next.js) + Supabase (DB/Auth/Storage) + separate host for the FastAPI sidecar

---

## Tech Stack

| Technology | Purpose |
|------------|---------|
| **Next.js 16.1** (App Router) | Full-stack React framework |
| **React 19.2** + **TypeScript 5** | UI + type safety across all layers |
| **Supabase** (PostgreSQL + Auth + Storage) | Managed backend platform |
| **@supabase/supabase-js** + **@supabase/ssr** | Server-side + cookie-aware data access (no ORM) |
| **FastAPI** (Python) + **Whisper** + **GPT-4o-mini** | Real-time AI Interviewer sidecar |
| **Cheerio** | Web scraping (adidas careers portal) |
| **Groq** (Llama 3.3 70B) | Primary LLM — CV extraction, free tier |
| **OpenAI GPT-4o / GPT-4o-mini** | Fallback LLM + interview scoring |
| **unpdf + mammoth** | PDF / DOCX text extraction |
| **Zod 4.3** | Schema validation (API + LLM output) |
| **shadcn/ui** + **Tailwind CSS 4** + **TipTap** | Accessible UI, utility styling, rich text |
| **Recharts 3.7** | Analytics visualisations |
| **Resend** | Transactional email (magic links, with copy-link fallback) |
| **Vercel** | Hosting & serverless deployment |
| **Vitest 4.0** | Unit testing (101 tests across 6 files) |

See [AppReport/03_Technology_Stack.md](AppReport/03_Technology_Stack.md) for the full technology write-up.

---

## Getting Started (Local Development)

### Prerequisites

- Node.js 18+
- A Supabase project (free tier is fine) — provides Postgres, Auth, and Storage
- Python 3.11+ (only if you want to run the AI Interviewer sidecar locally)

### Setup

```bash
# Clone the repository
git clone https://github.com/Frsoul7/adidas-talent-pool.git
cd adidas-talent-pool

# Install dependencies
npm install

# Set up environment variables (see table below)
cp .env.example .env
# Edit .env

# Apply Supabase migrations (requires the Supabase CLI, or run the SQL files manually
# through the Supabase SQL editor)
supabase db push   # or: apply files in supabase/migrations/ in order

# Start development server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) to see the app.

### Running the AI Interviewer Sidecar (optional)

```bash
cd ai_interviewer_backend
pip install -r requirements.txt
uvicorn main:app --reload --port 8000
# Then set INTERVIEW_BACKEND_URL=http://localhost:8000 in .env
```

### Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `NEXT_PUBLIC_SUPABASE_URL` | Yes | Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Yes | Supabase anon public key (RLS-gated) |
| `SUPABASE_SERVICE_ROLE_KEY` | Yes (prod) | Service-role key — server-only; bypasses RLS, writes `app_metadata.role` |
| `GROQ_API_KEY` | Yes | Primary LLM provider (Groq) |
| `OPENAI_API_KEY` | Yes for interview mode | Fallback LLM + interview scoring (GPT-4o / GPT-4o-mini) |
| `RESEND_API_KEY` | No | Transactional email (fails silently if absent) |
| `INTERVIEW_BACKEND_URL` | Yes for interview mode | URL of the FastAPI AI Interviewer backend |
| `NEXT_PUBLIC_APP_URL` | No | Public app URL for OAuth callback + magic links (defaults to `http://localhost:3000`) |

> Secrets for production live in the Vercel dashboard (Next.js) and the Supabase dashboard (RLS/auth). No `.env` files are committed.

---

## Deployment

Deployed on **Vercel** (Next.js) + **Supabase** (DB / Auth / Storage):

```bash
# Deploy to production
vercel --prod
```

The FastAPI sidecar (`ai_interviewer_backend/`) is deployed separately (e.g. Render, Fly, Railway) and its URL is wired in via `INTERVIEW_BACKEND_URL`.

---

## Testing

```bash
npm test
```

101 unit tests across 6 files:

- `cv-validation.test.ts` (15) — Zod schemas + LLM output guards
- `scoring.test.ts` (9) — CV scoring engine
- `matching.test.ts` (4) — Job-candidate matching
- `text-extraction.test.ts` (8) — unpdf + mammoth
- `upload-use-cases.test.ts` (16) — Full CV pipeline
- `interview-runtime.test.ts` (49) — Interview session, turn persistence, evidence guardrails, completion

---

## Project Documentation

| Document | Description |
|----------|-------------|
| [AppReport/01_Project_Overview.md](AppReport/01_Project_Overview.md) | High-level project overview |
| [AppReport/02_Requirements_Analysis.md](AppReport/02_Requirements_Analysis.md) | Functional + non-functional requirements |
| [AppReport/03_Technology_Stack.md](AppReport/03_Technology_Stack.md) | Tech stack write-up |
| [AppReport/04_Architecture_Design.md](AppReport/04_Architecture_Design.md) | Onion architecture, DI bindings, data flow |
| [AppReport/05_Database_Design.md](AppReport/05_Database_Design.md) | 23-table schema, migrations, RLS |
| [AppReport/06_Features_Implementation.md](AppReport/06_Features_Implementation.md) | Feature-by-feature implementation detail |
| [AppReport/07_API_Documentation.md](AppReport/07_API_Documentation.md) | API endpoints + middleware RBAC |
| [AppReport/08_Testing_Strategy.md](AppReport/08_Testing_Strategy.md) | Test inventory + coverage |
| [AppReport/09_Security_Infrastructure.md](AppReport/09_Security_Infrastructure.md) | Auth, RLS, env vars, security posture |
| [AppReport/10_UI_UX_Design.md](AppReport/10_UI_UX_Design.md) | UI/UX design system |
| [docs/USER_GUIDE.md](docs/USER_GUIDE.md) | End-user guide (candidate + HR) |
| [docs/talent_intelligence_...spec.md](docs/talent_intelligence_language_verification_platform_spec.md) | Original project specification |
| [claude-docs/CLAUDE_PROJECT_TRACKER.md](claude-docs/CLAUDE_PROJECT_TRACKER.md) | Development progress tracker (Sessions 1–21) |

---

## License

Academic project — not licensed for commercial use.
