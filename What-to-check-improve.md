# Codebase Audit — What to Check & Improve

## 1. DEAD CODE

### 1A. Dead Pages & Routes

| Item | Location | Reason |
|------|----------|--------|
| `/auth/select-role` page | `src/app/auth/select-role/page.tsx` | Zero references. Middleware redirects to `/` now. Landing page handles role selection. Entire directory is dead. |
| `/api/me/role` route | `src/app/api/me/role/route.ts` | Only called from dead `select-role` page and `setRole()` in role-provider — which is never invoked by any consumer. Effectively dead. |
| `/auth/login` page | `src/app/auth/login/page.tsx` | Middleware redirects `/auth/login` to `/dashboard` or `/`. Landing page now handles sign-in. Still referenced by sidebar and auth error page (both caught by middleware anyway). Semi-dead. |

### 1B. Dead Files

| File | Reason |
|------|--------|
| `src/server/infrastructure/storage/vercel-blob-storage.service.ts` | Not imported anywhere. Container uses `SupabaseStorageService` or `LocalStorageService`. Leftover from old stack. |
| `src/server/infrastructure/database/prisma-client.ts` | Throws on import (safety net) but nothing imports it. Served its purpose, now dead. |

### 1C. Dead Dependencies in `package.json`

| Package | Reason |
|---------|--------|
| `@vercel/blob` ^2.3.1 | Only imported in the dead `vercel-blob-storage.service.ts` |
| `bullmq` ^5.70.0 | Zero imports in `src/` |
| `ioredis` ^5.9.3 | Zero imports in `src/` |

### 1D. Dead Exports / Unused Code

| Item | Location | Detail |
|------|----------|--------|
| `setRole` in `RoleProvider` | `role-provider.tsx` L97-106 | Exposed via context but never called. Calls the dead `/api/me/role` endpoint. |
| `sleep()` utility | `src/client/lib/utils.ts` L44-46 | No callers in codebase. |

### TO-DO

- [ ] Delete `src/app/auth/select-role/` directory
- [ ] Delete `src/app/api/me/role/` directory
- [ ] Delete `src/server/infrastructure/storage/vercel-blob-storage.service.ts`
- [ ] Delete `src/server/infrastructure/database/prisma-client.ts`
- [ ] Remove `setRole` from `RoleProvider` (keep only `role`, `clearRole`, `isLoading`, `userEmail`, `userName`)
- [ ] Remove `sleep()` from `utils.ts`
- [ ] Remove `@vercel/blob`, `bullmq`, `ioredis` from `package.json`
- [ ] Update sidebar to push to `/` instead of `/auth/login`
- [ ] Update auth error page link from `/auth/login` to `/`

---

## 2. SECURITY THREATS

### 2A. API Routes Without Authentication (CRITICAL)

The middleware only protects `/dashboard/*` paths. **API routes under `/api/*` are not behind the dashboard path guard** — they can be called directly by anyone.

| Route | Methods | Auth? |
|-------|---------|-------|
| `/api/analytics` | GET | **NONE** |
| `/api/candidates` | GET | **NONE** |
| `/api/candidates/[id]` | GET, PATCH, DELETE | **NONE** |
| `/api/candidates/[id]/notes` | POST | **NONE** — `author` from request body, not session |
| `/api/candidates/rescore` | POST | **NONE** — admin operation, zero auth |
| `/api/candidates/rerank` | POST | **NONE** |
| `/api/jobs` | GET, POST | **NONE** — anyone can create jobs |
| `/api/jobs/[id]` | GET, PATCH, DELETE | **NONE** |
| `/api/jobs/[id]/match` | POST | **NONE** |
| `/api/jobs/sync` | POST, GET | **NONE** — triggers web scraping |
| `/api/assessments` | GET, POST | **NONE** |
| `/api/applications` | POST | **NONE** |
| `/api/applications/[id]` | PATCH | **NONE** |
| `/api/applications/all` | GET | **NONE** — returns ALL applications |
| `/api/upload` | POST | **NONE** — file upload |
| `/api/upload/candidate` | POST | **NONE** |
| `/api/upload/bulk` | POST, GET, PATCH | **NONE** |
| `/api/upload/bulk/[jobId]` | GET | **NONE** |
| `/api/upload/motivation-letter` | POST | **NONE** |
| `/api/upload/learning-agreement` | POST | **NONE** |
| `/api/upload/image` | POST | **NONE** |
| `/api/upload/download` | GET | **NONE** |
| `/api/scoring/weights` | GET, PUT | **NONE** — anyone can change scoring config |
| `/api/scoring/presets` | GET, POST | **NONE** |
| `/api/scoring/presets/[id]` | DELETE | **NONE** |
| `/api/export/candidates` | GET | **NONE** — exports all candidate data as CSV |
| `/api/notifications` | GET, PATCH | **NONE** |
| `/api/notifications/preferences` | GET, PUT | **NONE** |
| `/api/notifications/campaigns` | GET, POST | **NONE** |
| `/api/notifications/campaigns/[id]` | GET, PATCH, DELETE | **NONE** |
| `/api/notifications/campaigns/[id]/send` | POST | **NONE** — sends mass notifications |
| `/api/notifications/campaigns/preview` | POST | **NONE** |
| `/api/me` | GET, PATCH, DELETE | Implicit (via `getCurrentProfile()`) but no explicit 401 guard |
| `/api/interview/session` | POST | **NONE** |

**Only 2 routes** have explicit auth: `/api/me/role` (dead) and `/api/candidates/[id]/skills/[skillId]/verification`.

### 2B. Role Check Fallback to `user_metadata` (MEDIUM)

| File | Line | Issue |
|------|------|-------|
| `verification/route.ts` | 36 | Falls back to `user_metadata?.role` — user-editable |
| `role-provider.tsx` | 53, 76 | Same fallback in client |
| `callback/route.ts` | 115-117 | Migration logic — should be removed once all users migrated |

### 2C. Missing Input Validation

| Route | Issue |
|-------|-------|
| `/api/candidates/[id]/notes` | `author` and `content` from `request.json()` — no Zod validation |
| `/api/applications` | `jobId` and `candidateId` not validated as UUIDs |
| `/api/notifications/campaigns/[id]/send` | `sentBy` allows arbitrary string |

### TO-DO

- [ ] **CRITICAL**: Add auth middleware or explicit `getUser()` checks to ALL `/api/*` routes
- [ ] **CRITICAL**: Add role-based access control (HR-only for admin routes like rescore, export, campaigns)
- [ ] Remove `user_metadata` fallback from verification route and role-provider
- [ ] Add Zod validation to notes, applications, and campaign send routes
- [ ] Update `CLAUDE.md` L84-85 and `INSTRUCTIONS.md` L91 to reference `app_metadata.role`

---

## 3. CODE IMPROVEMENTS

### 3A. Excessive `any` Usage (~50+ instances)

| File | Count | Detail |
|------|-------|--------|
| `repositories.ts` (domain ports) | ~20 | Almost every return type is `Promise<any>` |
| `application.repository.ts` | 6 | `camelizeKeys<any>(...)` everywhere |
| `analytics.repository.ts` | 2 | `(r: any) =>` in callbacks |
| `notifications/route.ts` | 5 | `(n: any)`, `(a: any, b: any)` in sort |
| `supabase-client.ts` | 4 | `SupabaseClient<any>` |
| `supabase-storage.service.ts` | 3 | `createClient<any>` |

### 3B. N+1 Query Patterns

| File | Issue |
|------|-------|
| `rescore/route.ts` L13-37 | Fetches ALL candidates, then `update()` in a `for` loop — one DB call per candidate. Should batch. |
| `notifications/route.ts` L49-53 | `for (const cid of campaignIds) { getCampaign(cid) }` — one query per campaign. Should fetch all in one query. |
| `notifications/campaigns/route.ts` L17-22 | Fan-out of N queries for `getCampaignReadStats(c.id)`. Should batch. |

### 3C. Inconsistent Patterns

| Pattern | Detail |
|---------|--------|
| Auth in routes | Only 1 route has explicit auth; all others rely on middleware or nothing |
| Error handling | Most routes use `catch (error)` (unknown), 3 campaign routes use `catch (error: any)` |
| Architecture bypass | Interview routes import `db` directly from infrastructure, bypassing onion layers |
| Direct repo access | `scoring/weights/route.ts` and `scoring/presets/route.ts` import repos directly, bypassing use-case layer |

### 3D. Hardcoded Values

| File | Value | Should Be |
|------|-------|-----------|
| `assessment.use-cases.ts` L54 | `"http://localhost:3000"` fallback | `NEXT_PUBLIC_APP_URL` env var (always) |
| `upload/image/route.ts` L5 | `MAX_SIZE = 5 * 1024 * 1024` | Configurable via env var |

### 3E. Stale Comments / Documentation

| File | Issue |
|------|-------|
| `middleware.ts` L7 | Says "Redirect to /auth/select-role" — code redirects to `/` |
| `job.use-cases.ts` L48 | Says "Convert for Prisma" — Prisma is gone |
| `container.ts` L7 | "All Prisma repositories have been replaced" — migration comment, no longer relevant |
| `repositories.ts` L8 | "e.g., Prisma" — should say Supabase |
| `upload.use-cases.ts` L87 | "Upload to Vercel Blob" — uses Supabase storage now |

### 3F. Sidebar & Error Page Reference Dead Route

| File | Issue |
|------|-------|
| `sidebar.tsx` L213, L245 | `router.push("/auth/login")` — should push to `/` |
| `auth/error/page.tsx` L13 | Links to `/auth/login` — should link to `/` |

### TO-DO

- [ ] Type repository ports with proper interfaces instead of `any`
- [ ] Batch rescore and notification queries to avoid N+1
- [ ] Standardize error handling pattern across all API routes
- [ ] Move interview routes through use-case layer
- [ ] Move scoring routes through use-case layer
- [ ] Replace `localhost:3000` fallback with a proper env var check
- [ ] Update all stale Prisma/Vercel Blob comments

---

## Priority Summary

| Priority | Category | Action |
|----------|----------|--------|
| 🔴 CRITICAL | Security | Add auth to all `/api/*` routes |
| 🔴 CRITICAL | Security | Add role-based access (HR-only for admin routes) |
| 🟠 HIGH | Dead Code | Delete dead pages, files, and npm packages |
| 🟠 HIGH | Security | Update docs to reference `app_metadata.role` |
| 🟡 MEDIUM | Security | Remove `user_metadata` fallbacks |
| 🟡 MEDIUM | Performance | Fix N+1 queries |
| 🟢 LOW | Code Quality | Replace `any` types with proper interfaces |
| 🟢 LOW | Code Quality | Clean up stale comments |
