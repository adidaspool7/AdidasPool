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

### 9.1.2 Database & Platform: Supabase

| Aspect | Details |
|--------|---------|
| Provider | Supabase (PostgreSQL + Auth + Storage) |
| Connection | `SUPABASE_URL` + `SUPABASE_ANON_KEY` (client) + `SUPABASE_SERVICE_ROLE_KEY` (server privileged) |
| SDK | `@supabase/supabase-js` + `@supabase/ssr` for cookie-aware Next.js sessions |
| Migrations | Plain SQL under `supabase/migrations/` |
| Row-Level Security | Enabled on candidate-owned tables; policies reference `auth.uid()` |
| Logging | Supabase dashboard (query logs, auth logs) |

### 9.1.3 Storage: Dual-Mode Architecture

| Mode | Service | Trigger | File Access |
|------|---------|---------|-------------|
| Production | `SupabaseStorageService` | `SUPABASE_SERVICE_ROLE_KEY` present | Signed / public URLs from Supabase Storage buckets |
| Development | `LocalStorageService` | Key absent | `public/uploads/` via dev server |

Selection is automatic in the composition root (`container.ts`). The previous Vercel Blob backend (and its dependency) was removed during the Supabase consolidation.

---

## 9.2 Environment Variables

All secrets are managed externally via the Vercel dashboard — **no `.env` files are committed to the repository**.

| Variable | Purpose | Required |
|----------|---------|----------|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase project URL (exposed to client) | **Yes** |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase anon key (exposed to client, RLS-gated) | **Yes** |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase service-role key (server only — bypasses RLS, sets `app_metadata.role`) | **Yes** in production |
| `GROQ_API_KEY` | Primary LLM provider (Groq — Llama 3.3 70B, free tier) | **Yes** |
| `OPENAI_API_KEY` | Fallback LLM + interview scoring (GPT-4o / GPT-4o-mini) | **Yes** for interview mode |
| `RESEND_API_KEY` | Transactional email delivery | No (emails fail silently) |
| `INTERVIEW_BACKEND_URL` | URL of the FastAPI AI Interviewer backend | **Yes** for interview mode |
| `NEXT_PUBLIC_APP_URL` | Public app URL for magic link + OAuth callback | No (defaults to `http://localhost:3000`) |
| `NODE_ENV` | Runtime environment | Automatic (Vercel sets to `production`) |

**Note:** Secrets are managed via the Vercel dashboard for the Next.js app and the Supabase dashboard for RLS / auth provider configuration. No `.env` files are committed.

---

## 9.3 Authentication & Authorization

### Identity Provider: Supabase Auth + Google OAuth

| Mechanism | Implementation |
|-----------|---------------|
| User identity | Supabase Auth — Google OAuth as the only configured identity provider |
| Session management | Cookie-based via `@supabase/ssr`; sessions are refreshed by `middleware.ts` on each request |
| Role storage | `auth.users.app_metadata.role` — either `"hr"` or `"candidate"` |
| Role assignment | Server-side only, using the service-role key (users cannot change their own role via `auth.updateUser()` because that only touches `user_metadata`) |
| Client role context | `RoleProvider` reads `user.app_metadata.role` and exposes `role`, `clearRole`, `isLoading`, `userEmail`, `userName` |

### Middleware-Level Enforcement (`middleware.ts`)

```typescript
const PUBLIC_API_PREFIXES = ["/api/auth/"];
const HR_ONLY_API_PREFIXES = [
  "/api/candidates/rescore",
  "/api/candidates/rerank",
  "/api/scoring/",
  "/api/export/",
  "/api/notifications/campaigns",
  "/api/jobs/sync",
  "/api/upload/bulk",
  "/api/analytics",
];
```

Rules applied on every request:

1. **Session refresh** — `@supabase/ssr` refreshes the access token and rewrites cookies.
2. **`/dashboard/**`** — unauthenticated requests redirect to `/`.
3. **`/api/**` (outside `PUBLIC_API_PREFIXES`)** — unauthenticated requests return `401`.
4. **`HR_ONLY_API_PREFIXES`** — authenticated non-HR requests return `403`.

Route handlers do not reimplement these checks (the skill-verification route double-checks for defense-in-depth).

### Row-Level Security (Supabase)

Candidate-owned tables (candidates, applications, notifications, assessments, skill verifications) have RLS policies keyed on `auth.uid()`, so a candidate can only read or update their own rows when using the anon key. Privileged server-side operations use the service-role key to bypass RLS deliberately.

### Magic Link Assessment

Assessments continue to be accessed by candidates through a magic token URL (`/assess/[token]`) — this is intentionally public (no auth) so candidates can complete the assessment without signing in to the Supabase-managed portal. Tokens are CUIDs stored in the database with explicit expiry timestamps.

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
| Authentication | ✅ | Supabase Auth + Google OAuth |
| Authorization / RBAC | ✅ | Middleware-level gating with `PUBLIC_API_PREFIXES` + `HR_ONLY_API_PREFIXES`; `app_metadata.role` as source of truth |
| Row-Level Security | ✅ | Enabled on candidate-owned tables in Supabase |
| Route middleware | ✅ | `middleware.ts` handles session refresh + /dashboard + /api/* gating |
| Input validation (Zod) | ✅ | All API routes validated; notes and applications recently added schemas |
| `.strict()` on update schemas | ✅ | Mass-assignment prevention |
| Cascade deletes | ✅ | Full data cleanup on entity removal |
| Text sanitization (CVs) | ✅ | Unicode normalization for LLM input |
| LLM output validation | ✅ | Zod schema enforcement on AI responses |
| LLM rate limit handling | ✅ | Auto-failover with quota detection |
| Interview guardrails | ✅ | `evaluator.py` enforces evidence arrays, turn counts, token caps |
| Secret management | ✅ | Env vars in Vercel + Supabase dashboards; no committed secrets |
| React XSS baseline | ✅ | JSX escaping prevents most XSS vectors |

### Deliberately Omitted (with Rationale)

| Measure | Status | Rationale |
|---------|--------|-----------|
| Security headers (CSP, HSTS, X-Frame) | ❌ | Vercel provides baseline; custom headers deferred |
| API rate limiting | ❌ | Prototype scope — add via Vercel Edge Config or Supabase before public launch |
| CORS configuration | ❌ | Same-origin API calls only |
| Structured logging | ❌ | Console logging sufficient for prototype monitoring |
| Audit trail | ❌ | Would need a dedicated `audit_log` table; deferred |

### Known Considerations

| Item | Risk Level | Notes |
|------|-----------|-------|
| Email template HTML interpolation | Low | Candidate names inserted into email HTML without escaping — mitigated by data being admin-entered |
| Signed URL lifetime | Low | Supabase Storage public URLs live as long as the file; rotate via bucket policy if needed |
| File upload validation | Medium | MIME/size checks exist in use-case layer; middleware does not duplicate them but routes are HR-only |
| No `.env.example` | Low | Developer onboarding friction — easily remedied |
