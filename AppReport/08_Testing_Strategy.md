# 08 — Testing Strategy

## Verification, Quality Assurance, and Test Architecture

---

## 8.1 Testing Framework

| Component | Choice | Version |
|-----------|--------|---------|
| Test Runner | Vitest | 4.0.18 |
| React Plugin | @vitejs/plugin-react | 5.1.4 |
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
| 1 | `cv-validation.test.ts` | 15 | Schema validation | Application (DTOs) |
| 2 | `scoring.test.ts` | 9 | Domain logic | Domain (services) |
| 3 | `matching.test.ts` | 4 | Domain logic | Domain (services) |
| 4 | `text-extraction.test.ts` | 8 | Infrastructure | Infrastructure (extraction) |
| 5 | `upload-use-cases.test.ts` | 16 | Use case orchestration | Application |
| 6 | `interview-runtime.test.ts` | 49 | Interview rubric + evidence persistence | Application + Infrastructure |

**Total: 6 files, 101 test cases, all passing.**

---

### 8.2.2 Test Coverage by Category

#### CV Validation Tests (15 tests)
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

#### Scoring Tests (9 tests)
Tests the scoring engine across all four components:

| Function | What's Tested |
|----------|---------------|
| `calculateCvScore` | Score range (0-100), relative ordering (strong > weak), null field handling, boundary capping |
| `calculateAssessmentScore` | Weighted average computation, custom weight support |
| `estimateCefrLevel` | Keyword-to-CEFR mapping accuracy |
| `isBorderline` | Threshold detection (score 50-65 = borderline) |

#### Matching Tests (4 tests)
Tests the `matchCandidateToJob` function:

- Perfect match: all criteria satisfied → high score
- Poor match: no criteria satisfied → low score
- No requirements: job without criteria → generous scoring
- Partial language match: candidate's language partially matches → partial credit

#### Text Extraction Tests (8 tests)
Tests `TextExtractionService` with mocked parsers:

- TXT plain text extraction
- PDF extraction via mocked `unpdf`
- DOCX extraction via mocked `mammoth`
- Empty file handling
- UTF-8 encoding support
- Insufficient text rejection
- Unsupported MIME type rejection

#### Upload Use Cases Tests (16 tests)
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

#### Interview Runtime Tests (49 tests)
Tests the AI Interviewer integration layer that proxies to the FastAPI backend:

- Session creation persists the correct `assessment_mode = INTERVIEW`
- Turn submission increments `turn_count` and appends to the `evidence` array inside `evaluation_rationale`
- Rubric-derived scores are validated against the Zod schema before persistence
- Empty-evidence FAIL verdicts are auto-reverted to PASS (mirrors the Python `evaluator.py` guardrail)
- `max_tokens=500` cap is honoured in prompts
- Completion endpoint finalizes the assessment status to `SCORED`

---

## 8.3 Testing Architecture

### 8.3.1 Alignment with Application Architecture

The test suite follows the application's **Onion Architecture** boundary:

```
┌──────────────────────────────────────────────────┐
│ Tests Target These Layers:                       │
│                                                  │
│  ┌──────────────────────────────────────────┐    │
│  │ Application Layer                        │    │
│  │  ✅ Upload use cases (full pipeline)     │    │
│  │  ✅ CV validation schemas (DTOs)         │    │
│  └──────────────────────────────────────────┘    │
│  ┌──────────────────────────────────────────┐    │
│  │ Domain Layer                             │    │
│  │  ✅ Scoring service                      │    │
│  │  ✅ Matching service                     │    │
│  │  ✅ Value objects (constants)            │    │
│  └──────────────────────────────────────────┘    │
│  ┌──────────────────────────────────────────┐    │
│  │ Infrastructure Layer (mocked boundary)   │    │
│  │  ✅ Text extraction service              │    │
│  │  ✅ Blob storage service                 │    │
│  └──────────────────────────────────────────┘    │
└──────────────────────────────────────────────────┘
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
| Matching engine | **Medium** | Core business logic; formula-based |
| Schema validation | **High** | Data integrity at system boundary (AI → application) |
| Text extraction | **Medium** | Integration point; parser behavior with edge cases |
| Interview runtime | **High** | Rubric enforcement + evidence persistence on every turn |
| Storage | **Low** | Thin wrapper; verified indirectly through upload use-case tests |

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
✓ tests/cv-validation.test.ts (15 tests)
✓ tests/scoring.test.ts (9 tests)
✓ tests/matching.test.ts (4 tests)
✓ tests/text-extraction.test.ts (8 tests)
✓ tests/upload-use-cases.test.ts (16 tests)
✓ tests/interview-runtime.test.ts (49 tests)

Test Files  6 passed (6)
Tests       101 passed (101)
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
