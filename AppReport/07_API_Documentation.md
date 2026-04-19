# 07 — API Documentation

## Complete REST API Reference

---

## 7.1 API Design Principles

| Principle | Implementation |
|-----------|---------------|
| RESTful conventions | Resources as nouns, HTTP verbs for actions |
| File-based routing | `src/app/api/[resource]/route.ts` → `[METHOD] /api/[resource]` |
| JSON responses | All endpoints return `application/json` (except CSV export) |
| Zod validation | Request bodies validated via typed schemas before processing |
| Consistent errors | Standard format: `{ error: "message" }` or `{ error: "...", details: {...} }` |
| Stateless | No sessions or cookies — each request is independent |
| Delegation | Routes call use-case methods only — no business logic in route handlers |

### Error Response Format

| Status | When |
|--------|------|
| 200 | Successful read or update |
| 201 | Successful creation |
| 202 | Accepted for processing (async operations) |
| 400 | Validation error or missing parameters |
| 404 | Resource not found |
| 500 | Unhandled server error |

---

## 7.2 Endpoints Overview

| # | Method | Endpoint | Purpose |
|---|--------|----------|---------|
| 1 | GET | `/api/candidates` | List candidates (paginated, filterable) |
| 2 | GET | `/api/candidates/[id]` | Get candidate details |
| 3 | PATCH | `/api/candidates/[id]` | Update candidate (profile + relations) |
| 4 | POST | `/api/candidates/[id]/notes` | Add note to candidate |
| 5 | POST | `/api/candidates/rerank` | Re-score candidates with custom weights |
| 6 | GET | `/api/jobs` | List jobs (paginated, searchable, filterable) |
| 7 | POST | `/api/jobs` | Create job/internship |
| 8 | GET | `/api/jobs/[id]` | Get job details |
| 9 | PATCH | `/api/jobs/[id]` | Update job/internship |
| 10 | POST | `/api/jobs/sync` | Sync jobs from adidas careers portal |
| 11 | POST | `/api/jobs/[id]/match` | Run matching for a specific job |
| 12 | GET | `/api/assessments` | List assessments (filterable) |
| 13 | POST | `/api/assessments` | Create assessment (magic link) |
| 14 | POST | `/api/applications` | Apply to job |
| 15 | GET | `/api/applications` | List candidate's applications |
| 16 | PATCH | `/api/applications/[id]` | Withdraw application |
| 17 | GET | `/api/applications/all` | List all applications (HR) |
| 18 | GET | `/api/notifications` | Get notifications (role-scoped) |
| 19 | PATCH | `/api/notifications` | Mark notification(s) as read |
| 20 | GET/PATCH | `/api/notifications/preferences` | Get/update notification preferences |
| 21 | GET/POST | `/api/notifications/campaigns` | List/create campaigns |
| 22 | GET/PATCH | `/api/notifications/campaigns/[id]` | Get/update campaign |
| 23 | POST | `/api/notifications/campaigns/[id]/send` | Send a campaign |
| 24 | POST | `/api/notifications/campaigns/preview` | Preview campaign audience |
| 25 | POST | `/api/upload` | Upload CV file(s) |
| 26 | POST | `/api/upload/candidate` | Candidate self-upload CV |
| 27 | POST | `/api/upload/bulk` | Bulk upload CVs |
| 28 | POST | `/api/upload/bulk/[jobId]` | Bulk upload CVs for a specific job |
| 29 | POST | `/api/upload/motivation-letter` | Upload motivation letter |
| 30 | POST | `/api/upload/learning-agreement` | Upload learning agreement |
| 31 | POST | `/api/upload/image` | Upload campaign image |
| 32 | GET | `/api/upload/download` | Download a stored file |
| 33 | GET | `/api/export/candidates` | Export candidates as CSV |
| 34 | GET | `/api/me` | Get current candidate profile |
| 35 | PATCH | `/api/me` | Update current candidate profile |
| 36 | GET | `/api/analytics` | Get dashboard analytics |
| 37 | GET | `/api/scoring/weights` | Get current scoring weights |
| 38 | PUT | `/api/scoring/weights` | Update scoring weights |
| 39 | GET/POST | `/api/scoring/presets` | List/create scoring presets |
| 40 | DELETE | `/api/scoring/presets/[id]` | Delete a scoring preset |

---

## 7.3 Detailed Endpoint Specifications

### 7.3.1 Candidates

#### `GET /api/candidates`

List all candidates with pagination, filtering, and sorting.

**Query Parameters:**

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `search` | string | — | Search across name, email, location |
| `status` | enum | — | Filter by status (NEW, PARSED, SCREENED, INVITED, ASSESSED, SHORTLISTED, BORDERLINE, ON_IMPROVEMENT_TRACK, REJECTED, HIRED) |
| `country` | string | — | Filter by country |
| `minScore` | number (0-100) | — | Minimum CV score |
| `maxScore` | number (0-100) | — | Maximum CV score |
| `language` | string | — | Filter by spoken language |
| `languageLevel` | enum | — | Filter by CEFR level (A1-C2) |
| `sourceType` | enum | — | EXTERNAL or INTERNAL |
| `page` | integer | 1 | Page number (min 1) |
| `pageSize` | integer | 20 | Results per page (1-100) |
| `sortBy` | string | "createdAt" | Sort field |
| `sortOrder` | "asc" \| "desc" | "desc" | Sort direction |

**Response 200:**
```json
{
  "candidates": [...],
  "pagination": {
    "page": 1,
    "pageSize": 20,
    "total": 150,
    "totalPages": 8
  }
}
```

---

#### `GET /api/candidates/[id]`

Get full candidate profile with all relations.

**Path Parameters:** `id` (string, CUID)

**Response 200:** Complete candidate object with experiences, education, languages, skills, tags, notes, assessments.

**Response 404:** `{ "error": "Candidate not found" }`

---

#### `PATCH /api/candidates/[id]`

Update candidate profile and/or related records.

**Path Parameters:** `id` (string, CUID)

**Request Body — Personal Fields** (validated via `UpdateCandidateSchema.strict()`):

| Field | Type | Notes |
|-------|------|-------|
| `firstName` | string | min 1 character |
| `lastName` | string | min 1 character |
| `email` | string \| null | Email format validated |
| `phone` | string \| null | |
| `location` | string \| null | |
| `country` | string \| null | |
| `linkedinUrl` | string \| null | Auto-prepends `https://` if missing |
| `dateOfBirth` | string \| null | |
| `nationality` | string \| null | |
| `willingToRelocate` | boolean \| null | |
| `availability` | enum \| null | "Immediately", "1 month", "2 months", "3+ months" |
| `workModel` | enum \| null | REMOTE, HYBRID, ON_SITE |
| `bio` | string \| null | max 500 characters |
| `status` | enum | 10 candidate statuses |
| `sourceType` | enum | EXTERNAL, INTERNAL |

**Request Body — Relation Fields** (validated via `CandidateRelationsUpdateSchema`):

| Field | Type |
|-------|------|
| `experiences` | `[{ jobTitle, company?, location?, startDate?, endDate?, isCurrent, description? }]` |
| `education` | `[{ institution?, degree?, fieldOfStudy?, startDate?, endDate?, level? }]` |
| `languages` | `[{ language, selfDeclaredLevel? }]` |
| `skills` | `[{ name, category? }]` |

When relations are provided, all existing related records are deleted and replaced.

**Response 200:** Updated candidate object
**Response 400:** `{ "error": "Validation failed", "details": {...} }`
**Response 404:** `{ "error": "Candidate not found" }`

---

### 7.3.2 Jobs

#### `GET /api/jobs`

List jobs with pagination, search, and filtering.

**Query Parameters:**

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `page` | integer | 1 | Page number |
| `pageSize` | integer | 100 | Results per page (1-200) |
| `search` | string | — | Multi-word search (AND-of-ORs across title, location, department) |
| `type` | string | — | Filter by job type (FULL_TIME, PART_TIME, INTERNSHIP, CONTRACT) |
| `excludeType` | string | — | Exclude a job type (e.g., exclude INTERNSHIP for jobs page) |
| `internshipStatus` | string | — | Filter internships by status (DRAFT, ACTIVE, INACTIVE, FINISHED) |
| `department` | string | — | Filter by department (case-insensitive contains) |

**Response 200:** Paginated job list with pagination metadata.

---

#### `POST /api/jobs`

Create a new job or internship.

**Request Body** (validated via `CreateJobSchema`):

| Field | Type | Required |
|-------|------|----------|
| `title` | string | **Yes** |
| `description` | string | No |
| `department` | string | No |
| `location` | string | No |
| `country` | string | No |
| `type` | enum (JobType) | No (default: FULL_TIME) |
| `startDate` | ISO date string | No |
| `endDate` | ISO date string | No |
| `stipend` | string | No |
| `mentorName` | string | No |
| `mentorEmail` | email or "" | No |
| `isErasmus` | boolean | No |
| `internshipStatus` | enum (InternshipStatus) | No |
| `requiredLanguage` | string | No |
| `requiredLanguageLevel` | enum (CEFRLevel) | No |
| `requiredExperienceType` | string | No |
| `minYearsExperience` | integer (≥0) | No |
| `requiredEducationLevel` | enum (EducationLevel) | No |

**Side Effects:** Creates targeted notifications for eligible candidates (respects notification preferences).

**Response 201:** Created job object.

---

#### `GET /api/jobs/[id]`

**Path Parameters:** `id` (string)
**Response 200:** Job with match counts.
**Response 404:** `{ "error": "Job not found" }`

---

#### `PATCH /api/jobs/[id]`

**Path Parameters:** `id` (string)
**Request Body:** Same fields as POST, all optional. Additional: `status` (DRAFT, OPEN, CLOSED, ARCHIVED).
**Validated via `UpdateJobSchema`** (strict mode).
**Side Effects:** If internship transitions to ACTIVE → sends INTERNSHIP_POSTED notifications.
**Response 200:** Updated job object.

---

#### `POST /api/jobs/sync`

Trigger scraping of adidas careers portal.

**Config:** `maxDuration = 300` (5 minutes — long-running serverless function)

**Request Body:**

| Field | Type | Default |
|-------|------|---------|
| `maxPages` | number | 0 (all pages) |

**Response 200:**
```json
{
  "success": true,
  "scraped": 1019,
  "created": 950,
  "updated": 69,
  "failed": 0,
  "durationMs": 45000
}
```

---

### 7.3.3 Assessments

#### `GET /api/assessments`

**Query Parameters:**

| Parameter | Type |
|-----------|------|
| `status` | string (AssessmentStatus) |
| `candidateId` | string |

**Response 200:** Array of assessment objects.

---

#### `POST /api/assessments`

Create assessment and send magic link.

**Request Body** (validated via `CreateAssessmentSchema`):

| Field | Type | Required | Default |
|-------|------|----------|---------|
| `candidateId` | string | **Yes** | — |
| `jobId` | string | No | — |
| `templateId` | string | No | — |
| `type` | enum (AssessmentType) | **Yes** | — |
| `language` | string | **Yes** | — |
| `expiresInHours` | integer (1-168) | No | 48 |

**Side Effects:**
- Generates unique magic token (CUID)
- Updates candidate status to INVITED
- Sends magic link email via Resend

**Response 201:** Created assessment with magic token.

---

### 7.3.4 Applications

#### `POST /api/applications`

Apply to a job.

**Request Body:**

| Field | Type | Required |
|-------|------|----------|
| `jobId` | string | **Yes** |
| `candidateId` | string | **Yes** |

**Behavior:**
- New application → creates with status SUBMITTED, sends 2 notifications
- Already applied (withdrawn) → reactivates to SUBMITTED
- Already applied (active) → returns with `alreadyApplied: true`

**Response 201:** New application.
**Response 200:** Existing application (already applied).

---

#### `GET /api/applications?candidateId=...`

**Query Parameters:** `candidateId` (required)
**Response 200:** Array of candidate's applications with job details.

---

#### `PATCH /api/applications/[id]`

**Request Body:** `{ "action": "withdraw" }`
**Side Effects:** Sets status to WITHDRAWN, creates 2 notifications (candidate + HR).
**Response 200:** Updated application.

---

#### `GET /api/applications/all`

HR view: all applications with candidate and job details.

**Response 200:** Array of all applications in the system.

---

### 7.3.5 Notifications

#### `GET /api/notifications`

**Query Parameters:**

| Parameter | Type | Description |
|-----------|------|-------------|
| `role` | "candidate" \| "hr" | Notification scope |
| `candidateId` | string | Required when role=candidate |
| `unread` | "true" | Filter to unread only |
| `type` | string | Filter by NotificationType |
| `limit` | integer | Default 100 |
| `offset` | integer | Default 0 |

**Response 200 (candidate):**
```json
{
  "notifications": [
    {
      "id": "...",
      "type": "JOB_POSTED",
      "message": "...",
      "read": false,
      "createdAt": "...",
      "isPinned": false
    }
  ],
  "unreadCount": 5
}
```

Candidate notifications are enriched with `isPinned` from linked campaigns and sorted: pinned first, then by `createdAt` descending.

---

#### `PATCH /api/notifications`

Mark notification(s) as read.

**Request Body (single):** `{ "id": "notification-cuid" }`
**Request Body (bulk):** `{ "markAllRead": true, "candidateId": "...", "targetRole": "CANDIDATE" }`

**Response 200:** Updated notification or `{ "success": true }`.

---

### 7.3.6 Upload

#### `POST /api/upload`

Upload CV file(s) for parsing.

**Content-Type:** `multipart/form-data`
**Body:** Multiple files under the `"files"` key.

**Accepted formats:** PDF, DOCX, DOC, TXT (max 10MB each, max 500 files for batch)

**Response 202:** Processing result with job ID and parsed candidate data.

---

### 7.3.7 Export

#### `GET /api/export/candidates`

Export all candidates as a CSV file.

**Response 200:**
- Content-Type: `text/csv`
- Content-Disposition: `attachment; filename="candidates_export_2025-01-15.csv"`
- Body: Raw CSV data with candidate info, scores, languages, education.

---

### 7.3.8 Profile (Me)

#### `GET /api/me`

Get current candidate profile. Creates a demo profile if none exists.

**Response 200:** Profile object with personal info, documents, and preferences.

---

#### `PATCH /api/me`

Update current candidate profile.

**Request Body** (validated via `UpdateProfileSchema`):

| Field | Type |
|-------|------|
| `firstName` | string (min 1) |
| `lastName` | string (min 1) |
| `email` | email \| null |
| `phone` | string \| null |
| `location` | string \| null |
| `nationality` | string \| null |
| `linkedinUrl` | string \| null (empty → null) |
| `dateOfBirth` | string \| null (converted to Date) |
| `willingToRelocate` | boolean \| null |
| `availability` | enum \| null |
| `workModel` | enum \| null |
| `bio` | string (max 500) \| null |

**Response 200:** Updated profile.
**Response 400:** `{ "error": "Validation failed", "details": {...} }`

---

### 7.3.9 Analytics

#### `GET /api/analytics`

Get dashboard analytics data.

**Response 200:**
```json
{
  "overview": {
    "totalCandidates": 150,
    "openPositions": 45,
    "totalApplications": 320,
    "shortlisted": 28,
    "assessments": 15
  },
  "pipeline": [
    { "status": "NEW", "count": 50 },
    { "status": "PARSED", "count": 40 }
  ],
  "candidatesByCountry": [...],
  "topSkills": [...],
  "applicationsPerJob": [...],
  "applicationTrend": [...],
  "scoreDistribution": [
    { "range": "0-20", "count": 5 },
    { "range": "21-40", "count": 15 },
    { "range": "41-60", "count": 30 },
    { "range": "61-80", "count": 25 },
    { "range": "81-100", "count": 10 }
  ]
}
```

---

### 7.3.10 Scoring

#### `GET /api/scoring/weights`

Get the current active scoring weight configuration.

**Response 200:**
```json
{
  "id": "...",
  "experienceWeight": 30,
  "yearsWeight": 20,
  "educationWeight": 20,
  "locationWeight": 15,
  "languageWeight": 15,
  "isActive": true
}
```

---

#### `PUT /api/scoring/weights`

Update the active scoring weights.

**Request Body:**

| Field | Type | Range |
|-------|------|-------|
| `experienceWeight` | number | 0–100 |
| `yearsWeight` | number | 0–100 |
| `educationWeight` | number | 0–100 |
| `locationWeight` | number | 0–100 |
| `languageWeight` | number | 0–100 |

**Response 200:** Updated weights object.

---

#### `GET /api/scoring/presets`

List all saved scoring presets.

**Response 200:** Array of preset objects.

---

#### `POST /api/scoring/presets`

Create a new scoring preset.

**Request Body:**

| Field | Type | Required |
|-------|------|----------|
| `name` | string | **Yes** |
| `experienceWeight` | number | **Yes** |
| `yearsWeight` | number | **Yes** |
| `educationWeight` | number | **Yes** |
| `locationWeight` | number | **Yes** |
| `languageWeight` | number | **Yes** |

**Response 201:** Created preset.
**Response 409:** Preset with this name already exists.

---

#### `DELETE /api/scoring/presets/[id]`

Delete a scoring preset.

**Path Parameters:** `id` (string, CUID)
**Response 200:** `{ "success": true }`
**Response 404:** `{ "error": "Preset not found" }`

---

### 7.3.11 Candidates Rerank

#### `POST /api/candidates/rerank`

Re-score all candidates using custom weights without persisting the weight change. Used for live preview while adjusting scoring sliders.

**Request Body:**

| Field | Type | Required |
|-------|------|----------|
| `experienceWeight` | number | **Yes** |
| `yearsWeight` | number | **Yes** |
| `educationWeight` | number | **Yes** |
| `locationWeight` | number | **Yes** |
| `languageWeight` | number | **Yes** |

**Response 200:** Array of re-scored candidates sorted by new overall score descending.

---

## 7.4 Common Patterns

### Error Handling

Every API route follows this pattern:

```typescript
export async function GET(req: NextRequest) {
  try {
    // 1. Parse request
    // 2. Validate input (Zod)
    // 3. Call use case
    // 4. Return response
  } catch (error) {
    if (error instanceof NotFoundError) {
      return NextResponse.json({ error: error.message }, { status: 404 });
    }
    console.error("Error [context]:", error);
    return NextResponse.json({ error: "..." }, { status: 500 });
  }
}
```

### Validation Strategies

| Strategy | Used By |
|----------|---------|
| Zod `.parse()` (throws) | Candidate filters, job creation |
| Zod `.safeParse()` (returns result) | Profile updates — allows custom error formatting |
| Zod `.strict()` (rejects extra fields) | Update schemas — prevents mass-assignment |
| Manual validation | Simple checks (e.g., `if (!candidateId)`) |
