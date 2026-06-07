# 08 — Testing Strategy

## Verification, Quality Assurance, and Test Architecture

---

## 8.1 Testing Framework

| Component | Choice | Version |
|-----------|--------|---------|
| Test Runner | Vitest | 4.1.5 |
| React Plugin | @vitejs/plugin-react | 5.1.4 |
| Coverage | @vitest/coverage-v8 | — |
| Environment | `node` (not jsdom) | — |
| Globals | Enabled (`describe`, `it`, `expect`) | — |
| Test Scripts | `npm test` (single run), `npm run test:watch` (dev) | — |

### Configuration

```typescript
// vitest.config.ts
export default defineConfig({
  plugins: [react()],
  test: {
    environment: "node",
    globals: true,
    include: ["src/**/*.test.ts", "src/**/*.test.tsx", "tests/**/*.test.ts"],
  },
  resolve: {
    alias: {
      "@server": path.resolve(__dirname, "./src/server"),
      "@client": path.resolve(__dirname, "./src/client"),
      "@": path.resolve(__dirname, "./src"),
    },
  },
});
```

**Why Vitest over Jest:**
- Native ESM support — no CommonJS transform issues
- Vite-compatible aliases — mirrors application's `tsconfig.json` paths
- Faster cold starts via esbuild transformer
- Compatible with the React plugin for future component testing
- Built-in watch mode with HMR-like speed

---

## 8.2 Test Inventory

### 8.2.1 Test Files Summary

| # | File | Tests | Category | Layer |
|---|------|-------|----------|-------|
| 1 | `adidas-job-scraper.test.ts` | 10 | Integration / scraper | Application |
| 2 | `analytics-catalog.test.ts` | 16 | Domain logic + security | Domain (services) |
| 3 | `cv-fields-of-work.test.ts` | 5 | Schema validation | Application (DTOs) |
| 4 | `cv-validation.test.ts` | 19 | Schema validation | Application (DTOs) |
| 5 | `escape-or-term.test.ts` | 9 | Security (injection prevention) | Infrastructure (db-utils) |
| 6 | `interview-runtime.test.ts` | 37 | Interview rubric + evidence persistence | Application + Infrastructure |
| 7 | `interview-token.test.ts` | 6 | Auth token round-trips + expiry | Infrastructure (auth) |
| 8 | `job-fit.test.ts` | 47 | Domain logic (matching engine) | Domain (services) |
| 9 | `job-matching-bridge.test.ts` | 25 | DB-row → matcher bridge | Application |
| 10 | `job-requirements-schema.test.ts` | 9 | Schema validation | Application (DTOs) |
| 11 | `job-shortlist-use-cases.test.ts` | 8 | Use case orchestration | Application |
| 12 | `listing-posted-date.test.ts` | 9 | Domain logic (date parsing) | Domain (services) |
| 13 | `logger-redaction.test.ts` | 10 | Security (PII redaction) | Infrastructure (logging) |
| 14 | `middleware-auth.test.ts` | 38 | Auth / authorization | Presentation (middleware) |
| 15 | `notifications-route-auth.test.ts` | 16 | Auth / authorization | Presentation (API routes) |
| 16 | `scoring.test.ts` | 13 | Domain logic | Domain (services) |
| 17 | `text-extraction.test.ts` | 10 | Infrastructure | Infrastructure (extraction) |
| 18 | `upload-use-cases.test.ts` | 18 | Use case orchestration | Application |

**Total: 18 files, 305 test cases, all passing.**

---

### 8.2.2 Test Coverage by Category

#### CV Validation Tests (19 tests)
Tests the `CvExtractionSchema` Zod schema that validates AI-parsed CV data:

- Valid complete payload acceptance
- Minimal payload (only required fields)
- Null optionals handling
- Missing required fields rejection (firstName, lastName)
- Email format sanitization
- LinkedIn URL normalization (auto-prepend `https://`)
- CEFR language level validation (A1 through C2)
- Education level enum validation
- Domain constants: `MAX_FILE_SIZE_MB`, `ALLOWED_CV_MIME_TYPES`, `ALLOWED_CV_EXTENSIONS`

#### Scoring Tests (13 tests)
Tests the scoring engine across all four components:

| Function | What's Tested |
|----------|---------------|
| `calculateCvScore` | Score range (0-100), relative ordering (strong > weak), null field handling, boundary capping |
| `calculateAssessmentScore` | Weighted average computation, custom weight support |
| `estimateCefrLevel` | Keyword-to-CEFR mapping accuracy |
| `isBorderline` | Threshold detection (score 50-65 = borderline) |

#### Job Fit Tests (47 tests)
Tests the `computeJobFit()` pure function (job-anchored matching engine):

- Perfect match: all criteria satisfied → high score
- Poor match: no criteria satisfied → low score
- No requirements: job without criteria → applicable-criteria-only scoring
- Partial language match: partial credit
- `isEligible` flag reflects AND of applicable `met` fields
- Per-criterion: field, experience-in-field, seniority, required/preferred skills, languages, education
- Edge cases: missing parsed requirements, empty experience lists
- **Golden skill-match corpus**: curated match/no-match pairs that lock in the technical synonym groups (e.g. `js`↔`javascript`, `k8s`↔`kubernetes`, `postgres`↔`postgresql`) and phrase aliases (e.g. "machine learning"→`ml`, "power bi"→`powerbi`) while keeping distinct products apart (AWS≠Azure, Java≠JavaScript)

#### Job Matching Bridge Tests (25 tests)
Tests the glue in `JobUseCases` that converts persisted database rows into the pure matcher's input — the layer that a real production bug had silently broken:

- `parseLooseDate`: ISO, `YYYY-MM`, year-only, and unparseable inputs
- `experienceDurationYears`: duration arithmetic across date formats and open-ended (current) roles
- `buildCandidateFitInput`: maps experiences/languages/education/skills into the matcher shape, including an explicit regression case asserting `jobTitle` is carried into `evidenceTexts` (the field that was previously read as `title` and always empty)
- `buildManualRequirements`: requirement assembly from job fields when no parsed JD is available

#### Job Requirements Schema Tests (9 tests)
Tests the `JDRequirementsSchema` Zod schema used to validate LLM output from the JD parser:

- Valid full payload acceptance
- Graceful handling of missing optional sections
- Unknown LLM-invented field tolerance
- Required fields rejection

#### Text Extraction Tests (10 tests)
Tests `TextExtractionService` with mocked parsers:

- TXT plain text extraction
- PDF extraction via mocked `unpdf`
- DOCX extraction via mocked `mammoth`
- Empty file handling
- UTF-8 encoding support
- Insufficient text rejection
- Unsupported MIME type rejection

#### Upload Use Cases Tests (18 tests)
Tests the complete CV upload pipeline with all dependencies mocked:

- File validation: type checking, size limits
- Pipeline step ordering verification
- Deduplication logic: create vs. update existing candidates
- LLM Zod retry logic (automatic retry on schema parse failure)
- Candidate data mapping from AI output
- Null optionals handling
- Bulk upload: parsing job tracking, success/failure counting
- `ValidationError` class behavior

#### Vercel Blob Storage Tests (removed)
The original `vercel-blob-storage.test.ts` suite was deleted alongside the Vercel Blob dependency when the project consolidated on Supabase Storage. Storage is thin, I/O-dominated, and covered indirectly through the upload use-case tests.

#### Interview Runtime Tests (37 tests)
Tests the AI Interviewer integration layer that proxies to the FastAPI backend:

- Session creation persists the correct `assessment_mode = INTERVIEW`
- Turn submission increments `turn_count` and appends to the `evidence` array inside `evaluation_rationale`
- Rubric-derived scores are validated against the Zod schema before persistence
- Empty-evidence FAIL verdicts are auto-reverted to PASS (mirrors the Python `evaluator.py` guardrail)
- `max_tokens=500` cap is honoured in prompts
- Completion endpoint finalizes the assessment status to `SCORED`

#### Interview Token Tests (6 tests)
Tests HMAC-SHA256 JWT generation and verification (`src/lib/interview-utils.ts`):

- Round-trip sign → verify (valid payload returned)
- Tampered signature rejection
- Expired token rejection
- `verifyForUser()` binds token to a specific `session_id`

#### Middleware Auth Tests (38 tests)
Tests `middleware.ts` route-gating logic end-to-end:

- Unauthenticated callers receive `401` on protected routes
- Non-HR callers receive `403` on `HR_ONLY_API_PREFIXES`
- Authenticated HR callers pass through
- Public routes (landing page, auth callbacks) are not gated

#### Notifications Route Auth Tests (16 tests)
Tests authentication enforcement on notification API routes:

- `GET`, `PATCH`, `DELETE` on `/api/notifications` return 401/403 for unauthenticated/wrong-role callers
- `markAllRead` and bulk-archive endpoints enforce auth

#### Analytics Catalog Tests (16 tests)
Tests the analytics constraint-builder catalog (`src/server/domain/services/analytics-catalog.ts`):

- Valid `metric × dimension × chartType` combinations are accepted
- Invalid combinations are rejected
- Unknown filter keys are rejected (injection-prevention)
- `limit` bounds enforced
- `WidgetSpecSchema.strict()` rejects injected top-level keys

#### Escape-OrTerm Tests (9 tests)
Tests `escapeOrTerm()` utility (`src/server/infrastructure/database/db-utils.ts`) which prevents PostgREST `.or()` filter injection:

- Special characters in search strings are safely escaped
- Unescaped values would produce invalid PostgREST syntax (documented)

#### Logger Redaction Tests (10 tests)
Tests `createLogger()` PII redaction to ensure structured logs don't leak sensitive data:

- Email addresses are redacted in log payloads
- Tokens / API keys are masked
- Non-PII values are logged verbatim

#### Job Shortlist Use-Case Tests (8 tests)
Tests `ShortlistUseCases` through the port interface:

- Idempotent add (second add returns 200, not a duplicate)
- `fitScoreAtAdd` snapshot captured from `job_matches.match_score` at add time
- `NotFoundError` thrown when job or candidate not found

#### CV Fields of Work Tests (5 tests)
Tests the `fields_of_work` tolerant Zod preprocess that silently drops LLM-invented values outside the canonical 16 Fields of Work.

#### Adidas Job Scraper Tests (10 tests)
Tests the adidas careers-portal scraper logic (`scripts/` + `JobScraper`):

- URL construction for paginated search
- Parsing of job cards into structured records
- Dedup logic (`externalId` uniqueness)

#### Listing Posted-Date Tests (9 tests)
Tests the fuzzy posted-date parsing for scraped jobs (e.g., "3 days ago", "1 month ago" → ISO date).

---

## 8.3 Testing Architecture

### 8.3.1 Alignment with Application Architecture

The test suite follows the application's **Onion Architecture** boundary:

```
┌──────────────────────────────────────────────────────────┐
│ Tests Target These Layers:                               │
│                                                          │
│  ┌──────────────────────────────────────────────────┐    │
│  │ Application Layer                                │    │
│  │  ✅ Upload use cases (full pipeline)             │    │
│  │  ✅ CV validation schemas (DTOs)                 │    │
│  │  ✅ Job requirements schema (DTOs)               │    │
│  │  ✅ CV fields-of-work schema (DTOs)              │    │
│  │  ✅ Job-matching bridge (row → matcher input)    │    │
│  │  ✅ Job shortlist use cases                      │    │
│  └──────────────────────────────────────────────────┘    │
│  ┌──────────────────────────────────────────────────┐    │
│  │ Domain Layer                                     │    │
│  │  ✅ Scoring service                              │    │
│  │  ✅ Job-fit matching engine                      │    │
│  │  ✅ Analytics catalog + security constraints     │    │
│  │  ✅ Posted-date parsing                          │    │
│  └──────────────────────────────────────────────────┘    │
│  ┌──────────────────────────────────────────────────┐    │
│  │ Infrastructure Layer                             │    │
│  │  ✅ Text extraction service                      │    │
│  │  ✅ Interview token (HMAC auth)                  │    │
│  │  ✅ Logger PII redaction                         │    │
│  │  ✅ escapeOrTerm (injection prevention)          │    │
│  └──────────────────────────────────────────────────┘    │
│  ┌──────────────────────────────────────────────────┐    │
│  │ Presentation Layer                               │    │
│  │  ✅ Middleware auth gating (401/403)             │    │
│  │  ✅ Notifications route auth                     │    │
│  └──────────────────────────────────────────────────┘    │
└──────────────────────────────────────────────────────────┘
```

### 8.3.2 Mocking Strategy

The Onion Architecture enables clean testing through **port-based mocking**. Every external dependency is mocked at its domain interface:

| Mock Factory | Mocks Interface | Used In |
|--------------|-----------------|---------|
| `createMockCandidateRepo()` | `CandidateRepository` port | upload-use-cases |
| `createMockParsingJobRepo()` | `ParsingJobRepository` port | upload-use-cases |
| `createMockCvParser()` | `CvParserService` port | upload-use-cases |
| `createMockStorage()` | `StorageService` port | upload-use-cases |
| `createMockTextExtraction()` | `TextExtractionService` port | upload-use-cases |
| `createMockDedup()` | `DeduplicationService` port | upload-use-cases |
| `vi.mock("unpdf")` | External library | text-extraction |
| `vi.mock("mammoth")` | External library | text-extraction |
| `vi.mock("@supabase/supabase-js")` / `vi.mock("@/server/infrastructure/database/supabase-client")` | Supabase client | interview-runtime |

**Pattern:** `vi.fn()` with manual return values — no mocking library (e.g., no `msw`, no `nock`).

### 8.3.3 Test Fixture Pattern

Tests use factory functions for test data:

```typescript
// Example: validExtraction factory with overrides
function validExtraction(overrides?) {
  return { firstName: "John", lastName: "Doe", ...overrides };
}

// Example: createMockFile factory
function createMockFile(name, type, sizeMB) {
  // Returns File object with configurable properties
}
```

Each test file is **self-contained** — no shared test utilities, no global fixtures, no setup files.

---

## 8.4 What is Tested vs. What is Not

### Tested Areas

| Area | Coverage Level | Reasoning |
|------|---------------|-----------|
| CV upload pipeline | **High** | Most complex feature; multi-step orchestration with retry logic |
| Scoring algorithms | **High** | Core business logic; deterministic, pure functions |
| Job-fit matching engine | **High** | Core business logic; 7 criteria, pure function |
| Job-matching bridge | **High** | Row→matcher glue; locked after a production `jobTitle` defect |
| Schema validation (CV, JD, fields-of-work) | **High** | Data integrity at LLM → application boundaries |
| Analytics catalog constraints | **High** | Security-sensitive; prevents malformed/injected specs |
| Middleware auth gating | **High** | 401/403 enforcement across all route groups |
| Interview runtime | **High** | Rubric enforcement + evidence persistence |
| Interview auth tokens | **Medium** | HMAC sign/verify + expiry |
| Logger PII redaction | **Medium** | Security — prevents credential leakage in logs |
| PostgREST injection prevention | **Medium** | `escapeOrTerm` unit-tested |
| Notifications auth | **Medium** | Route-level 401/403 checks |
| Per-job shortlist use cases | **Medium** | Idempotency + fit snapshot |
| Text extraction | **Medium** | Integration point with `unpdf` / `mammoth` |
| Storage | **Low** | Thin wrapper; verified indirectly through upload tests |

### Not Tested (with Justification)

| Area | Reason |
|------|--------|
| React components | Environment is `node` (no jsdom); would need component testing setup |
| API route handlers | Thin delegation layer; routes call use cases only, minimal logic |
| Database repositories | Would require a dedicated Supabase test project or in-memory PG stub; deferred |
| Email sending | External service (Resend); would require integration test environment |
| Job scraping | External dependency (adidas careers portal); fragile to changes |
| Notification system | Follows CRUD pattern; lower risk than algorithmic code |
| Export functionality | Simple transformation; CSV generation is straightforward |
| Authentication | Supabase Auth + middleware enforcement; covered manually plus the role-based access patterns are one-line checks |

### Testing Priority Rationale

The testing strategy prioritizes the **CV upload pipeline** because it is:
1. The most algorithmically complex feature (9-stage pipeline)
2. The integration point with external AI (LLM responses need validation)
3. The feature with the highest data transformation complexity
4. The area most likely to regress under changes

---

## 8.5 Test Execution

### Running Tests

| Command | Purpose |
|---------|---------|
| `npm test` | Single run — CI/CD compatible (`vitest run`) |
| `npm run test:watch` | Development — re-runs on file changes |

### Results

```
✓ tests/adidas-job-scraper.test.ts        (10 tests)
✓ tests/analytics-catalog.test.ts         (16 tests)
✓ tests/cv-fields-of-work.test.ts         ( 5 tests)
✓ tests/cv-validation.test.ts             (19 tests)
✓ tests/escape-or-term.test.ts            ( 9 tests)
✓ tests/interview-runtime.test.ts         (37 tests)
✓ tests/interview-token.test.ts           ( 6 tests)
✓ tests/job-fit.test.ts                   (25 tests)
✓ tests/job-requirements-schema.test.ts   ( 9 tests)
✓ tests/job-shortlist-use-cases.test.ts   ( 8 tests)
✓ tests/listing-posted-date.test.ts       ( 9 tests)
✓ tests/logger-redaction.test.ts          (10 tests)
✓ tests/middleware-auth.test.ts           (38 tests)
✓ tests/notifications-route-auth.test.ts  (16 tests)
✓ tests/scoring.test.ts                   (13 tests)
✓ tests/text-extraction.test.ts           (10 tests)
✓ tests/upload-use-cases.test.ts          (18 tests)

Test Files  17 passed (17)
Tests       258 passed (258)
```

---

## 8.6 Future Testing Opportunities

| Category | Tool | Scope |
|----------|------|-------|
| Component Testing | Vitest + jsdom + Testing Library | UI components |
| API Route Testing | Vitest + Next.js test helpers | Route handlers |
| E2E Testing | Playwright | Full user flows (upload, apply, assess) |
| Visual Regression | Playwright + snapshots | UI consistency |
| Load Testing | k6 or Artillery | API endpoint performance |
| Database Integration | Supabase test project + `pg-mem` stubs | Repository layer |
