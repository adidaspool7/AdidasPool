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
- **Manages internships** with full lifecycle (Draft → Active → Inactive → Finished), Erasmus program support, and learning agreement uploads
- **Enables candidates to apply** directly to job openings and internships
- **Notifies HR in real-time** when candidates submit applications
- **Matches candidates to jobs** based on location, experience, language, and education
- **Verifies language ability** via AI-scored assessments (listening, speaking, writing)
- **Identifies borderline candidates** and routes them to micro-learning improvement tracks

---

## Architecture

**Onion Architecture** (Clean Architecture / Ports & Adapters) with strict layer separation:

```
Presentation (API Routes + Pages)
    → Application (Use Cases)
        → Domain (Ports, Services, Value Objects)
            ← Infrastructure (Prisma, Groq/OpenAI, Resend, Cheerio, unpdf/mammoth)
```

Dependencies always flow **inward**. Domain has zero external dependencies.

| Layer | Location | Purpose |
|-------|----------|---------|
| Domain | `src/server/domain/` | Business rules, ports (interfaces), scoring & matching engines |
| Application | `src/server/application/` | Use cases, DTOs (Zod 4), orchestration |
| Infrastructure | `src/server/infrastructure/` | 6 Prisma repos, LLM (Groq/OpenAI), Resend, storage, extraction, scraper |
| Presentation | `src/app/` | Next.js pages + API routes (18 route files, ~25 handlers) |
| Client | `src/client/` | React components, providers, layout, UI utilities |

See [docs/architecture.md](docs/architecture.md) for the full architecture documentation.

---

## Features Implemented

### Candidate Side
- Browse all adidas job openings (scraped live, paginated, searchable with multi-word matching)
- Browse active internships (with Erasmus badge, date range, status filtering)
- Apply to jobs and internships via hover overlay
- Upload CV (PDF/DOCX) → AI-parsed → inline edit → save to profile
- Upload motivation letter and Erasmus learning agreements
- View "My Applications" with status tracking
- Withdraw and re-apply to positions
- Edit profile (personal info, nationality, availability, work model, bio)

### HR Side
- **Dashboard** with overview stats (candidates, open positions, assessments, shortlisted)
- **Job Openings** — browse, create new jobs, trigger scraper ("Get current job offers")
- **Internships** — create/edit with lifecycle states (Draft/Active/Inactive/Finished), Erasmus support
- **Received Applications** — see all candidate applications with search
- **Notifications** — real-time feed when candidates apply (read/unread, mark all read)
- **CV Upload & Processing** — drag-and-drop with parsed preview and inline editing
- **Candidates' Analysis** — filterable candidate list with scoring (placeholder)
- **Analytics** — recruitment funnels and metrics (placeholder)

### Platform
- Role-based navigation (Candidate: 8 nav items / HR: 9 nav items)
- AI-powered CV parsing (Groq Llama 3.3 70B primary, OpenAI GPT-4o fallback)
- Server-side pagination (100 jobs per page)
- Onion Architecture with DI container (11 bindings)
- 16 Prisma models, 14 enums
- 56 unit tests across 6 test files
- Deployed on Vercel with Neon PostgreSQL

---

## Tech Stack

| Technology | Purpose |
|------------|---------|
| **Next.js 16** (App Router) | Full-stack React framework |
| **TypeScript 5** | Type safety across all layers |
| **PostgreSQL** (Neon) | Cloud-hosted relational database |
| **Prisma 6.19** | Type-safe ORM with migrations |
| **Cheerio** | Web scraping (adidas careers portal) |
| **Groq (Llama 3.3 70B)** | Primary LLM — CV extraction, free tier |
| **OpenAI GPT-4o** | Fallback LLM |
| **unpdf + mammoth** | PDF/DOCX text extraction |
| **Zod 4.3** | Schema validation (API + LLM output) |
| **shadcn/ui** | Accessible UI component library |
| **Tailwind CSS 4** | Utility-first styling |
| **Vercel** | Hosting & serverless deployment |
| **Resend** | Transactional email (magic links) |
| **Vitest 4.0** | Unit testing (56 tests) |

See [docs/Tech Stack.md](docs/Tech%20Stack.md) for detailed descriptions.

---

## Getting Started (Local Development)

### Prerequisites
- Node.js 18+
- PostgreSQL 16+ (local or cloud)

### Setup

```bash
# Clone the repository
git clone https://github.com/Frsoul7/adidas-talent-pool.git
cd adidas-talent-pool

# Install dependencies
npm install

# Set up environment variables
cp .env.example .env
# Edit .env with your DATABASE_URL and API keys

# Push database schema
npx prisma db push

# Start development server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) to see the app.

### Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `DATABASE_URL` | Yes | PostgreSQL connection string |
| `GROQ_API_KEY` | For AI features | Groq API key (primary LLM — free tier) |
| `OPENAI_API_KEY` | Optional fallback | OpenAI API key (used when Groq unavailable) |
| `RESEND_API_KEY` | For emails | Resend API key |
| `BLOB_READ_WRITE_TOKEN` | For prod storage | Vercel Blob token (dev uses local filesystem) |

---

## Deployment

Deployed on **Vercel** with **Neon PostgreSQL** (serverless):

```bash
# Deploy to production
vercel --prod
```

The build script automatically runs `prisma generate` before `next build`.

---

## Project Documentation

| Document | Description |
|----------|-------------|
| [docs/architecture.md](docs/architecture.md) | System architecture, layer breakdown, data flows |
| [docs/Tech Stack.md](docs/Tech%20Stack.md) | All tools and technologies with descriptions |
| [docs/CV_PARSER_PLAN.md](docs/CV_PARSER_PLAN.md) | CV parsing pipeline design and implementation status |
| [docs/talent_intelligence_...spec.md](docs/talent_intelligence_language_verification_platform_spec.md) | Original project specification (with implementation addendum) |
| [claude-docs/CLAUDE_PROJECT_TRACKER.md](claude-docs/CLAUDE_PROJECT_TRACKER.md) | Development progress tracker (Sessions 1–15) |

---

## License

Academic project — not licensed for commercial use.
