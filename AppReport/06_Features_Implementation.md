# 06 — Features Implementation

## Complete Feature-by-Feature Technical Documentation

---

## 6.1 Feature Status Matrix

| # | Feature | Status | Complexity |
|---|---------|--------|------------|
| 1 | CV Upload & Parsing Pipeline | ✅ Complete | High |
| 2 | CV Scoring Engine | ✅ Complete | Medium |
| 3 | Job-Candidate Matching Engine | ✅ Complete | Medium |
| 4 | Job Scraper (adidas Portal) | ✅ Complete | Medium |
| 5 | Job Management (CRUD + Search) | ✅ Complete | Medium |
| 6 | Internship Management (Lifecycle) | ✅ Complete | Medium |
| 7 | Job Application System | ✅ Complete | Medium |
| 8 | Candidate Self-Service Portal | ✅ Complete | Medium |
| 9 | Notification System (Dual-Role) | ✅ Complete | High |
| 10 | Promotional Campaigns (Rich Text) | ✅ Complete | High |
| 11 | Notification Preferences | ✅ Complete | Medium |
| 12 | Fields of Work (Department Filters) | ✅ Complete | Low |
| 13 | Language Assessment Framework | ⚠️ Partial | High |
| 14 | Candidate Deduplication | ✅ Complete | Medium |
| 15 | CSV Export | ✅ Complete | Low |
| 16 | Analytics Dashboard | ✅ Complete | High |
| 17 | Improvement Tracks | ❌ Placeholder | Medium |
| 18 | Bias Detection Module | ❌ Not Started | High |
| 19 | Scoring Weights & Presets | ✅ Complete | Medium |

---

## 6.2 Feature 1: CV Upload & Parsing Pipeline

### Overview

The system processes CV files (PDF, DOCX, TXT) into structured candidate records through a multi-stage pipeline. Two entry points exist: candidate self-upload (single file) and HR bulk upload (multiple files or ZIP archives).

### Pipeline Stages (9 Steps)

```
┌──────────┐    ┌──────────┐    ┌──────────┐    ┌──────────┐
│ 1. File  │───►│ 2. Store │───►│ 3. Text  │───►│ 4. Text  │
│ Validate │    │ Original │    │ Extract  │    │ Validate │
└──────────┘    └──────────┘    └──────────┘    └──────────┘
                                                      │
┌──────────┐    ┌──────────┐    ┌──────────┐    ┌─────▼────┐
│ 9. Score │◄───│ 8. Upsert│◄───│ 7. Dedup │◄───│ 5. LLM   │
│ Candidate│    │ to DB    │    │ Check    │    │ Parse    │
└──────────┘    └──────────┘    └──────────┘    └──────────┘
                                                      │
                                                ┌─────▼────┐
                                                │ 6. Schema│
                                                │ Validate │
                                                └──────────┘
```

#### Stage 1: File Validation
- Check MIME type against allowlist: `application/pdf`, `application/msword`, `application/vnd.openxmlformats-officedocument.wordprocessingml.document`, `text/plain`
- Check size ≤ 10 MB (`MAX_FILE_SIZE_MB`)
- Reject with `ValidationError` if invalid

#### Stage 2: File Storage
- Upload original file to `cvs/candidates/{timestamp}-{filename}` (or `cvs/bulk/...` for batch uploads)
- Uses `IStorageService` (Vercel Blob in production, local filesystem in development)
- Returns URL for the stored file

#### Stage 3: Text Extraction
- PDF → `unpdf` library extracts text content
- DOCX → `mammoth` library extracts text content
- TXT → Direct `Buffer.toString('utf-8')` conversion
- Returns `{ text, pageCount? }`

#### Stage 4: Text Validation
- Minimum text length check (50 characters for bulk uploads)
- Rejects empty or near-empty files

#### Stage 5: LLM Parsing
- Sends extracted text to Groq (Llama 3.3 70B) or OpenAI (GPT-4o) via `ICvParserService`
- Prompt instructs LLM to extract structured data as JSON:
  - Personal info: name, email, phone, location, country, LinkedIn URL
  - Experiences: job title, company, location, dates, current status, description
  - Education: institution, degree, field, dates, level
  - Languages: name + self-declared CEFR level
  - Skills: name + category (Technical/Soft Skill/Tool)
- Uses JSON mode (`response_format: { type: 'json_object' }`)

#### Stage 6: Schema Validation
- LLM output validated against `CvExtractionSchema` (Zod)
- **Retry on failure:** If validation fails, the same text is sent to the LLM again (one retry)
- If retry also fails → error thrown, file logged as failed

#### Stage 7: Deduplication Check (3-Tier)
- **Tier 1 (Email):** Exact email match → 100% confidence → merge with existing
- **Tier 2 (Name + Location):** First name + last name + location match → 85% confidence → merge, flag for review
- **Tier 3 (Name Only):** First name + last name (no location) → 50% confidence → create new, link as potential duplicate

#### Stage 8: Database Upsert
- **Existing candidate (dedup match):** Updates personal info + replaces ALL related records (experiences, education, languages, skills — delete old, insert new) in a single transaction
- **New candidate:** `createWithRelations()` — inserts candidate + all relations atomically

#### Stage 9: CV Scoring
- Calls `calculateCvScore()` domain service (see Feature 2)
- Updates candidate record with overall + component scores
- Sets candidate status to `PARSED`

### Bulk Upload (HR)

**Phase 1 — Preparation:**
1. Accept multiple files or ZIP archives
2. Expand ZIP files using JSZip (filter to valid extensions, skip directories and oversized files)
3. Check total ≤ 500 files (`MAX_BULK_FILES`)
4. Create `ParsingJob` record for tracking

**Phase 2 — Processing:**
1. Set job status to `PROCESSING`
2. Process each file through the 9-stage pipeline
3. 500ms throttle between files (LLM rate limit protection)
4. Track progress: `parsedFiles`, `failedFiles`, error log
5. **Cancellation support:** Check in-memory `cancelledJobs` Set before each file
6. Final status: `COMPLETED` (if any success) or `FAILED` (all failed)

### Error Handling
- Per-file errors are logged but don't halt the batch
- Error log stored as JSON in `ParsingJob.errorLog` with `{ file, error, timestamp }` entries
- Stale job recovery: `recoverStaleJobs(10)` marks PROCESSING jobs older than 10 minutes as FAILED

---

## 6.3 Feature 2: CV Scoring Engine

### Algorithm: Deterministic Weighted Composite

The scoring formula is a **4-component weighted sum** with no randomness — same input always produces the same output.

```
Overall Score = Σ (component_score × weight)
```

### Component Breakdown

| # | Component | Weight | Calculation | Range |
|---|-----------|--------|-------------|-------|
| 1 | Experience Relevance | **35%** | Clamped LLM relevance score (0-100) | 0–100 |
| 2 | Years of Experience | **25%** | `min(100, (years / 10) × 100)` — 10 years = perfect | 0–100 |
| 3 | Education Level | **20%** | Lookup table: PHD=100, MASTER=80, BACHELOR=60, VOCATIONAL=40, HIGH_SCHOOL=20, OTHER/null=30 | 20–100 |
| 4 | Location Match | **20%** | Exact=100, Substring=80, Unknown=50, Mismatch=0 | 0–100 |

### Scoring Examples

**Example A — Strong Candidate:**
- Experience: LLM rates 85/100 relevance → 85 × 0.35 = 29.75
- Years: 7 years → min(100, 70) = 70 × 0.25 = 17.5
- Education: MASTER → 80 × 0.20 = 16
- Location: Exact match → 100 × 0.20 = 20
- **Overall: 83/100**

**Example B — Junior Candidate:**
- Experience: LLM rates 40/100 → 40 × 0.35 = 14
- Years: 1 year → 10 × 0.25 = 2.5
- Education: BACHELOR → 60 × 0.20 = 12
- Location: Different city → 0 × 0.20 = 0
- **Overall: 29/100**

### Assessment Scoring (Language)

For language assessment results, a separate weighted formula:

| Sub-score | Default Weight |
|-----------|---------------|
| Grammar | 20% |
| Vocabulary | 20% |
| Clarity | 20% |
| Fluency | 20% |
| Customer Handling | 20% |

CEFR Level Estimation:

| Score Range | CEFR Level |
|-------------|-----------|
| ≥ 90 | C2 (Proficient) |
| ≥ 78 | C1 (Advanced) |
| ≥ 65 | B2 (Upper Intermediate) |
| ≥ 50 | B1 (Intermediate) |
| ≥ 35 | A2 (Elementary) |
| < 35 | A1 (Beginner) |

### Borderline Detection

Candidates with overall scores between **45–60** (inclusive) are flagged as borderline. These candidates are close to threshold and may benefit from improvement tracks.

### Design Decisions

| Decision | Rationale |
|----------|-----------|
| Deterministic formula over ML model | Transparency requirement — recruiters must understand and trust scores |
| 4 components only | Simplicity — each component maps to a real hiring consideration |
| Configurable weights (via value objects) | Weights can be adjusted without code changes |
| Per-component breakdown stored | Full audit trail; explains why a candidate scored high/low |

---

## 6.4 Feature 3: Job-Candidate Matching Engine

### Algorithm: Multi-Criteria Evaluation

The matching engine compares each candidate against a job's requirements across 4 independent criteria.

### Criteria Details

**Criterion 1: Location Match**
- No requirement → automatic pass (score: 100)
- No candidate location → automatic fail (score: 0)
- Substring match in either direction → pass (score: 100)
- Mismatch → fail (score: 0)

**Criterion 2: Language & CEFR Level**
- No required language → automatic pass (score: 100)
- Candidate doesn't speak the language → fail (score: 0)
- Has language, level unverified → pass with penalty (score: 70)
- CEFR level comparison:
  - Candidate ≥ required → pass (score: 100)
  - Below required → fail, score = `max(0, 100 - levelDifference × 25)`
  - Example: Required B2 (index 3), candidate has B1 (index 2) → score = 75

**Criterion 3: Experience**
- No requirement → automatic pass (score: 100)
- Sufficient years → pass (score: 100)
- Insufficient → fail, score = `(candidateYears / requiredYears) × 100`
- Example: Need 5 years, has 3 → score = 60

**Criterion 4: Education Level**
- No requirement → automatic pass (score: 100)
- Level hierarchy: HIGH_SCHOOL < VOCATIONAL < BACHELOR < MASTER < PHD
- Meets or exceeds → pass (score: 100)
- Below → fail, score = `(candidateIndex / requiredIndex) × 100`

### Overall Score & Eligibility

- **Overall Match Score:** Simple average of all 4 criterion scores
- **Eligibility:** A candidate is eligible **only if ALL 4 criteria are met** (`met: true` for each)
- **Persistence:** Each match is stored with full breakdown (JSON) for transparency

### Orchestration Flow (in Job Use Cases)

```
1. Load job with requirements
2. Load all eligible candidates (status ≠ NEW, not duplicates)
3. For each candidate:
   a. Map candidate data to match input format
   b. Call matchCandidateToJob() — pure domain function
   c. Persist result via upsertMatch()
4. Sort by overallScore DESC
5. Return ranked list with breakdowns
```

---

## 6.5 Feature 4: Job Scraper (adidas Careers Portal)

### Target
- URL: `https://jobs.adidas-group.com`
- Platform: SuccessFactors (SAP HR system)
- Content: Server-side HTML tables (no JavaScript rendering needed)

### Implementation

**Technology:** Cheerio (jQuery-like HTML parser for Node.js)

**Pagination:**
- 50 results per page (`RESULTS_PER_PAGE = 50`)
- `startrow` URL parameter controls page offset
- Total results parsed from page text via regex: `RESULTS?\s+\d+\s*[–-]\s*\d+\s+OF\s+([\d,]+)`
- 1500ms delay between page fetches (rate limiting)

**HTML Parsing:**
Each job listing is a `<tr>` with 4 `<td>` cells:

| Cell | Content | Extraction |
|------|---------|-----------|
| 0 | Title + Link | CSS selector `a.jobTitle-link` or `a[href*="/job/"]` → text = title, href = source URL |
| 1 | Location | Raw text, e.g., "Miami, FL, US" |
| 2 | Department | Raw text, e.g., "Retail" |
| 3 | Date posted | Not extracted |

**Data Enrichment:**
- `extractCountry(location)` — Walks comma-separated parts backwards, returns first 2-letter uppercase match
- `cleanLocation(location)` — Strips trailing country codes, keeps city + region
- `deriveExternalId(urlPath, title)` — Priority: numeric ID from URL → URL slug → title hash

**Deduplication:** Uses a `Set<string>` of external IDs to prevent duplicates across pages.

**Result:** 1,019 unique jobs scraped across 21 departments in 50+ countries.

### Sync Integration (Job Use Cases)

```typescript
syncJobsFromCareerSite(maxPages: 5)
  1. scrapeJobs(5)   → ScrapedJob[]
  2. For each: upsertByExternalId(externalId, data)
  3. Returns: { scraped, created, updated, failed, durationMs }
```

---

## 6.6 Feature 5: Job Management

### CRUD Operations

| Operation | Endpoint | Method | Details |
|-----------|----------|--------|---------|
| List | `/api/jobs` | GET | Paginated, searchable, filterable by type/department/internshipStatus |
| Create | `/api/jobs` | POST | Validated against `CreateJobSchema`, auto-notifies eligible candidates |
| Get | `/api/jobs/[id]` | GET | Full job with match counts |
| Update | `/api/jobs/[id]` | PUT | Validated against `UpdateJobSchema` (strict mode — rejects extra fields) |
| Sync | `/api/jobs/sync` | POST | Triggers scraper for adidas portal |

### Search Algorithm (Multi-Word AND-of-ORs)

When a user searches "Berlin Marketing":
1. Split into tokens: ["Berlin", "Marketing"]
2. Each token must match at least one of: title, location, department (case-insensitive)
3. Combined with AND: both tokens must match
4. Prisma query: nested `AND[OR[contains title, contains location, contains department]]`

### Notification Side-Effects on Job Creation

When a new job is created (or internship activated):
1. Load all candidates with preferences
2. Filter by notification type preference (job vs internship)
3. Filter by country preference (`onlyMyCountry`)
4. Filter by field of work preference (`fieldFilters`)
5. Create targeted notifications for each matching candidate

---

## 6.7 Feature 6: Internship Management

### Lifecycle State Machine

```
DRAFT → ACTIVE → INACTIVE → FINISHED
                     ↑
                     └─ (can reactivate)
```

| Status | Description | Candidate Visibility |
|--------|-------------|---------------------|
| DRAFT | Created but not published | Not visible |
| ACTIVE | Open for applications | Visible + accepting applications |
| INACTIVE | Temporarily closed | Not visible |
| FINISHED | Completed | Not visible |

### Internship-Specific Fields

| Field | Purpose |
|-------|---------|
| `startDate` / `endDate` | Internship duration |
| `stipend` | Free-text (e.g., "€800/month") |
| `mentorName` / `mentorEmail` | Assigned supervisor |
| `isErasmus` | Erasmus program flag |
| `internshipStatus` | Lifecycle state |

### Erasmus Support

- Internships can be flagged as `isErasmus = true`
- Candidates applying to Erasmus internships can upload a **Learning Agreement** PDF
- Stored in `JobApplication.learningAgreementUrl`

---

## 6.8 Feature 7: Job Application System

### Application Flow

```
Candidate applies → SUBMITTED → UNDER_REVIEW → INVITED → ASSESSED → SHORTLISTED
                                                                      ↓
                                                                   REJECTED
                        ↕ (reversible)
                     WITHDRAWN
```

### Key Behaviors

| Scenario | Behavior |
|----------|----------|
| First application | Creates application (SUBMITTED) + 2 notifications (HR + candidate confirmation) |
| Already applied (non-withdrawn) | Returns existing application with `alreadyApplied: true` — no duplicate |
| Already applied (withdrawn) | Reactivates to SUBMITTED + new notifications |
| Withdrawal | Status → WITHDRAWN + 2 notifications (candidate confirmation + HR alert) |
| Status change by HR | Updates status + candidate notification |

### Unique Constraint

`@@unique([jobId, candidateId])` enforces one application per candidate per job at the database level.

### Notification Side-Effects

All notification creation is wrapped in try-catch — notification failures never block the primary operation (application create/update/withdraw).

---

## 6.9 Feature 8: Candidate Self-Service Portal

### Capabilities

1. **CV Upload + Inline Editing:**
   - Upload CV → system parses → candidate reviews ALL extracted fields
   - Edit any incorrect data (name, experiences, education, languages, skills)
   - Save updates → data persisted with replaced relations

2. **Profile Management:**
   - Edit personal info: nationality, availability, work model, bio
   - Date of birth, willingness to relocate
   - All updates validated against `UpdateCandidateSchema` with `.strict()` mode

3. **Job/Internship Browsing:**
   - Search with multi-word queries
   - Filter by department (16 standardized fields from real data)
   - One-click apply

4. **Application Tracking:**
   - View all submitted applications with status
   - Withdraw applications with confirmation

5. **Notification Preferences:**
   - Toggle job/internship/promotional notifications
   - Country filter: only receive jobs from my country
   - Field of work filter: only receive relevant department notifications

### Demo Mode

For academic demonstration, the system creates a demo candidate profile via `/api/me` — no full authentication system is needed.

---

## 6.10 Feature 9: Notification System

### Architecture

The notification system supports **dual-role** delivery: the same infrastructure serves both HR users and candidates.

### Notification Types (16)

| Target | Type | Trigger |
|--------|------|---------|
| Candidate | `JOB_POSTED` | New job matching preferences |
| Candidate | `INTERNSHIP_POSTED` | New internship matching preferences |
| Candidate | `APPLICATION_RECEIVED` | Confirmation after applying |
| Candidate | `APPLICATION_STATUS_CHANGED` | HR updates application status |
| Candidate | `APPLICATION_WITHDRAWN` | Confirmation of withdrawal |
| Candidate | `ASSESSMENT_INVITE` | Language assessment created |
| HR | `HR_APPLICATION_RECEIVED` | Candidate applies to any job |
| HR | `HR_APPLICATION_WITHDRAWN` | Candidate withdraws application |
| HR | `HR_CV_UPLOADED` | New CV uploaded to talent pool |
| Both | `PROMOTIONAL` | Campaign notification |

### Scoped Queries

- **Candidate view:** `findForCandidate(candidateId, filters?)` — only their notifications
- **HR view:** `findForHR(filters?)` — only HR-targeted notifications
- **Unread count:** `countUnread(candidateId?, targetRole?)` — badge count in sidebar

### Read/Unread Management

- Individual: `markAsRead(notificationId)` — updates `read = true`
- Batch: `markAllAsRead(candidateId?, targetRole?)` — marks all matching as read

---

## 6.11 Feature 10: Promotional Campaigns

### Rich Text Editing (TipTap)

HR users compose campaign content using a full rich text editor with 8 extensions:

| Extension | Capability |
|-----------|-----------|
| StarterKit | Bold, italic, headings, lists, code blocks, blockquotes |
| Link | Clickable URLs with auto-detect |
| Image | Inline images (URL-based) |
| Underline | Text underline |
| TextAlign | Left, center, right, justify alignment |
| TextStyle | Inline style support |
| Color | Text color picker (any hex color) |
| Placeholder | "Write your campaign content here..." |

### Campaign Lifecycle

```
DRAFT → (edit, preview) → SENT
  ↓
CANCELLED
```

### Targeting System

| Criteria | Description |
|----------|-------------|
| Target All | Send to every candidate (default) |
| Country Filter | Restrict to specific countries |
| Field of Work Filter | Restrict to candidates interested in specific departments |
| Education Level Filter | Restrict by education level |
| Email Targeting | Target specific individuals by email |

### Sending Process

1. Validate campaign status is `DRAFT`
2. Load all candidates (for notification delivery)
3. For each candidate:
   - Check `promotionalNotifications` preference (skip if opted out)
   - If not `targetAll`: apply country, field, education, email filters
4. Create notifications in batches of 500
5. Mark campaign as `SENT` with timestamp, sender, and recipient count

### Analytics

- **Read stats:** `getCampaignReadStats(campaignId)` → `{ total, read }` — raw count of sent vs read
- Preview audience count before sending

### Advanced Features

| Feature | Description |
|---------|-------------|
| Schedule Send | `scheduledAt` field for future delivery |
| Pin to Top | `isPinned` flag — pinned campaigns appear first in candidate notification feed |
| Clone/Duplicate | Create a copy of an existing campaign as new DRAFT |

---

## 6.12 Feature 11: Notification Preferences

### Per-Candidate Configuration

| Preference | Default | Effect |
|------------|---------|--------|
| `jobNotifications` | `true` | Receive alerts for new job postings |
| `internshipNotifications` | `true` | Receive alerts for new internships |
| `onlyMyCountry` | `false` | Only receive jobs/internships in candidate's country |
| `fieldFilters` | `[]` (all) | Only receive notifications for selected departments |
| `promotionalNotifications` | `true` | Receive HR promotional campaigns |

### Targeting Algorithm

Used by both system notifications (new job posted) and campaign sending:

```
for each candidate:
  1. Load preferences (or use defaults if none set)
  2. Check notification type toggle (job/internship/promotional)
  3. If onlyMyCountry: compare candidate.country to job.country
  4. If fieldFilters non-empty: check job.department ∈ fieldFilters
  5. If all checks pass → include in recipients
```

---

## 6.13 Feature 12: Fields of Work

### Data Origin

16 standardized departments consolidated from 21 raw department values extracted from 1,019 scraped adidas job openings.

### Consolidation

| Raw Values | Standardized |
|------------|-------------|
| "Retail", "Retail (Store)" | "Retail" |
| "Finance", "Accounting & Finance" | both kept separately |
| "Supply Chain" (4 variants) | "Supply Chain" |
| null, "Administrative" | removed |

### Usage Points

| Location | How Used |
|----------|---------|
| Jobs page filter dropdown | Filter jobs by department |
| Internships page filter dropdown | Filter internships by department |
| Settings page (candidate prefs) | Select preferred field of work |
| Campaign targeting (notifications) | Multi-select department targeting |
| Notification delivery | Check candidate field preferences |

### Constant Definition

Defined in `src/client/lib/constants.ts` as `FIELDS_OF_WORK` — a sorted array of 16 department strings used across all UI components.

---

## 6.14 Feature 13: Language Assessment Framework

### Status: Partially Built

The assessment data model and API infrastructure are complete, but the actual assessment execution flow is not fully implemented.

### What's Built

- **Assessment creation:** HR creates assessment → generates magic token → updates candidate status to INVITED
- **Magic link system:** `/assess/[token]` public page validates token and loads assessment context
- **Assessment types:** LISTENING_WRITTEN, SPEAKING, READING_ALOUD, COMBINED
- **Assessment status lifecycle:** PENDING → IN_PROGRESS → SUBMITTED → SCORED → REVIEWED / EXPIRED
- **Result model:** 5 sub-scores + overall score + CEFR estimation + borderline flag
- **Template system:** Reusable assessment configurations with custom weights
- **Email delivery:** Magic link sent via Resend with candidate name and expiry info

### What's Not Yet Implemented

- Audio recording for speaking assessments
- Whisper STT integration for transcript generation
- AI scoring of written/spoken responses
- Real-time assessment timer
- Assessment result review workflow

---

## 6.15 Feature 14: Candidate Deduplication

### 3-Tier Confidence System

| Tier | Criteria | Confidence | Action |
|------|----------|------------|--------|
| 1 | Email exact match | 100% | Merge: update existing candidate, replace relations |
| 2 | First + Last + Location | 85% | Merge: update existing, flag for review |
| 3 | First + Last only | 50% | New record with `isDuplicate=true`, `duplicateOf` set |
| — | No match | — | Create new record |

### Implementation

The `IDeduplicationRepository` provides lookup methods:
- `findByEmail(email)` — exact match on unique email field
- `findByNameAndLocation(firstName, lastName, location)` — fuzzy match
- `findByName(firstName, lastName)` — broad match

These are called in priority order during the CV parsing pipeline. The first match wins.

---

## 6.16 Feature 15: CSV Export

### Export Pipeline

1. Load all candidates with relations via `findForExport()`
2. Map to flat CSV-friendly structure
3. Generate CSV using papaparse (`Papa.unparse()`)
4. Return as downloadable response with `Content-Disposition: attachment` header

### Exported Fields

Candidate personal info, scores (overall + components), status, language summary, education summary, experience count, years of experience.

---

## 6.17 Feature 16: Analytics Dashboard

The analytics dashboard provides HR managers with real-time aggregate statistics across the entire talent pipeline.

### Architecture

The analytics feature follows the same Onion Architecture as all other features:
- **Domain port:** `IAnalyticsRepository` defines 7 query methods
- **Infrastructure:** `PrismaAnalyticsRepository` implements all queries using Prisma `groupBy`, `count`, and `findMany`
- **Application:** `AnalyticsUseCases.getDashboardAnalytics()` orchestrates all 7 queries in parallel via `Promise.all()`
- **API route:** `GET /api/analytics` delegates to the use-case and returns JSON

### Dashboard Metrics (7 Data Sections)

| # | Metric | Query Type | Details |
|---|--------|-----------|----------|
| 1 | **Overview Cards** | `count()` × 5 | Total candidates, open positions, total applications, shortlisted count, assessment count |
| 2 | **Candidate Pipeline** | `groupBy(status)` | Count per status, ordered: NEW → PARSED → SCREENED → ... → HIRED |
| 3 | **Candidates by Country** | `groupBy(country)` | Top 10 countries by candidate count |
| 4 | **Top Skills** | `groupBy(skill.name)` | Top 15 most common skills |
| 5 | **Applications per Job** | `groupBy(jobId)` | Top 10 jobs by application count, enriched with job titles |
| 6 | **Application Trend** | `groupBy(createdAt)` | Daily application count over the last 30 days |
| 7 | **Score Distribution** | `groupBy(overallCvScore)` | Bucketed into 5 ranges: 0–20, 21–40, 41–60, 61–80, 81–100 |

### Performance

All 7 queries run in parallel (`Promise.all`), minimizing response time even with large datasets.

---

## 6.18 Feature 17: Improvement Tracks (Placeholder)

Database models exist (`ImprovementTrack` + `ImprovementProgress`), but the UI and business logic are placeholder only.

### Design
- 14-day improvement program for borderline candidates (score 45-60)
- Daily lessons with progress tracking
- Reassessment link after completion
- Status lifecycle: ENROLLED → IN_PROGRESS → COMPLETED → REASSESSMENT_PENDING → REASSESSED

---

## 6.19 Feature 19: Scoring Weights & Presets

### Overview

HR managers can customize the CV scoring formula by adjusting component weights in real time. Changes instantly re-rank the entire candidate list without reloading.

### Configurable Weights (5 Dimensions)

| Dimension | Default Weight | Slider Range |
|-----------|---------------|-------------|
| Experience Relevance | 30% | 0–100% |
| Years of Experience | 20% | 0–100% |
| Education Level | 20% | 0–100% |
| Location Match | 15% | 0–100% |
| Language Proficiency | 15% | 0–100% |

Weights are **automatically normalized** to sum to 100%. Adjusting one weight proportionally reduces others.

### Quick Presets (Built-In)

| Preset | Focus |
|--------|-------|
| Balanced | Equal weight across all dimensions |
| Experience-focused | Prioritizes work experience relevance and duration |
| Education-focused | Prioritizes educational qualifications |
| Language-focused | Prioritizes language proficiency scores |
| Location-focused | Prioritizes geographic proximity |

### Custom Presets

HR users can **save custom weight configurations** as named presets:
1. Adjust sliders to desired weights
2. Enter a preset name and click Save
3. Preset appears in the grid for one-click reuse
4. Custom presets can be deleted via the trash icon

### Data Model

| Model | Key Fields | Purpose |
|-------|-----------|---------|
| `ScoringWeights` | `experienceWeight`, `yearsWeight`, `educationWeight`, `locationWeight`, `languageWeight`, `isActive` | Stores the current active weight configuration |
| `ScoringPreset` | `name`, same weight fields | Stores saved presets for reuse |

### API Endpoints

| Method | Endpoint | Purpose |
|--------|----------|---------|
| GET | `/api/scoring/weights` | Get current active weights |
| PUT | `/api/scoring/weights` | Update active weights |
| GET | `/api/scoring/presets` | List all saved presets |
| POST | `/api/scoring/presets` | Create a new preset |
| DELETE | `/api/scoring/presets/[id]` | Delete a preset |

### Rerank Endpoint

`POST /api/candidates/rerank` — Accepts custom weights in the request body and returns all candidates re-scored with those weights, without persisting the change. Used for live preview while adjusting sliders.

---

## 6.20 Cross-Cutting Feature: Dual-Role System

The entire application serves two user personas through a single codebase:

| Aspect | HR View | Candidate View |
|--------|---------|---------------|
| Dashboard Home | Recruitment metrics, quick actions | Personal profile, CV upload |
| Navigation | Talent Pool, Jobs, Assessments, Notifications, Analytics | My Profile, Jobs, Internships, Applications, Notifications, Settings |
| Notifications | HR-targeted system alerts | Candidate-targeted alerts + promotions |
| Jobs | Full management (CRUD) + matching | Browse + apply |
| CV Upload | Bulk upload for talent pool | Self-upload with inline editing |

Role selection happens client-side via a context provider (`role-provider.tsx`). The sidebar navigation and dashboard layout adapt based on the selected role.
