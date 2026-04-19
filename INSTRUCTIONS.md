# INSTRUCTIONS.md — Global Coding Rules

> For every model or developer working on this repository.
> These are non-negotiable architectural constraints, not suggestions.
> Read `CLAUDE.md` first for project context, then `TODO.md` for current work.

---

## 1. Architecture Rules

### 1.1 Onion / Clean Architecture — Dependency Direction

```
Presentation  →  Application  →  Domain  ←  Infrastructure
(API routes)     (use cases)     (ports)     (Supabase, AI, Storage)
```

**Violations that are never acceptable:**
- A use case importing from `src/server/infrastructure/`
- A domain file importing from anywhere outside `src/server/domain/`
- An API route containing business logic (DB queries, scoring, matching)
- A client component importing from `src/server/`

**How to check your import:**
If the file you're editing is in `application/`, your imports must only point to `domain/`. If you need something from infrastructure, it must go through a port interface (defined in `domain/ports/`).

### 1.2 Layer Locations

| Layer | Path | Rule |
|---|---|---|
| Domain | `src/server/domain/` | Zero external deps. Ports + value objects + pure services only. |
| Application | `src/server/application/` | Use cases + DTOs. Imports only from `domain/`. No DB, no HTTP. |
| Infrastructure | `src/server/infrastructure/` | Supabase repos, AI services, storage. Implements domain ports. |
| Presentation (server) | `src/app/api/` | Route handlers only. Delegates to use cases via `container.ts`. |
| Presentation (client) | `src/client/` | React components, hooks. No direct server imports. |

### 1.3 Composition Root

All use case instances are created in `src/server/container.ts`. Route handlers import from there, not by instantiating use cases directly. Never `new ProfileUseCases(...)` inside a route handler.

---

## 2. Database Conventions

### 2.1 Naming
- DB columns: `snake_case` — enforced by PostgreSQL schema
- JavaScript objects: `camelCase` — enforced by `camelizeKeys()` on every query result
- Always run `camelizeKeys()` on every row returned from Supabase before using it in application code
- Always run `snakeifyKeys()` on data going into Supabase `.insert()` or `.update()`

### 2.2 JSONB Fields — Do Not Camelize Internally
These fields are stored as opaque JSON and must NOT have their internal keys recursively camelized. The `camelizeKeys()` utility already handles this — do not modify the `JSONB_KEYS` set without a reason:

```
parsedData, evaluationRationale, errorLog, result, breakdown,
rawAiResponse, details, parsingConfidence
```

### 2.3 IDs
Always generate IDs with `generateId()` from `db-utils.ts` (wraps `crypto.randomUUID()`). Never use `uuid` package directly. Never rely on DB auto-generation for IDs.

### 2.4 Timestamps
`updated_at` is managed by the PostgreSQL trigger `set_updated_at()`. Do not set it in application code.

### 2.5 No Transactions
Supabase JS client does not support transactions. Use `Promise.all()` for parallel operations. Acknowledge that this means partial failure is possible — design accordingly (idempotent operations where possible).

### 2.6 No Prisma
Prisma is fully removed. `prisma-client.ts` throws on import as a safety net. Do not add `@prisma/client` or `prisma` back to `package.json`.

### 2.7 RLS
RLS is disabled on all tables. All DB access is server-side via `supabase-client.ts` (service role key). Never expose the service role key to the client.

---

## 3. Supabase Client Usage

| Situation | Use |
|---|---|
| Server Component / Route Handler / Use Case | `supabase-client.ts` (admin, service role) |
| API route that needs the authenticated user's session | `src/lib/supabase/server.ts` → `createClient()` |
| Client Component (browser) | `src/lib/supabase/client.ts` → `createClient()` |

Never use the anon key for privileged DB operations. Never use the service role key on the client side.

---

## 4. Auth Conventions

- The only auth provider is Google OAuth via Supabase.
- User role (`"candidate"` | `"hr"`) is stored in `user_metadata.role`. Never store roles in the DB or in cookies separately.
- A candidate's DB record is linked to their auth user via `candidates.user_id`. Resolution happens in `ProfileUseCases.resolveCurrentCandidate()` — do not duplicate this logic elsewhere.
- Middleware handles session refresh and route protection. Do not add redundant auth checks inside individual route handlers unless there is a specific reason (e.g., HMAC token validation for interview sessions).

---

## 5. API Route Pattern

Every route handler must follow this structure:

```typescript
// 1. Parse and validate input with Zod
const body = inputSchema.safeParse(await req.json());
if (!body.success) return NextResponse.json({ error: "..." }, { status: 400 });

// 2. Delegate entirely to a use case
const result = await someUseCases.doSomething(body.data);

// 3. Return response — no business logic here
return NextResponse.json(result);
```

Error handling: use `try/catch` at the top level. Return `{ error: string }` with appropriate HTTP status. Never leak stack traces to the client.

---

## 6. TypeScript Rules

- Always use `unknown` over `any` when possible. `any` in repository return types is acceptable only when the shape is genuinely dynamic.
- No `as any` casts in use cases or domain code. Infrastructure layer may use them where necessary for Supabase return types.
- Zod schemas in `application/dtos.ts` are the single source of truth for input shapes. Do not duplicate validation in route handlers.
- `.strict()` on update schemas — prevents extra fields from being silently accepted in PATCH requests.

---

## 7. Interview System Rules

- The interview session token is HMAC-SHA256, 10-min TTL. Validation happens in every `/api/interview/*` route. Do not skip this.
- TTS and STT use browser APIs (`window.speechSynthesis`, `window.SpeechRecognition`). These are Chrome/Edge only. Do not introduce a server-side TTS/STT dependency.
- The FastAPI backend at `INTERVIEW_BACKEND_URL` is the only caller for `/interview/start`, `/interview/turn`, `/interview/evaluate`. These are not called client-side.
- Interview mode (`language` | `technical`) must be passed to the backend at session start. The frontend is responsible for collecting this before opening the popup.

---

## 8. File & Storage Rules

- Storage bucket name: `talent-pool` (must exist in Supabase dashboard).
- All file operations go through `IStorageService` → `SupabaseStorageService`.
- Never write files to `public/uploads/` in production. `LocalStorageService` is dev-only.
- `getSignedUrl()` expires in 1 hour. Do not cache signed URLs longer than that.

---

## 9. Work Process

- **Never implement a full phase in one step.** Break work into discrete subtasks and get approval before proceeding.
- **Never proceed when scope is vague.** Ask clarifying questions until the scope is 100% defined.
- **Update `CLAUDE.md` and `TODO.md` at the end of every session** that changes architecture, completes a phase, or introduces a new decision.
- **Do not repeat context already in `CLAUDE.md`.** Read it first; do not re-explain the stack from scratch in every response.
- The user (`Stratos`) is an ECE + MSc Telecoms engineer. Skip basic explanations. Be direct, technical, and concise.
