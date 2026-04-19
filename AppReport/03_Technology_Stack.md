# 03 — Technology Stack

## In-Depth Analysis of Every Technology Choice

---

## 3.1 Decision Framework

Every technology in this project was evaluated against five criteria:

1. **Fitness for Purpose** — Does it solve the specific problem at hand?
2. **Developer Experience** — How fast can we iterate, debug, and maintain?
3. **Type Safety** — Does it integrate well with TypeScript's type system?
4. **Deployment Compatibility** — Does it work in Vercel's serverless environment?
5. **Cost** — Can we run this on free/student tiers for an academic project?

The stack deliberately avoids enterprise-grade heavyweight solutions (Kubernetes, microservices, Kafka) in favor of a pragmatic "right-sized" approach matched to the project's actual scale: a single full-stack application serving two user personas.

---

## 3.2 Core Framework — Next.js 16 (App Router)

| Attribute | Detail |
|-----------|--------|
| Version | 16.1.6 |
| Role | Full-stack framework (frontend + backend) |
| Key Feature | App Router with React Server Components |

### Why Next.js?

The most impactful architecture decision: **using a single framework for both frontend and backend**, eliminating the need for a separate Node/Express server.

**Alternatives considered and rejected:**

| Alternative | Why Rejected |
|-------------|-------------|
| React + Express (separate backend) | Two codebases, shared types require code generation, CORS complexity, two deployment targets |
| Angular + NestJS | Angular's learning curve for team member; NestJS adds unnecessary abstraction for our API size |
| Vue + Fastify | Vue lacks the component ecosystem (shadcn/ui) we rely on |
| Remix | Viable alternative, but smaller ecosystem and less Vercel integration |
| Plain Express.js | No SSR, no file-based routing, no built-in optimization |

**Why Next.js wins:**

1. **Unified TypeScript codebase** — Same types flow from Prisma schema → domain ports → use cases → API routes → React components. Zero serialization boundaries to maintain.
2. **File-based routing** — `src/app/api/jobs/route.ts` automatically becomes `GET/POST /api/jobs`. No route registration boilerplate.
3. **API Route Handlers** — Full request/response control in serverless functions. Each API route is an isolated serverless function on Vercel.
4. **React Server Components** — Dashboard layouts render server-side, reducing client JavaScript bundle.
5. **Vercel native** — Zero-config deployment, preview deployments per PR, env variable management.

### App Router vs Pages Router

We chose the **App Router** (introduced in Next.js 13, stable since 14):

- `layout.tsx` files provide nested layouts (dashboard shell wraps all sub-pages)
- `page.tsx` files define route segments
- API routes in `src/app/api/` use the Web Standard `Request`/`Response` API
- Colocation: route handlers, components, and styles live together

---

## 3.3 Language — TypeScript 5

| Attribute | Detail |
|-----------|--------|
| Version | ^5 |
| Coverage | 100% of codebase (frontend + backend) |
| Strict Mode | Enabled via tsconfig.json |

### Why TypeScript?

In a project with an Onion Architecture and 19 database models, type safety is not optional — it's the primary defense against integration bugs.

**Concrete benefits in this project:**

1. **Port interfaces** (`IJobRepository`, `ICandidateRepository`) — TypeScript interfaces define contracts that infrastructure must satisfy. The compiler catches missing methods or wrong return types.
2. **Zod schema inference** — `z.infer<typeof CreateJobSchema>` generates TypeScript types from validation schemas. Request validation and type checking are unified.
3. **Prisma type generation** — `prisma generate` produces types for every model, enum, and relation. Database queries are fully typed.
4. **Refactoring safety** — Renaming a field in a DTO automatically surfaces every location that must change.

**Why not JavaScript?** With 7 repository implementations and 40+ use-case methods, runtime type errors would be discovered too late. TypeScript catches them at build time.

---

## 3.4 Database — PostgreSQL + Neon

| Attribute | Detail |
|-----------|--------|
| Engine | PostgreSQL 17.2 (local) / Neon Serverless (production) |
| Hosting | Neon free tier via Vercel integration |
| Project | `neon-citron-school` |

### Why PostgreSQL?

The data model is inherently relational: Candidates **have many** Experiences, Education entries, and Languages. Jobs **have many** Applications. Notifications **belong to** Candidates or HR users. A document database (MongoDB) would require denormalization or manual joins.

**Alternatives considered:**

| Alternative | Why Rejected |
|-------------|-------------|
| MongoDB | No relational integrity for candidate→experience→education hierarchy; manual joins needed |
| SQLite | Single-file DB doesn't support concurrent writes in serverless environment |
| MySQL | Viable, but PostgreSQL has better JSON support (for future flexibility) and is the default for Neon/Vercel |
| Supabase | Full BaaS adds unnecessary abstraction layer; we want direct DB control through Prisma |

### Why Neon?

1. **Serverless-native** — Scales to zero when idle (important for free tier cost)
2. **Vercel-integrated** — Connection strings auto-injected as env variables
3. **Free tier** — Sufficient for academic project (0.5 GB storage, 190 hours compute)
4. **PostgreSQL-compatible** — Standard Prisma connection string; no vendor lock-in

---

## 3.5 ORM — Prisma 6

| Attribute | Detail |
|-----------|--------|
| Version | 6.19.2 |
| Schema | `prisma/schema.prisma` (19 models, 14 enums) |
| Client | `@prisma/client` (generated, type-safe) |

### Why Prisma?

**Alternatives considered:**

| Alternative | Why Rejected |
|-------------|-------------|
| Raw SQL queries | No type safety, manual result mapping, migration fragility |
| Drizzle ORM | Excellent alternative, but Prisma has more mature migration tooling and broader documentation |
| TypeORM | Decorator-heavy, class-based approach conflicts with our functional port/adapter design |
| Knex.js | Query builder only (not full ORM), still requires manual type mapping |
| Sequelize | Poor TypeScript support, older API design |

**Prisma advantages in this project:**

1. **Declarative schema** — `schema.prisma` is the single source of truth for database structure. Models, relations, enums, and defaults defined in one file.
2. **Generated types** — `prisma generate` creates TypeScript types matching every model. `Prisma.CandidateCreateInput` enforces correct field types at compile time.
3. **Migration tooling** — `prisma migrate dev` generates SQL migrations automatically from schema changes. `prisma db push` for rapid prototyping.
4. **Nested writes** — `prisma.candidate.create({ data: { ..., experiences: { create: [...] } } })` handles the full object graph in one transaction.
5. **Relation loading** — `include: { experiences: true, education: true, languages: true }` replaces manual JOINs.

### Prisma in our Architecture

Prisma lives **exclusively** in the Infrastructure layer. Domain ports define abstract interfaces (e.g., `findMany(filters): Promise<Job[]>`), and infrastructure repositories (`PrismaJobRepository`) implement them using the Prisma client. The Application and Domain layers never import from `@prisma/client`.

---

## 3.6 AI & LLM — Groq + OpenAI (Dual Provider)

| Attribute | Detail |
|-----------|--------|
| Primary | Groq — Llama 3.3 70B Versatile |
| Fallback | OpenAI — GPT-4o |
| SDK | `openai` v6.22.0 (used for both providers) |

### Architecture: Single SDK, Two Providers

A key insight: Groq exposes an **OpenAI-compatible API**. By passing `baseURL: 'https://api.groq.com/openai/v1'` to the OpenAI SDK, we seamlessly switch providers with zero code changes.

```
const groqClient = new OpenAI({
  apiKey: process.env.GROQ_API_KEY,
  baseURL: 'https://api.groq.com/openai/v1'
});
```

### Why Groq as Primary?

| Factor | Groq | OpenAI |
|--------|------|--------|
| Cost | Free tier (14,400 requests/day) | Pay-per-token (~$5/M input tokens for GPT-4o) |
| Speed | ~200 tokens/sec (LPU inference) | ~60 tokens/sec |
| Model Quality | Llama 3.3 70B — competitive with GPT-3.5 | GPT-4o — state-of-the-art |
| Reliability | Occasional rate limits on free tier | Highly reliable with paid tier |

**Decision:** For an academic project, Groq's free tier provides sufficient quality for structured CV parsing. OpenAI serves as a fallback when Groq is unavailable or for assessment scoring where quality matters more.

### Why Not Other LLM Options?

| Alternative | Why Rejected |
|-------------|-------------|
| OpenAI only | Cost — parsing 500 CVs with GPT-4o would cost ~$10-15; not sustainable for development iterations |
| Local LLMs (Ollama) | Insufficient quality for structured JSON extraction from complex CVs; requires GPU hardware |
| Anthropic Claude | No OpenAI-compatible API at the time of design; would require separate client |
| Google Gemini | Viable but API stability concerns; OpenAI SDK compatibility not guaranteed |
| Hugging Face Inference | Inconsistent structured output quality for production use |

### Structured Output Strategy

All LLM calls use **Zod schemas** for response validation:

1. User prompt contains CV text + extraction instructions
2. LLM responds with JSON (`response_format: { type: 'json_object' }`)
3. Response is validated against a Zod schema (e.g., `CandidateExtractionSchema`)
4. If validation fails → error is logged and candidate enters manual review
5. Valid data → persisted to database with business-rule scoring applied

This ensures that even if the LLM hallucinates or returns unexpected formats, malformed data never enters the database.

---

## 3.7 Validation — Zod 4

| Attribute | Detail |
|-----------|--------|
| Version | 4.3.6 |
| Usage | API input validation + LLM output validation |

### Dual-Purpose Validation

**1. API Request Validation (DTOs)**

Every API endpoint validates incoming data before processing:

```typescript
const CreateJobSchema = z.object({
  title: z.string().min(1),
  department: z.string().optional(),
  location: z.string().optional(),
  languageRequirement: z.enum(['A1', 'A2', 'B1', 'B2', 'C1', 'C2']).optional(),
  // ...
});
```

Update schemas use `.strict()` to reject unexpected fields — preventing mass-assignment vulnerabilities.

**2. LLM Output Validation**

Every AI response is validated against a schema before database insertion:

```typescript
const parsedData = CandidateExtractionSchema.parse(llmResponse);
// If this throws → response rejected, candidate flagged for manual review
```

### Why Zod over Alternatives?

| Alternative | Why Rejected |
|-------------|-------------|
| Joi | No TypeScript type inference; schema and types are separate |
| Yup | Weaker TypeScript support; designed primarily for form validation |
| io-ts | Functional-programming API has steeper learning curve |
| AJV | JSON Schema-based; separate schema language from TypeScript |
| class-validator | Requires class decorators; conflicts with functional design |

Zod 4 was chosen because `z.infer<typeof Schema>` generates TypeScript types directly from schemas — eliminating the common bug of schema and type definitions drifting apart.

---

## 3.8 Text Extraction — unpdf + mammoth

| Library | Purpose | Version |
|---------|---------|---------|
| unpdf | PDF → text extraction | 1.4.0 |
| mammoth | DOCX → text extraction | 1.11.0 |

### PDF: Why unpdf?

The original specification suggested `pdf-parse`. During implementation, `unpdf` was chosen instead because:

1. **Serverless compatibility** — `unpdf` works reliably in Vercel's serverless functions. `pdf-parse` has native C++ dependencies (`pdfjs-dist`) that can fail in serverless environments.
2. **Modern API** — Uses `async/await` natively.
3. **Active maintenance** — `unpdf` is actively maintained by the UnJS ecosystem.

### DOCX: Why mammoth?

1. **Zero native dependencies** — Pure JavaScript, deploys anywhere.
2. **Clean text extraction** — Strips formatting while preserving structure (headings, lists).
3. **Battle-tested** — Widely used for DOCX processing in Node.js.

### Supported Formats

| Format | Library | Max Size |
|--------|---------|----------|
| PDF | unpdf | 10 MB |
| DOCX | mammoth | 10 MB |
| TXT | Native `Buffer.toString()` | 10 MB |

File type detection uses the magic bytes pattern: PDF files start with `%PDF`, DOCX files are ZIP archives (PK header) containing `word/document.xml`.

---

## 3.9 Web Scraping — Cheerio

| Attribute | Detail |
|-----------|--------|
| Version | 1.0.0 |
| Target | `jobs.adidas-group.com` |
| Jobs Scraped | 1,019 openings across 21 departments |

### Why Cheerio?

**Alternatives considered:**

| Alternative | Why Rejected |
|-------------|-------------|
| Puppeteer | Requires headless Chrome — 200MB+ binary, impossible in serverless |
| Playwright | Same issue as Puppeteer; overkill when target renders server-side HTML |
| Selenium | Java-based, heavy infrastructure requirement |
| Scrapy (Python) | Different language; would require separate process |

The adidas careers portal renders job listings as **server-side HTML tables**. JavaScript rendering is not required to access the data. Cheerio (a "jQuery for Node.js") parses HTML strings directly — no browser needed.

**Implementation:** The `AdidasJobScraperService` iterates through paginated result pages, extracts `<tr>` rows with job data (title, location, department, posting date), and stores them via the repository.

---

## 3.10 UI Components — shadcn/ui + Radix UI + Tailwind CSS 4

### shadcn/ui: Not a Library, a Pattern

Unlike MUI or Ant Design, shadcn/ui components are **copied into the project** (`src/client/components/ui/`). This means:

1. **Full ownership** — We modify components freely (no version pinning issues)
2. **No runtime dependency** — Components are plain React files
3. **Accessible by default** — Built on Radix UI primitives (WAI-ARIA compliant)
4. **Consistent design system** — CSS variables for colors, spacing, radius

**20+ components used:** Avatar, Badge, Button, Card, Command, Dialog, Dropdown Menu, Input, Label, Popover, Progress, Select, Separator, Sheet, Skeleton, Sonner (toasts), Table, Tabs, Textarea, Tooltip.

### Why shadcn/ui over Alternatives?

| Alternative | Why Rejected |
|-------------|-------------|
| Material UI (MUI) | Heavy bundle size (~300KB); opinionated Material Design styling; hard to customize |
| Ant Design | Very opinionated Chinese design aesthetic; global CSS overrides required |
| Chakra UI | Runtime CSS-in-JS performance cost; theme provider complexity |
| Headless UI | Similar concept but smaller component set; maintained by Tailwind Labs |
| Build from scratch | Reinventing accessibility patterns (focus management, keyboard nav) is error-prone |

### Tailwind CSS 4

| Feature | Benefit |
|---------|---------|
| Utility-first | No separate CSS files; styles are colocated with markup |
| `cn()` helper | Combines `clsx` + `tailwind-merge` for conditional class composition |
| CSS Variables | Color system defined as CSS custom properties — theme switching ready |
| JIT Compilation | Only generates CSS for classes actually used; tiny production bundles |
| Tailwind 4 specifics | CSS-first configuration, automatic content detection, faster builds |

### Radix UI (Underlying Primitives)

Radix provides the behavior layer for complex interactive components:

- **Dialog**: Focus trap, escape-to-close, overlay click handling
- **Dropdown Menu**: Keyboard navigation, sub-menus, ARIA roles
- **Popover**: Positioning, collision detection, portal rendering
- **Command** (cmdk): Searchable command palettes with filtering

---

## 3.11 Rich Text Editor — TipTap v2

| Attribute | Detail |
|-----------|--------|
| Version | 3.20.1 |
| Extensions | 8 (StarterKit, Link, Image, Underline, TextAlign, TextStyle, Color, Placeholder) |
| Purpose | HR promotional campaign content editor |

### Why TipTap?

The notification system requires HR users to compose rich promotional campaigns with formatting, images, links, and colored text.

**Alternatives considered:**

| Alternative | Why Rejected |
|-------------|-------------|
| Plain textarea | No formatting support; plain text campaigns look unprofessional |
| Markdown editor (react-md) | Markdown requires learning; HR users expect WYSIWYG |
| Quill | Older API, less modular, fixed toolbar |
| CKEditor | Heavy licensing for commercial use; monolithic bundle |
| Draft.js | Deprecated by Meta; outdated API |
| Slate.js | Lower-level; requires building all UI from scratch |

**TipTap advantages:**

1. **Modular** — Only install extensions you need. Our 8 extensions add exactly the features required.
2. **Headless** — No default UI; we designed the toolbar with our own shadcn/ui buttons.
3. **ProseMirror-based** — Battle-tested editing engine used by major products.
4. **React integration** — `@tiptap/react` provides hooks and components.
5. **HTML output** — Content is stored as HTML, rendered directly in notification display.

---

## 3.12 Email — Resend

| Attribute | Detail |
|-----------|--------|
| Version | 6.9.2 |
| Use Case | Assessment magic link emails |
| Free Tier | 100 emails/day |

### Why Resend?

**Alternatives considered:**

| Alternative | Why Rejected |
|-------------|-------------|
| SendGrid | Complex API; tiered pricing model; overkill for our volume |
| AWS SES | Requires AWS account setup; sandbox verification process |
| Nodemailer + SMTP | Requires managing SMTP credentials; deliverability issues |
| Mailgun | Similar to SendGrid; more complex setup |
| Postmark | Good option but smaller free tier |

**Resend advantages:**
1. **Simple API** — `resend.emails.send({ from, to, subject, html })` — one call
2. **React email templates** — Can compose emails using React components (not used yet, but available)
3. **Developer-focused** — Built by Vercel-adjacent team; excellent DX
4. **Free tier** — 100 emails/day, sufficient for academic project
5. **Lazy-loaded** — In our code, the Resend client is only instantiated when actually sending email — app runs without Resend API key during development

---

## 3.13 File Storage — Dual Backend

### Architecture: Conditional Storage Selection

```typescript
// container.ts — composition root
if (process.env.BLOB_READ_WRITE_TOKEN) {
  container.storageService = new VercelBlobStorageService();
} else {
  container.storageService = new LocalStorageService();
}
```

### LocalStorageService (Development)

- Writes files to `public/uploads/`
- Returns public URL paths (`/uploads/filename.pdf`)
- Zero configuration required
- Files served by Next.js static file server

### Vercel Blob (Production)

- S3-compatible object storage
- Files uploaded via `@vercel/blob` SDK (v2.3.1)
- Returns signed URLs with CDN delivery
- Free tier: 250MB storage

### Why This Pattern?

Developers don't need cloud credentials to work on the project. Running `npm run dev` stores files locally. Production deployments automatically use cloud storage when the environment variable is present. The `IStorageService` port ensures all business logic is storage-backend-agnostic.

---

## 3.14 CSV Export — papaparse

| Attribute | Detail |
|-----------|--------|
| Version | 5.5.3 |
| Usage | `ExportUseCases.exportCandidatesCSV()` |

### Why papaparse?

1. **Bidirectional** — Can parse CSV (for future import) AND generate CSV (current export)
2. **Handles edge cases** — Proper escaping of commas, quotes, newlines in candidate data
3. **Streaming** — Can handle large datasets without loading everything into memory
4. **TypeScript types** — `@types/papaparse` provides full type coverage

**Alternative:** `csv-stringify` from the csv package would also work, but papaparse is more widely used and handles both parsing and generation.

---

## 3.15 Testing — Vitest

| Attribute | Detail |
|-----------|--------|
| Version | 4.0.18 |
| Test Files | 6 |
| Test Cases | 63 passing |
| Configuration | `vitest.config.ts` with path aliases |

### Why Vitest over Jest?

| Factor | Vitest | Jest |
|--------|--------|------|
| ESM Support | Native | Requires `--experimental-vm-modules` flag |
| Speed | Uses Vite's transform pipeline; instant HMR | Full project compilation on each run |
| TypeScript | Native support via Vite | Requires `ts-jest` or Babel config |
| Config | Shares `tsconfig` path aliases | Needs separate `moduleNameMapper` |
| API | Jest-compatible (`describe`, `it`, `expect`) | Original API |
| Watch Mode | Instant re-run on file change | Slower cold start |

**Vitest was chosen because:** same `@/` path aliases used in the main codebase work in tests without additional configuration. The Jest-compatible API means zero learning curve.

---

## 3.16 Utility Libraries

| Library | Version | Purpose | Why This One |
|---------|---------|---------|-------------|
| `date-fns` | 4.1.0 | Date formatting and manipulation | Tree-shakeable (vs Moment.js which imports everything); functional API |
| `uuid` | 13.0.0 | Generate UUIDs for magic link tokens | Standard RFC 4122 implementation; cryptographically random |
| `jszip` | 3.10.1 | Extract files from ZIP uploads (bulk CV upload) | Pure JavaScript; works in serverless |
| `clsx` | 2.1.1 | Conditional CSS class composition | Tiny (228 bytes); pairs with `tailwind-merge` |
| `tailwind-merge` | 3.5.0 | Resolve conflicting Tailwind classes | Prevents `p-2 p-4` from generating both; keeps last |
| `class-variance-authority` | 0.7.1 | Define component variant styles | Used by shadcn/ui for Button variants (default, destructive, outline, etc.) |
| `cmdk` | 1.1.1 | Command palette primitives | Powers the Command/Combobox component pattern (e.g., FieldMultiSelect) |
| `next-themes` | 0.4.6 | Theme provider (dark/light mode) | SSR-compatible theme switching without flash |
| `sonner` | 2.0.7 | Toast notifications | Beautiful animated toasts; shadcn/ui integration |

---

## 3.17 Installed but Not Yet Active

| Library | Version | Planned Use | Why Installed Early |
|---------|---------|-------------|-------------------|
| `bullmq` | 5.70.0 | Async job queue for bulk CV processing | Architecture designed for it; synchronous processing is a bottleneck |
| `ioredis` | 5.9.3 | Redis client (BullMQ dependency) | Required by BullMQ |
| `recharts` | 3.7.0 | Analytics dashboard charts | Analytics page placeholder exists; will wire when data aggregation is ready |

---

## 3.18 Development & Deployment Tools

| Tool | Purpose |
|------|---------|
| **ESLint 9** | Code linting with Next.js config (flat config format) |
| **Git + GitHub** | Version control; repo: `github.com/Frsoul7/adidas-talent-pool` |
| **Vercel Platform** | Hosting with automatic deployments, preview URLs, env management |
| **PostCSS** | CSS transform pipeline for Tailwind CSS |
| **shadcn CLI** | Component scaffolding: `npx shadcn@latest add <component>` |
| **Prisma CLI** | Schema management: `prisma migrate dev`, `prisma generate`, `prisma db push` |

---

## 3.19 Full Dependency Inventory

### Production Dependencies (29 packages)

| # | Package | Version | Category |
|---|---------|---------|----------|
| 1 | `@prisma/client` | ^6.19.2 | Database |
| 2 | `@tiptap/extension-color` | ^3.20.1 | Rich Text |
| 3 | `@tiptap/extension-image` | ^3.20.1 | Rich Text |
| 4 | `@tiptap/extension-link` | ^3.20.1 | Rich Text |
| 5 | `@tiptap/extension-placeholder` | ^3.20.1 | Rich Text |
| 6 | `@tiptap/extension-superscript` | ^3.20.1 | Rich Text |
| 7 | `@tiptap/extension-text-align` | ^3.20.1 | Rich Text |
| 8 | `@tiptap/extension-text-style` | ^3.20.1 | Rich Text |
| 9 | `@tiptap/extension-underline` | ^3.20.1 | Rich Text |
| 10 | `@tiptap/pm` | ^3.20.1 | Rich Text |
| 11 | `@tiptap/react` | ^3.20.1 | Rich Text |
| 12 | `@tiptap/starter-kit` | ^3.20.1 | Rich Text |
| 13 | `@vercel/blob` | ^2.3.1 | Storage |
| 14 | `bullmq` | ^5.70.0 | Queue (planned) |
| 15 | `cheerio` | ^1.0.0 | Scraping |
| 16 | `class-variance-authority` | ^0.7.1 | UI |
| 17 | `clsx` | ^2.1.1 | UI |
| 18 | `cmdk` | ^1.1.1 | UI |
| 19 | `date-fns` | ^4.1.0 | Utility |
| 20 | `ioredis` | ^5.9.3 | Queue (planned) |
| 21 | `jszip` | ^3.10.1 | File Processing |
| 22 | `lucide-react` | ^0.575.0 | Icons |
| 23 | `mammoth` | ^1.11.0 | Text Extraction |
| 24 | `next` | 16.1.6 | Framework |
| 25 | `next-themes` | ^0.4.6 | Theming |
| 26 | `openai` | ^6.22.0 | AI |
| 27 | `papaparse` | ^5.5.3 | CSV Export |
| 28 | `prisma` | ^6.19.2 | ORM CLI |
| 29 | `radix-ui` | ^1.4.3 | UI Primitives |
| 30 | `react` | 19.2.3 | UI |
| 31 | `react-dom` | 19.2.3 | UI |
| 32 | `recharts` | ^3.7.0 | Charts (planned) |
| 33 | `resend` | ^6.9.2 | Email |
| 34 | `sonner` | ^2.0.7 | Toasts |
| 35 | `tailwind-merge` | ^3.5.0 | CSS |
| 36 | `unpdf` | ^1.4.0 | Text Extraction |
| 37 | `uuid` | ^13.0.0 | Utility |
| 38 | `zod` | ^4.3.6 | Validation |

### Dev Dependencies (11 packages)

| # | Package | Version | Purpose |
|---|---------|---------|---------|
| 1 | `@tailwindcss/postcss` | ^4 | Tailwind CSS PostCSS plugin |
| 2 | `@types/node` | ^20 | Node.js type definitions |
| 3 | `@types/papaparse` | ^5.5.2 | Papaparse type definitions |
| 4 | `@types/react` | ^19 | React type definitions |
| 5 | `@types/react-dom` | ^19 | React DOM type definitions |
| 6 | `@types/uuid` | ^10.0.0 | UUID type definitions |
| 7 | `@vitejs/plugin-react` | ^5.1.4 | Vite React plugin (for Vitest) |
| 8 | `eslint` | ^9 | Linting |
| 9 | `eslint-config-next` | 16.1.6 | Next.js ESLint rules |
| 10 | `shadcn` | ^3.8.5 | Component scaffolding CLI |
| 11 | `tailwindcss` | ^4 | CSS framework |
| 12 | `tw-animate-css` | ^1.4.0 | Tailwind animation utilities |
| 13 | `typescript` | ^5 | Type checking |
| 14 | `vitest` | ^4.0.18 | Test framework |
