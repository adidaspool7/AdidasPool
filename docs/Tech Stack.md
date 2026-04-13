# Tech Stack

> Complete list of tools, technologies, and libraries used in the Talent Intelligence Platform.  
> **Last updated:** 2026-03-10 — reflects all implemented features through internship enhancements.

---

## Core Framework

### Next.js 16 (App Router)
Full-stack React framework by Vercel. Provides server-side rendering, static generation, API routes, file-based routing, and middleware — all in one package. We use the **App Router** (introduced in Next.js 13) which supports React Server Components, nested layouts, and streaming. It serves as both our frontend framework and backend API layer, eliminating the need for a separate server.

### React 19
The UI library that powers the frontend. React 19 introduces improved server components, actions, and concurrent features. All dashboard pages, candidate portals, and interactive components are built with React.

### TypeScript 5
Strongly-typed superset of JavaScript used across the entire codebase (frontend + backend). Catches bugs at compile time, provides autocomplete/IntelliSense, and enforces contracts between layers (especially important for our Onion Architecture's port interfaces).

---

## Database & ORM

### PostgreSQL
Open-source relational database used for all persistent data. In **local development**, we run PostgreSQL 17.2 directly on the machine. In **production**, we use Neon Serverless PostgreSQL (via Vercel's integration). Stores 16+ tables: candidates, jobs, job applications, internships, notifications, assessments, improvement tracks, and more.

### Neon Serverless PostgreSQL
Cloud-hosted PostgreSQL database that integrates natively with Vercel. Provides serverless auto-scaling, branching, and connection pooling. Our production database (`neon-citron-school`) runs on Neon's free tier. Connection URLs are automatically injected as environment variables in Vercel deployments.

### Prisma 6
Next-generation Node.js ORM. Provides a declarative schema language (`schema.prisma`), type-safe database queries (generated client), and schema push/migration tooling. Our schema defines **16 models** and **14 enums** (including `JobType`, `InternshipStatus`, `WorkModel`, `CEFRLevel`). Every database query in the application goes through Prisma's generated client, ensuring full type safety from database to API response.

---

## Web Scraping

### Cheerio 1.0
Fast, lightweight HTML parser for Node.js — often described as "jQuery for the server." We use it in the `AdidasJobScraperService` to scrape job postings from the adidas careers portal (`jobs.adidas-group.com`). It parses HTML table rows to extract job titles, locations, departments, and posting dates across all paginated pages. Chosen over Puppeteer/Playwright because the target site doesn't require JavaScript rendering.

---

## AI & Language Processing

### Groq — Llama 3.3 70B (Primary LLM)
The **primary AI provider** for structured CV extraction. Accessed via the OpenAI Node.js SDK with a custom `baseURL` pointing to `https://api.groq.com/openai/v1`. Uses the `llama-3.3-70b-versatile` model with JSON mode for structured data extraction. Groq is preferred because it offers a **free tier** with fast inference speeds. The client auto-detects which provider is available: if `GROQ_API_KEY` is set, Groq is used; otherwise, falls back to OpenAI.

### OpenAI GPT-4o (Fallback LLM)
Fallback large language model used when Groq is unavailable. Used for structured CV extraction (JSON mode), experience relevance classification, assessment scoring, and feedback generation. Called via the same OpenAI Node.js SDK. The client is lazy-loaded to avoid build-time crashes when API keys aren't configured.

### OpenAI Whisper API (Planned)
Speech-to-text model for language assessments. Candidates will record audio responses which are transcribed by Whisper, then evaluated against scoring rubrics. Supports multilingual transcription — critical for assessing language ability in German, English, Portuguese, etc. **Not yet integrated** — the assessment module is partially built.

### Zod 4
TypeScript-first schema validation library (version **4.3.6**). Used for two purposes: (1) validating all API request bodies (DTOs) to reject malformed input — including `.strict()` mode on update schemas to prevent extra fields, and (2) enforcing structured output from the LLM — every AI response must conform to a Zod schema before being accepted.

---

## CV Processing & Text Extraction

### unpdf 1.4
PDF text extraction library for Node.js. Extracts raw text content from PDF files uploaded as CVs. Replaced the originally planned `pdf-parse` during implementation because `unpdf` provides better compatibility with modern PDF formats and works well in serverless environments. Used by `TextExtractionService` in Stage 1 of the CV parsing pipeline.

### mammoth 1.11
Extracts raw text from `.docx` files. Handles formatting, tables, lists, and custom styling reliably. Used by `TextExtractionService` as the DOCX handler in the CV parsing pipeline. Lightweight with zero native dependencies — ideal for Vercel serverless deployment.

---

## UI & Styling

### shadcn/ui
A collection of accessible, customizable React components built on Radix UI primitives. NOT a component library (no npm package) — components are copied directly into the codebase (`src/client/components/ui/`) and fully owned. We use 20+ components: Button, Card, Badge, Input, Dialog, Table, Tabs, Select, Sheet, Tooltip, Progress, Popover, Command, and more.

### Tailwind CSS 4
Utility-first CSS framework. Instead of writing custom CSS, styles are applied directly in JSX via utility classes (`flex`, `gap-4`, `text-sm`, `bg-primary`, etc.). Tailwind 4 brings CSS-first configuration, automatic content detection, and even faster builds. Combined with `cn()` (clsx + tailwind-merge) for conditional class composition.

### Lucide React
Icon library providing 1,500+ SVG icons as React components. Used throughout the dashboard for navigation icons, status indicators, action buttons, and empty states. Icons include: `Briefcase`, `Bell`, `Inbox`, `MapPin`, `ExternalLink`, `Loader2`, `GraduationCap`, `BookOpen`, etc.

### Radix UI
Unstyled, accessible UI primitives that power shadcn/ui components. Handles complex interaction patterns (dropdowns, dialogs, popovers, command palettes) with full keyboard navigation, screen reader support, and WAI-ARIA compliance — zero styling opinions.

---

## Email & Communication

### Resend
Modern transactional email API (version **6.9.2**). Used for sending magic link emails to candidates for assessment access. Provides a simple API, React email templates, and reliable delivery. Lazy-loaded to allow the app to run without email configuration during development. Free tier: 100 emails/day.

---

## Data Processing

### papaparse
Fast CSV parser/generator for JavaScript. Used in the `ExportUseCases` to generate downloadable CSV files of candidate lists with filters, scores, and assessment results. Handles large datasets efficiently with streaming support.

---

## File Storage

### LocalStorageService (Development Default)
Custom file storage implementation that writes uploaded files to `public/uploads/` on the local filesystem. Used as the **default** storage backend when the `BLOB_READ_WRITE_TOKEN` environment variable is not set. Supports CV uploads, motivation letter uploads, and Erasmus learning agreement uploads. Returns URLs relative to the public directory so files are served by Next.js.

### Vercel Blob (Production)
S3-compatible file storage integrated with Vercel. Used when `BLOB_READ_WRITE_TOKEN` is configured. Designed for storing uploaded CV files (PDF, DOCX), motivation letters, and learning agreements. Provides signed URLs, size limits, and a simple SDK. Free tier: 250MB storage. The storage backend is selected automatically at startup via the DI container.

---

## Hosting & Deployment

### Vercel
Cloud platform for frontend and full-stack deployments. Hosts our Next.js application with automatic serverless function creation for API routes, edge network CDN for static assets, and preview deployments for pull requests. Production URL: `githubrepo-mocha.vercel.app`.

---

## Task Queue (Installed but Not Yet Active)

### BullMQ + ioredis
Redis-based job queue (`bullmq` v5.70.0) and Redis client (`ioredis` v5.9.3). **Installed in package.json but not yet wired into the codebase.** Originally planned for asynchronous bulk CV processing — when HR uploads a batch of CVs, each file would be queued as a job for parsing, extraction, and scoring. Currently, CV processing runs synchronously. These packages will be activated when the async bulk upload pipeline (Phase 2 of CV Parser Plan) is implemented.

---

## Charts & Visualization

### Recharts (Planned)
React charting library built on D3.js (version **3.7.0**, installed). Will be used in the Analytics dashboard for recruitment funnels, score distributions, hiring pipeline metrics, and bias detection visualizations. Composable API with components like `<BarChart>`, `<LineChart>`, `<PieChart>`, `<Tooltip>`. The Analytics page is currently a placeholder.

---

## Testing

### Vitest 4
Fast, ESM-native unit testing framework (version **4.0.18**). Compatible with Jest API but significantly faster due to native ES module support and Vite's transform pipeline. **56 test cases across 6 test files** covering: CV scoring engine, job-candidate matching algorithm, CV extraction validation, text extraction, upload use cases, and storage service.

### Playwright (Planned)
Browser automation framework for end-to-end testing. Will test critical user flows: CV upload → parsing → candidate list, job matching, assessment via magic link, and HR review workflow. Supports Chromium, Firefox, and WebKit. **Not yet implemented.**

---

## Development Tools

### ESLint 9
JavaScript/TypeScript linter with Next.js configuration. Catches code quality issues, enforces consistent style, and prevents common bugs. Uses the new flat config format (`eslint.config.mjs`).

### Git + GitHub
Version control and collaboration. Repository at `github.com/Frsoul7/adidas-talent-pool`. Single `main` branch with feature commits.

### Vercel CLI
Command-line tool for deploying to Vercel, pulling environment variables, and managing projects. Used for `vercel --prod` deployments and `vercel env pull` to sync cloud database credentials locally.

---

## Architecture Patterns

### Onion Architecture
Also known as Clean Architecture or Ports & Adapters. The codebase is organized into concentric layers where dependencies always point **inward**:
- **Domain** (innermost) — business rules, zero external dependencies
- **Application** — use cases, orchestration
- **Infrastructure** — database, AI, email, storage, extraction implementations
- **Presentation** (outermost) — API routes, pages

### Dependency Injection
All use cases receive their dependencies (repositories, services) via constructor injection. The composition root (`container.ts`) is the only place where infrastructure implementations are referenced directly. **11 bindings** total: 6 repositories + 5 services. This makes every layer independently testable and swappable.

### Repository Pattern
Database access is abstracted behind port interfaces (e.g., `IJobApplicationRepository`). Infrastructure classes (`PrismaJobApplicationRepository`) implement these ports. This means switching from PostgreSQL to MongoDB would only require new repository implementations — zero changes to business logic or API routes.

---

## Summary Table

| Category | Technology | Version | Status |
|----------|-----------|---------|--------|
| Framework | Next.js (App Router) | 16.1.6 | ✅ Active |
| Language | TypeScript | 5.x | ✅ Active |
| UI Library | React | 19.2.3 | ✅ Active |
| Database | PostgreSQL (Neon) | 17.2 / Serverless | ✅ Active |
| ORM | Prisma | 6.19.2 | ✅ Active |
| Scraping | Cheerio | 1.0.0 | ✅ Active |
| AI / LLM (Primary) | Groq (Llama 3.3 70B) | via OpenAI SDK 6.22.0 | ✅ Active |
| AI / LLM (Fallback) | OpenAI GPT-4o | via OpenAI SDK 6.22.0 | ✅ Active |
| STT | OpenAI Whisper | — | 🔜 Planned |
| Validation | Zod | 4.3.6 | ✅ Active |
| PDF Extraction | unpdf | 1.4.0 | ✅ Active |
| DOCX Extraction | mammoth | 1.11.0 | ✅ Active |
| UI Components | shadcn/ui + Radix UI | Latest | ✅ Active |
| Styling | Tailwind CSS | 4.x | ✅ Active |
| Icons | Lucide React | 0.575+ | ✅ Active |
| Email | Resend | 6.9.2 | ✅ Active |
| CSV Export | papaparse | 5.x | ✅ Active |
| File Storage (Dev) | LocalStorageService | Custom | ✅ Active |
| File Storage (Prod) | Vercel Blob | 2.3.1 | ✅ Active |
| Task Queue | BullMQ + ioredis | 5.70.0 / 5.9.3 | ⏸️ Installed, not wired |
| Charts | Recharts | 3.7.0 | ⏸️ Installed, not wired |
| Hosting | Vercel | — | ✅ Active |
| Unit Testing | Vitest | 4.0.18 | ✅ Active (56 tests) |
| E2E Testing | Playwright | — | 🔜 Planned |
| Linting | ESLint | 9.x | ✅ Active |
| VCS | Git + GitHub | — | ✅ Active |
