# 04 — Architecture & Design

## Onion Architecture, Dependency Injection & Design Patterns

---

## 4.1 Architectural Style: Onion Architecture

The system follows the **Onion Architecture** (also called Clean Architecture or Ports & Adapters / Hexagonal Architecture). This pattern was chosen early in the project and enforced across every module.

### Why Onion Architecture?

| Decision Factor | How Onion Addresses It |
|----------------|----------------------|
| Testability | Domain and Application layers have zero infrastructure dependencies — testable without mocks |
| Swappability | The move from Prisma/Neon + Vercel Blob to Supabase (DB + Auth + Storage) required only new repository implementations; zero domain or use-case changes |
| AI provider flexibility | Switching from Groq to OpenAI (or any future LLM) requires only a new `ICvParserService` implementation |
| Framework independence | Domain knows nothing about Next.js, Supabase, or React |
| Enforced structure | Clear boundaries prevent "spaghetti code" as the project grows |

### Alternatives Considered

| Alternative | Why Rejected |
|-------------|-------------|
| MVC (Model-View-Controller) | No clear boundary between business logic and framework code; models often coupled to ORM |
| 3-Tier (Presentation → Business → Data) | Similar separation but allows bi-directional dependencies; domain can import from data layer |
| Microservices | Massive overhead for a single-team academic project; adds networking, deployment, and monitoring complexity |
| Serverless functions only | No code sharing or structure; each function would duplicate business logic |

### Layer Diagram

```
┌──────────────────────────────────────────────────────────────────┐
│                    PRESENTATION LAYER                            │
│         Next.js App Router (Pages, API Routes, UI)               │
│                                                                  │
│  ┌────────────────────────────────────────────────────────────┐  │
│  │                  APPLICATION LAYER                         │  │
│  │            Use Cases, DTOs, Orchestration                  │  │
│  │                                                            │  │
│  │  ┌──────────────────────────────────────────────────────┐  │  │
│  │  │                  DOMAIN LAYER                        │  │  │
│  │  │     Value Objects, Domain Services, Ports            │  │  │
│  │  │              (ZERO external deps)                    │  │  │
│  │  └──────────────────────────────────────────────────────┘  │  │
│  │                                                            │  │
│  └────────────────────────────────────────────────────────────┘  │
│                                                                  │
│  ┌────────────────────────────────────────────────────────────┐  │
│  │               INFRASTRUCTURE LAYER                         │  │
│  │    Database Repos, AI Services, Email (implements ports)   │  │
│  └────────────────────────────────────────────────────────────┘  │
│                                                                  │
└──────────────────────────────────────────────────────────────────┘
```

### Dependency Rule

> **Dependencies ALWAYS flow inward. The inner layers never know about outer layers.**

```
Presentation → Application → Domain ← Infrastructure
(API routes)    (use cases)   (ports)   (implements ports)
```

Notice the arrow direction for Infrastructure: it **depends on** Domain (by implementing its port interfaces), but Domain never imports from Infrastructure.

---

## 4.2 Layer Breakdown

### Layer 1: Domain (Innermost) — `src/server/domain/`

The domain layer is the heart of the system. It contains **pure business logic** with **zero external dependencies** — no database, no HTTP, no frameworks.

| Component | Location | Purpose |
|-----------|----------|---------|
| **Value Objects** | `value-objects.ts` | Business constants that encode domain knowledge |
| **Domain Services** | `services/scoring.service.ts` | CV scoring algorithm (deterministic, pure functions) |
| | `services/matching.service.ts` | Candidate-to-job matching algorithm (pure functions) |
| **Port Interfaces** | `ports/repositories.ts` | Abstract contracts for data persistence |
| | `ports/services.ts` | Abstract contracts for external services |

#### Value Objects (`value-objects.ts`)

Constants that encode business rules with no framework dependencies:

| Constant | Purpose | Values |
|----------|---------|--------|
| `CEFR_LEVELS` | Language proficiency scale | A1, A2, B1, B2, C1, C2 |
| `CANDIDATE_STATUS_CONFIG` | Candidate pipeline stages + UI metadata | NEW, PARSED, SCREENED, INVITED, ASSESSED, SHORTLISTED, BORDERLINE, ON_IMPROVEMENT_TRACK, REJECTED, HIRED |
| `CV_SCORING_WEIGHTS` | Component weights for CV scoring | experienceRelevance: 35%, yearsOfExperience: 25%, educationLevel: 20%, locationMatch: 20% |
| `EDUCATION_LEVEL_SCORES` | Points per education level | HIGH_SCHOOL: 20, VOCATIONAL: 40, BACHELOR: 60, MASTER: 80, PHD: 100 |
| `ASSESSMENT_DEFAULT_WEIGHTS` | Language assessment rubric weights | grammar: 20, vocabulary: 20, clarity: 20, fluency: 20, customerHandling: 20 |
| `BORDERLINE_THRESHOLD` | Score range for borderline candidates | min: 45, max: 60 |
| `MAGIC_LINK_EXPIRY_HOURS` | Assessment link validity | 48 hours |
| `MAX_FILE_SIZE_MB` | Upload size limit | 10 MB |
| `MAX_BULK_FILES` | Maximum files per batch upload | 500 |
| `DEFAULT_PAGE_SIZE` / `MAX_PAGE_SIZE` | Pagination defaults | 20 / 100 |

#### Domain Services

**Scoring Service** (`services/scoring.service.ts`) — Pure functions, zero dependencies:

- `calculateCvScore(candidate)` → Weighted 0-100 score using 4 components
- `calculateAssessmentScore(scores)` → Weighted language assessment score
- `estimateCefrLevel(score)` → Maps numeric score to CEFR level
- `isBorderline(score)` → Returns true if score is between 45-60

**Matching Service** (`services/matching.service.ts`) — Pure functions, zero dependencies:

- `matchCandidateToJob(candidate, job)` → Returns overall match score + per-criterion breakdown
- Criteria: location match, language/CEFR level, experience relevance, education level
- Each criterion returns: score (0-100), matched (boolean), details (explanation string)

#### Port Interfaces

**Repository Ports** (7 interfaces in `ports/repositories.ts`):

| Interface | Methods |
|-----------|---------|
| `ICandidateRepository` | `findMany`, `findById`, `update`, `addNote`, `updateStatus`, `findForMatching`, `findForNotifications`, `findForExport`, `createWithRelations`, `replaceRelatedRecords` |
| `IJobRepository` | `findMany`, `findById`, `findByExternalId`, `create`, `update`, `upsertByExternalId`, `upsertMatch` |
| `IAssessmentRepository` | `findMany`, `create`, `findByToken` |
| `IDeduplicationRepository` | `findByEmail`, `findByNameAndLocation`, etc. |
| `IJobApplicationRepository` | `findByCandidateId`, `findByJobAndCandidate`, `findAll`, `create`, `updateStatus`, `update`, `delete` |
| `INotificationRepository` | `findForCandidate`, `findForHR`, `countUnread`, `create`, `createMany`, `markAsRead`, `markAllAsRead`, `getPreferences`, `upsertPreferences`, `createCampaign`, `findCampaigns`, `findCampaignById`, `updateCampaign`, `deleteCampaign`, `getCampaignReadStats` |
| `IParsingJobRepository` | `create`, `findById`, `findRecent`, `updateStatus`, `incrementParsed`, `incrementFailed`, `appendError`, `recoverStaleJobs` |

**Service Ports** (5 interfaces in `ports/services.ts`):

| Interface | Methods | Purpose |
|-----------|---------|---------|
| `ICvParserService` | `parseCvText`, `classifyExperienceRelevance` | LLM-based CV extraction |
| `IEmailService` | `sendMagicLink` | Transactional email |
| `IStorageService` | `uploadFile`, `deleteFile` | File persistence |
| `ITextExtractionService` | `extractText` | PDF/DOCX text extraction |
| `IJobScraperService` | `scrapeJobs` | External job data acquisition |

### Layer 2: Application (Use Cases) — `src/server/application/`

Orchestrates domain logic. Receives dependencies via constructor injection.

| Component | Location | Purpose |
|-----------|----------|---------|
| **DTOs** | `dtos.ts` | Zod validation schemas for API input |
| **Factory** | `index.ts` | Creates use-case instances with injected dependencies |
| **Use Cases** | `use-cases/*.ts` | Business operations (7 classes, 40+ methods) |

#### Use Case Classes

| Class | Key Methods | Dependencies Injected |
|-------|-------------|----------------------|
| `CandidateUseCases` | `listCandidates`, `getCandidateById`, `updateCandidate`, `addNote` | `ICandidateRepository` |
| `JobUseCases` | `listJobs`, `getJobById`, `createJob`, `updateJob`, `matchCandidatesToJob`, `syncJobs` | `IJobRepository`, `ICandidateRepository`, `IJobScraperService` |
| `AssessmentUseCases` | `listAssessments`, `createAssessment` | `IAssessmentRepository`, `ICandidateRepository`, `IEmailService` |
| `UploadUseCases` | `processCandidateCv`, `processMotivationLetter` | `ICandidateRepository`, `ICvParserService`, `IStorageService`, `ITextExtractionService`, `IDeduplicationRepository`, `IParsingJobRepository` |
| `ExportUseCases` | `exportCandidatesCsv` | `ICandidateRepository` |
| `ApplicationUseCases` | `applyToJob`, `withdrawApplication`, `listByCandidateId`, `listAll` | `IJobApplicationRepository`, `INotificationRepository` |
| `NotificationUseCases` | `listAll`, `listUnread`, `create`, `markAsRead`, `markAllAsRead` + campaign methods | `INotificationRepository`, `ICandidateRepository` |

**Key Pattern:** Each use case class receives **only the interfaces it needs**. `CandidateUseCases` doesn't know about email or storage. This is the **Interface Segregation Principle** in action.

#### DTO Validation Schemas (`dtos.ts`)

All API input is validated before reaching use cases:

| Schema | Purpose | Notable Rules |
|--------|---------|--------------|
| `CvExtractionSchema` | Validates LLM output | Nested arrays for experiences, education, languages, skills |
| `CreateJobSchema` | Validates job creation input | Includes internship fields (startDate, endDate, stipend, mentor) |
| `UpdateJobSchema` | Validates job updates | `.strict()` mode — rejects unexpected fields |
| `CandidateFilterSchema` | Validates list query params | Pagination, sorting, status/country/language filters |
| `CreateAssessmentSchema` | Validates assessment creation | CEFR enum validation, expiry duration |
| `UpdateCandidateSchema` | Validates candidate edits | `.strict()` mode — prevents mass-assignment |

#### Use Case Factory (`index.ts`)

Creates pre-wired instances by importing from the composition root:

```typescript
import { candidateRepository, cvParserService, storageService, ... } from "@server/container";

export const candidateUseCases = new CandidateUseCases(candidateRepository);
export const jobUseCases = new JobUseCases(jobRepository, candidateRepository, jobScraperService);
export const uploadUseCases = new UploadUseCases(
  candidateRepository, cvParserService, storageService,
  textExtractionService, deduplicationRepository, parsingJobRepository
);
// ... etc
```

This file is the only place outside `container.ts` that references concrete implementations (indirectly, through the container's exports).

### Layer 3: Infrastructure (External Implementations) — `src/server/infrastructure/`

Implements domain ports using concrete technologies. The **only layer** aware of PostgreSQL, OpenAI, Resend, etc.

| Category | Implementation | Implements Port |
|----------|---------------|----------------|
| **Database** | `SupabaseCandidateRepository` | `ICandidateRepository` |
| | `SupabaseJobRepository` | `IJobRepository` |
| | `SupabaseAssessmentRepository` | `IAssessmentRepository` |
| | `SupabaseDeduplicationRepository` | `IDeduplicationRepository` |
| | `SupabaseApplicationRepository` | `IJobApplicationRepository` |
| | `SupabaseNotificationRepository` | `INotificationRepository` |
| | `SupabaseParsingJobRepository` | `IParsingJobRepository` |
| | `SupabaseAnalyticsRepository` | `IAnalyticsRepository` |
| | `SupabaseScoringWeightsRepository` + `SupabaseScoringPresetRepository` | scoring ports |
| **AI** | `OpenAiCvParserService` | `ICvParserService` |
| **Email** | `ResendEmailService` | `IEmailService` |
| **Storage** | `LocalStorageService` | `IStorageService` |
| | `SupabaseStorageService` | `IStorageService` |
| **Extraction** | `TextExtractionService` | `ITextExtractionService` |
| **Scraping** | `AdidasJobScraperService` | `IJobScraperService` |

All database-backed implementations live under `src/server/infrastructure/database/` and use the shared `supabase-client.ts` helper.

### Layer 4: Presentation (API Routes + Pages) — `src/app/`

Next.js App Router pages and API route handlers. Delegates all logic to use cases.

**API Routes** (`src/app/api/`):

Every route handler follows the same pattern:
1. Parse request (query params, body)
2. Validate via Zod DTO schema
3. Call use case method
4. Return JSON response

```typescript
// Example: GET /api/candidates
export async function GET(req: NextRequest) {
  const params = Object.fromEntries(req.nextUrl.searchParams);
  const filters = CandidateFilterSchema.parse(params);  // Validate
  const result = await candidateUseCases.listCandidates(filters);  // Delegate
  return NextResponse.json(result);  // Respond
}
```

**Pages** (`src/app/dashboard/`, `src/app/assess/`):

React client components that:
1. Call API routes via `fetch()`
2. Manage state with React hooks (`useState`, `useEffect`)
3. Render using shadcn/ui components
4. Handle errors with toast notifications (Sonner)

---

## 4.3 Composition Root — Dependency Injection Container

**Location:** `src/server/container.ts`

This is the **only file** in the entire project that imports concrete infrastructure implementations. It wires everything together.

### Bindings

**Repository Bindings:**

| Export | Type | Implementation |
|--------|------|----------------|
| `candidateRepository` | `ICandidateRepository` | `SupabaseCandidateRepository()` |
| `jobRepository` | `IJobRepository` | `SupabaseJobRepository()` |
| `assessmentRepository` | `IAssessmentRepository` | `SupabaseAssessmentRepository()` |
| `deduplicationRepository` | `IDeduplicationRepository` | `SupabaseDeduplicationRepository()` |
| `jobApplicationRepository` | `IJobApplicationRepository` | `SupabaseApplicationRepository()` |
| `notificationRepository` | `INotificationRepository` | `SupabaseNotificationRepository()` |
| `parsingJobRepository` | `IParsingJobRepository` | `SupabaseParsingJobRepository()` |
| `analyticsRepository` | `IAnalyticsRepository` | `SupabaseAnalyticsRepository()` |
| `scoringWeightsRepository` | scoring ports | `SupabaseScoringWeightsRepository()` |
| `scoringPresetRepository` | scoring ports | `SupabaseScoringPresetRepository()` |

**Service Bindings:**

| Export | Type | Implementation | Notes |
|--------|------|----------------|-------|
| `cvParserService` | `ICvParserService` | `OpenAiCvParserService()` | Internally uses Groq or OpenAI |
| `emailService` | `IEmailService` | `ResendEmailService()` | Lazy-loaded |
| `jobScraperService` | `IJobScraperService` | `AdidasJobScraperService()` | Cheerio-based |
| `storageService` | `IStorageService` | `SupabaseStorageService()` or `LocalStorageService()` | **Conditional:** uses Supabase Storage if `SUPABASE_SERVICE_ROLE_KEY` exists, otherwise local filesystem |
| `textExtractionService` | `ITextExtractionService` | `TextExtractionService()` | unpdf + mammoth |

### Conditional Binding Pattern

```typescript
export const storageService: IStorageService =
  process.env.SUPABASE_SERVICE_ROLE_KEY
    ? new SupabaseStorageService()
    : new LocalStorageService();
```

This enables **zero-configuration development**: developers run `npm run dev` without cloud credentials. Files are stored in `public/uploads/`. Production deployments on Vercel use Supabase Storage.

---

## 4.4 Design Patterns

### 4.4.1 Repository Pattern

Every database table is accessed through a repository interface. The infrastructure layer provides Supabase-backed implementations (`src/server/infrastructure/database/*.repository.ts`).

**Benefits:**
- Business logic is database-agnostic (the project migrated from Prisma/Neon to Supabase without touching a single use case)
- Complex queries are encapsulated (e.g., multi-word search with AND-of-ORs)
- Pagination logic is standardized across all repositories
- Testing can substitute in-memory implementations

**Example — Multi-word Search in `SupabaseJobRepository`:**

The `findMany` method supports search across title, location, and department with AND semantics for multiple words:

```
Search: "Berlin Marketing"
→ Must match BOTH "Berlin" AND "Marketing"
→ Each word checked against title OR location OR department (case-insensitive)
```

This is implemented as a chained `.or(...)` filter composition against the Supabase query builder.

### 4.4.2 Use Case Pattern

Each business operation is a method on a use-case class. Use cases:
- Receive validated input (already passed through Zod DTOs)
- Orchestrate domain services and repository calls
- Handle cross-cutting concerns (notifications, status updates)
- Return structured results

**Example — Apply to Job:**

```
1. Validate: Check if already applied (repository query)
2. Create: Insert application record
3. Side-effect: Create HR notification ("New application received")
4. Return: Application with job details
```

### 4.4.3 Factory Pattern

The `index.ts` application module acts as a factory, creating pre-wired use-case instances:

```typescript
export const uploadUseCases = new UploadUseCases(
  candidateRepository,      // from container
  cvParserService,          // from container
  storageService,           // from container (conditional)
  textExtractionService,    // from container
  deduplicationRepository,  // from container
  parsingJobRepository      // from container
);
```

API routes simply import `uploadUseCases` and call methods — no wiring knowledge needed.

### 4.4.4 Strategy Pattern (Storage)

The storage implementation is selected at startup based on environment:

| Environment | Strategy | Behavior |
|-------------|----------|----------|
| Development (no service-role key) | `LocalStorageService` | Writes to `public/uploads/` |
| Production (with `SUPABASE_SERVICE_ROLE_KEY`) | `SupabaseStorageService` | Uploads to a Supabase Storage bucket |

Both implement `IStorageService` with identical `uploadFile(file, path)` and `deleteFile(url)` signatures.

### 4.4.5 Deduplication Pattern (3-Tier)

Candidate deduplication uses a tiered confidence system:

| Tier | Match Criteria | Confidence | Action |
|------|---------------|------------|--------|
| 1 | Email (exact match) | 100% | Merge — update existing candidate |
| 2 | First name + Last name + Location | 85% | Merge — update existing, flag for review |
| 3 | First name + Last name only | 50% | Flag as potential duplicate, create new record |
| — | No match | 0% | Create new candidate |

### 4.4.6 Pipeline Pattern (CV Processing)

CV processing follows a **9-stage synchronous pipeline**:

```
Stage 1: Validate file (size, type, extension)
Stage 2: Store file (via IStorageService)
Stage 3: Extract text (via ITextExtractionService — unpdf/mammoth)
Stage 4: Validate extracted text (minimum length check)
Stage 5: Parse via LLM (via ICvParserService — Groq/OpenAI)
Stage 6: Validate parsed data (Zod schema)
Stage 7: Deduplicate (via IDeduplicationRepository — 3-tier)
Stage 8: Persist (createWithRelations or replaceRelatedRecords)
Stage 9: Score (via scoring domain service)
```

Each stage has clear exit conditions: if any stage fails, the pipeline halts and returns an error.

---

## 4.5 Data Flow Examples

### Example 1: CV Upload to Scored Candidate

```
                    ┌─────────────┐
                    │  POST /api/ │
                    │   upload    │
                    └──────┬──────┘
                           │ Validate request
                    ┌──────▼──────┐
                    │  Upload     │
                    │  UseCases   │
                    └──────┬──────┘
                           │
              ┌────────────┼────────────────┐
              │            │                │
       ┌──────▼──────┐ ┌──▼──────────┐ ┌──▼──────────┐
       │  IStorage   │ │ ITextExtract │ │ ICvParser   │
       │  Service    │ │  Service     │ │  Service    │
       └──────┬──────┘ └──────┬──────┘ └──────┬──────┘
              │               │               │
       Store file      Extract text      LLM parse
              │               │               │
              └───────────────┴───────────────┘
                              │
                    ┌─────────▼─────────┐
                    │  IDedup Repo      │
                    │  (3-tier check)   │
                    └─────────┬─────────┘
                              │
                    ┌─────────▼─────────┐
                    │  ICandidate Repo  │
                    │  (create/update)  │
                    └─────────┬─────────┘
                              │
                    ┌─────────▼─────────┐
                    │  Scoring Service  │
                    │  (pure domain)    │
                    └─────────┬─────────┘
                              │
                    ┌─────────▼─────────┐
                    │  Return scored    │
                    │  candidate data   │
                    └───────────────────┘
```

### Example 2: Job Matching

```
HR triggers matching for Job X
           │
    ┌──────▼──────┐
    │ Job UseCases│
    │ matchCandi- │
    │ datesToJob  │
    └──────┬──────┘
           │
    ┌──────▼──────┐        ┌────────────────┐
    │ IJob Repo   │───────►│ Load Job X     │
    │ findById    │        │ (requirements) │
    └──────┬──────┘        └────────────────┘
           │
    ┌──────▼──────────┐    ┌────────────────┐
    │ ICandidate Repo │───►│ Load eligible  │
    │ findForMatching │    │ candidates     │
    └──────┬──────────┘    └────────────────┘
           │
    ┌──────▼──────────┐
    │ Matching Service│  ← Pure domain function
    │ (for each       │    No DB, no HTTP
    │  candidate)     │
    └──────┬──────────┘
           │
    ┌──────▼──────┐
    │ IJob Repo   │  Save match scores
    │ upsertMatch │  + breakdown
    └──────┬──────┘
           │
    Return sorted results
```

---

## 4.6 Error Handling Strategy

### Custom Error Hierarchy

| Error Class | HTTP Status | Usage |
|-------------|-------------|-------|
| `NotFoundError` | 404 | Entity not found by ID |
| `ValidationError` | 400 | Invalid input (caught before Zod) |
| `ZodError` | 400 | Schema validation failure |
| Unhandled | 500 | Unexpected errors |

### API Route Error Pattern

Every API route handler wraps use case calls in try-catch:

```typescript
try {
  const result = await useCases.someMethod(input);
  return NextResponse.json(result);
} catch (error) {
  if (error instanceof NotFoundError) {
    return NextResponse.json({ error: error.message }, { status: 404 });
  }
  if (error instanceof z.ZodError) {
    return NextResponse.json({ error: error.errors }, { status: 400 });
  }
  return NextResponse.json({ error: "Internal server error" }, { status: 500 });
}
```

---

## 4.7 File Structure Mapping to Architecture

```
src/server/
├── container.ts                    ← Composition Root
├── domain/                         ← DOMAIN LAYER (innermost)
│   ├── value-objects.ts            ← Business constants
│   ├── ports/
│   │   ├── repositories.ts        ← Repository interfaces (7)
│   │   └── services.ts            ← Service interfaces (5)
│   └── services/
│       ├── scoring.service.ts      ← Pure scoring logic
│       └── matching.service.ts     ← Pure matching logic
├── application/                    ← APPLICATION LAYER
│   ├── dtos.ts                     ← Zod validation schemas
│   ├── index.ts                    ← Use case factory
│   └── use-cases/
│       ├── candidate.use-cases.ts
│       ├── job.use-cases.ts
│       ├── assessment.use-cases.ts
│       ├── upload.use-cases.ts
│       ├── export.use-cases.ts
│       ├── application.use-cases.ts
│       └── notification.use-cases.ts
└── infrastructure/                 ← INFRASTRUCTURE LAYER
    ├── database/
    │   ├── prisma-client.ts        ← Prisma singleton
    │   ├── candidate.repository.ts
    │   ├── job.repository.ts
    │   ├── assessment.repository.ts
    │   ├── dedup.repository.ts
    │   ├── application.repository.ts
    │   ├── notification.repository.ts
    │   └── parsing-job.repository.ts
    ├── ai/
    │   ├── openai-client.ts        ← Groq/OpenAI lazy-loaded client
    │   └── cv-parser.service.ts
    ├── email/
    │   └── resend.service.ts
    ├── extraction/
    │   └── text-extraction.service.ts
    ├── scraping/
    │   └── adidas-job-scraper.service.ts
    └── storage/
        ├── local-storage.service.ts
        └── vercel-blob-storage.service.ts

src/app/                            ← PRESENTATION LAYER
├── api/                            ← API Route Handlers
│   ├── candidates/
│   ├── jobs/
│   ├── assessments/
│   ├── applications/
│   ├── notifications/
│   ├── upload/
│   ├── export/
│   └── me/
├── dashboard/                      ← HR + Candidate Dashboard Pages
│   ├── layout.tsx                  ← Shared dashboard shell
│   ├── page.tsx                    ← Dashboard home
│   ├── candidates/
│   ├── jobs/
│   ├── assessments/
│   ├── applications/
│   ├── notifications/
│   ├── settings/
│   └── ...
└── assess/                         ← Public Assessment Pages
    └── [token]/page.tsx
```

---

## 4.8 Architectural Principles Summary

| Principle | How Applied |
|-----------|-------------|
| **Dependency Inversion** | Domain defines interfaces (ports); Infrastructure implements them |
| **Single Responsibility** | Each use case class handles one domain area; each repository handles one entity |
| **Interface Segregation** | Use cases receive only the interfaces they need (not a god-container) |
| **Open/Closed** | New storage providers or AI services can be added without modifying existing code |
| **Don't Repeat Yourself** | Shared pagination interface `PaginatedResult<T>`; shared filter types |
| **Explicit Dependencies** | Constructor injection makes all dependencies visible in the function signature |
| **Domain Purity** | Domain layer has zero imports from outside `@server/domain/` |
