# 09 — Security & Infrastructure

## Deployment, Security Posture, and Operational Architecture

---

## 9.1 Deployment Infrastructure

### 9.1.1 Platform: Vercel

| Aspect | Configuration |
|--------|---------------|
| Hosting | Vercel serverless (Edge Network) |
| Framework | Next.js 16 (auto-detected) |
| Build | `next build` (automatic) |
| Region | Default (auto-selected) |
| HTTPS | Platform-enforced (all traffic) |
| Custom config | Minimal — `vercel.json` contains only `$schema` reference |
| `next.config.ts` | Empty — no custom headers, rewrites, or redirects |

### 9.1.2 Database: Neon PostgreSQL

| Aspect | Details |
|--------|---------|
| Provider | Neon Serverless PostgreSQL |
| Connection | `DATABASE_URL` environment variable (Prisma) |
| Pooling | Neon built-in connection pooling |
| Dev mode | Prisma Client singleton pattern prevents connection exhaustion during hot reload |
| Logging | Verbose (`["query", "error", "warn"]`) in development; error-only in production |

### 9.1.3 Storage: Dual-Mode Architecture

| Mode | Service | Trigger | File Access |
|------|---------|---------|-------------|
| Production | `VercelBlobStorageService` | `BLOB_READ_WRITE_TOKEN` present | Public URLs (Vercel Blob CDN) |
| Development | `LocalStorageService` | Token absent | `public/uploads/` via dev server |

Selection is automatic in the composition root (`container.ts`).

---

## 9.2 Environment Variables

All secrets are managed externally via the Vercel dashboard — **no `.env` files are committed to the repository**.

| Variable | Purpose | Required |
|----------|---------|----------|
| `DATABASE_URL` | PostgreSQL connection string (Neon) | **Yes** |
| `GROQ_API_KEY` | Primary LLM provider (Groq — Llama 3.3 70B, free tier) | **Yes** |
| `OPENAI_API_KEY` | Fallback LLM provider (GPT-4o-mini, paid) | No (graceful degradation) |
| `RESEND_API_KEY` | Transactional email delivery | No (emails fail silently) |
| `BLOB_READ_WRITE_TOKEN` | Vercel Blob storage for CV uploads | No (falls back to local storage) |
| `NEXT_PUBLIC_APP_URL` | Public app URL for magic link generation | No (defaults to `http://localhost:3000`) |
| `NODE_ENV` | Runtime environment | Automatic (Vercel sets to `production`) |

**Note:** No `.env.example` file exists. New developers must discover required variables from source code inspection.

---

## 9.3 Authentication & Authorization

### Current State: Demo/Prototype Mode

This is a deliberate design decision for the academic prototype phase.

| Mechanism | Implementation |
|-----------|---------------|
| User identity | None — no login, no sessions, no JWT |
| Role system | Client-side `RoleProvider` stores `"candidate"` or `"hr"` in `localStorage` key `ti_platform_role` |
| Server enforcement | **None** — API routes have no auth checks |
| Demo user | `GET /api/me` auto-creates a demo candidate profile if none exists |
| Middleware | **None** — no `middleware.ts` file exists |
| Session management | **None** — no cookies, tokens, or session storage |

**Code comment:** The role provider explicitly states: *"Will be replaced by proper RBAC auth later."*

### Magic Link Assessment (Partial Implementation)

The assessment system uses token-based access:

1. **Token generation:** `POST /api/assessments` creates a CUID token stored in the database
2. **Token URL:** `/assess/[token]` — publicly accessible assessment page
3. **Token validation:** Page exists at `src/app/assess/[token]/page.tsx` but contains TODO placeholders for token validation, expiry checking, and assessment loading

### Why No Auth (Justification)

- **Academic project scope:** Focus on AI/ML features and HR workflow design
- **Faster iteration:** No auth complexity during prototype development
- **Demo accessibility:** Evaluators can test all features without account creation
- **Clear upgrade path:** Port architecture supports adding auth middleware without refactoring

---

## 9.4 Input Validation

### 9.4.1 Zod Validation Layer

Every API route validates incoming data using Zod v4 schemas:

| Endpoint | Schema | Method |
|----------|--------|--------|
| `GET /api/candidates` | `CandidateFilterSchema.parse()` | Throws on invalid |
| `PATCH /api/candidates/[id]` | `UpdateCandidateSchema.safeParse()` | Returns result |
| `PATCH /api/candidates/[id]` | `CandidateRelationsUpdateSchema.safeParse()` | Returns result |
| `POST /api/jobs` | `CreateJobSchema.parse()` | Throws on invalid |
| `PATCH /api/jobs/[id]` | `UpdateJobSchema.parse()` | Throws on invalid |
| `POST /api/assessments` | `CreateAssessmentSchema.parse()` | Throws on invalid |
| `PATCH /api/me` | `UpdateProfileSchema.safeParse()` | Returns result |

### 9.4.2 Mass-Assignment Prevention

`UpdateCandidateSchema` uses Zod's `.strict()` mode, which **rejects any fields not explicitly defined in the schema**. This prevents attackers from including extra fields (e.g., `isAdmin`, `score`) in PATCH requests.

### 9.4.3 Text Sanitization

The `TextExtractionService` includes a `sanitizeExtractedText()` function applied to all extracted CV text before LLM processing:

- Strips zero-width characters
- Normalizes special dashes/hyphens to standard `-`
- Removes invisible Unicode characters
- Ensures clean input for AI parsing

### 9.4.4 LLM Output Validation

AI-generated CV parsing results are validated against `CvExtractionSchema` (Zod) before being persisted. If the LLM returns malformed data, the system retries with a corrective prompt.

---

## 9.5 Data Protection

### 9.5.1 Cascade Delete Strategy

All foreign key relationships implement `onDelete: Cascade`, ensuring complete data removal when a parent entity is deleted:

| Parent Entity | Cascading Children |
|--------------|-------------------|
| Candidate | Experiences, Education, Languages, Skills, Documents, Notes, Applications, Assessments, ImprovementTracks, Notifications, ParsingJobs |
| Job | Applications, InternshipApplications, Notifications |
| Assessment | AssessmentResults |
| ImprovementTrack | ImprovementMilestones |

**Implication:** Deleting a candidate removes **all** associated data — a strong data minimization posture aligned with GDPR's "right to erasure" principle.

### 9.5.2 Data Minimization

- No raw CV files are stored permanently after parsing (text is extracted, then AI-parsed data is stored as structured JSON)
- The `rawAiResponse` field stores the original LLM output for auditability
- No unnecessary personal data collection — fields like `dateOfBirth` are optional

---

## 9.6 AI Provider Security

### Dual-Provider Failover

| Provider | Model | Role | Cost |
|----------|-------|------|------|
| Groq | Llama 3.3 70B Versatile | Primary | Free (rate-limited) |
| OpenAI | GPT-4o-mini | Fallback | Paid |

### Rate Limit Handling

The AI service includes intelligent error detection:

- `isRateLimitError()` — detects HTTP 429 responses
- `isQuotaExhaustedError()` — detects quota exhaustion messages
- Automatic failover from Groq → OpenAI when rate limits are hit
- Structured output enforcement via Zod schemas (prevents LLM hallucination in data fields)

---

## 9.7 Logging & Monitoring

### Current: Console-Based Logging

Logging uses `console.error`/`console.log` with informal namespace prefixes:

| Prefix | Context |
|--------|---------|
| `[LLM]` | AI provider initialization, failover events |
| `[LocalStorage]` | File save/delete operations |
| `[BulkUpload]` | Batch processing progress and errors |
| `[ParsingJob]` | Stale job recovery |
| `[Text Extraction]` | Sanitization reports |
| `[POST /api/...]` | Route-level errors with endpoint context |

**No structured logging library** (Winston, Pino) is used. All error logging goes to `console.error` which Vercel captures in its runtime logs dashboard.

---

## 9.8 Security Posture Summary

### Implemented Measures

| Measure | Status | Details |
|---------|--------|---------|
| HTTPS enforcement | ✅ | Vercel platform default |
| Input validation (Zod) | ✅ | All API routes validated |
| `.strict()` on update schemas | ✅ | Mass-assignment prevention |
| Cascade deletes | ✅ | Full data cleanup on entity removal |
| Text sanitization (CVs) | ✅ | Unicode normalization for LLM input |
| LLM output validation | ✅ | Zod schema enforcement on AI responses |
| LLM rate limit handling | ✅ | Auto-failover with quota detection |
| Secret management | ✅ | Environment variables only, no committed secrets |
| React XSS baseline | ✅ | JSX escaping prevents most XSS vectors |

### Deliberately Omitted (with Rationale)

| Measure | Status | Rationale |
|---------|--------|-----------|
| Authentication | ❌ | Academic prototype — demo accessibility prioritized |
| Authorization / RBAC | ❌ | Depends on auth; deferred to production phase |
| Route middleware | ❌ | No auth to enforce |
| Security headers (CSP, HSTS, X-Frame) | ❌ | Vercel provides baseline; custom headers deferred |
| API rate limiting | ❌ | Demo scope — no abuse vector without public deployment |
| CORS configuration | ❌ | Same-origin API calls only |
| Structured logging | ❌ | Console logging sufficient for prototype monitoring |
| Audit trail | ❌ | Would require auth system to be meaningful |

### Known Considerations

| Item | Risk Level | Notes |
|------|-----------|-------|
| Email template HTML interpolation | Low | Candidate names inserted into email HTML without escaping — mitigated by data being admin-entered |
| Public blob storage URLs | Low | Uploaded CVs are publicly accessible by URL — acceptable for demo, needs signed URLs for production |
| No `.env.example` | Low | Developer onboarding friction — easily remedied |
| File upload validation | Medium | MIME/size checks exist in use-case layer but not at route level |
