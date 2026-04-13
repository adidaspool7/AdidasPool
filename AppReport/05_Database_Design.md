# 05 — Database Design

## Schema, Models, Relationships & Design Decisions

---

## 5.1 Database Overview

| Attribute | Detail |
|-----------|--------|
| Engine | PostgreSQL 17.2 (local) / Neon Serverless (production) |
| ORM | Prisma 6.19.2 |
| Schema File | `prisma/schema.prisma` |
| Models | 21 |
| Enums | 15 |
| ID Strategy | CUID (`@default(cuid())`) |
| Timestamps | `createdAt` (auto), `updatedAt` (auto via `@updatedAt`) |

### Why Relational?

The domain is inherently relational:
- A **Candidate** has many **Experiences**, **Education** entries, **Languages**, and **Skills**
- A **Job** has many **Applications**, **Matches**, and **Assessments**
- A **Notification** belongs to either a **Candidate** or targets **HR** users
- A **PromoCampaign** generates many **Notifications**

Document databases (MongoDB) would require denormalization, manual joins, and sacrifice referential integrity.

### Why CUIDs over UUIDs?

CUIDs are chosen as primary keys:
- **Sortable** — CUIDs are roughly time-ordered (unlike UUIDv4)
- **Collision-resistant** — Safe for distributed generation
- **URL-friendly** — Shorter than UUIDs, safe in URLs
- **No sequential exposure** — Unlike auto-increment, CUIDs don't reveal record counts

---

## 5.2 Entity-Relationship Overview

```
Candidate ──┬── 1:N ──→ Experience
             ├── 1:N ──→ Education
             ├── 1:N ──→ CandidateLanguage
             ├── 1:N ──→ Skill
             ├── 1:N ──→ CandidateTag
             ├── 1:N ──→ CandidateNote
             ├── 1:N ──→ Assessment
             ├── 1:N ──→ ImprovementTrack
             ├── 1:N ──→ JobMatch
             ├── 1:N ──→ JobApplication
             ├── 1:N ──→ Notification
             └── 1:1 ──→ NotificationPreference

Job ─────────┬── 1:N ──→ Assessment
             ├── 1:N ──→ JobMatch
             ├── 1:N ──→ JobApplication
             ├── 1:N ──→ AssessmentTemplate
             └── 1:N ──→ Notification

Assessment ──┬── 1:1 ──→ AssessmentResult
             └── N:1 ──→ AssessmentTemplate

ImprovementTrack ── 1:N ──→ ImprovementProgress

PromoCampaign (standalone — linked via Notification.campaignId)
ParsingJob (standalone — tracks bulk upload pipeline)
```

---

## 5.3 Model Details

### 5.3.1 Candidate (Central Entity)

The core entity around which the entire system revolves. Contains 22+ fields across several categories.

| Field Group | Fields | Purpose |
|-------------|--------|---------|
| **Identity** | `firstName`, `lastName`, `email` (unique), `phone`, `location`, `country`, `linkedinUrl` | Extracted from CV |
| **Profile** | `dateOfBirth`, `nationality`, `willingToRelocate`, `availability`, `workModel`, `bio` | Self-declared by candidate |
| **CV Data** | `rawCvUrl`, `rawCvText`, `parsedData` (JSON) | Raw and processed CV data |
| **Documents** | `motivationLetterUrl`, `motivationLetterText`, `learningAgreementUrl` | Uploaded supplementary files |
| **Scoring** | `overallCvScore`, `experienceScore`, `educationScore`, `locationScore`, `yearsOfExperience` | Deterministic CV scores |
| **Classification** | `status` (enum), `sourceType` (enum), `isDuplicate`, `duplicateOf` | Pipeline status and dedup |

**Indexes:** `email`, `status`, `overallCvScore`, `country` — optimized for common filter queries.

**Design Decision — `parsedData` as JSON:**
The full LLM extraction result is stored as a JSON column alongside the normalized relational data (experiences, education, etc.). This provides:
1. An audit trail of what the LLM originally produced
2. Quick access to the full parsed output without joining multiple tables
3. Fallback data if relational records are modified

### 5.3.2 Experience

| Field | Type | Purpose |
|-------|------|---------|
| `jobTitle` | String | Position title |
| `company` | String? | Employer name |
| `location` | String? | Job location |
| `startDate` | String? | Start date (stored as string — CV dates vary: "2020", "Jan 2020", "01/2020") |
| `endDate` | String? | End date |
| `isCurrent` | Boolean | Currently in this role |
| `description` | String? | Role description |
| `isRelevant` | Boolean? | AI-classified relevance to target roles |
| `relevanceScore` | Float? | 0-100 relevance score |
| `relevanceReason` | String? | LLM explanation of classification |

**Design Decision — Dates as Strings:**
CV dates are notoriously inconsistent ("2020", "Jan 2020", "01/2020", "Summer 2019"). Storing as `String?` avoids parse errors during extraction. The scoring engine handles date math through fuzzy parsing.

**Design Decision — AI Classification Fields:**
`isRelevant`, `relevanceScore`, and `relevanceReason` store the LLM's assessment of each experience entry's relevance. This data feeds into the CV scoring algorithm and provides transparency.

### 5.3.3 Education

| Field | Type | Purpose |
|-------|------|---------|
| `institution` | String? | School/university name |
| `degree` | String? | Degree title |
| `fieldOfStudy` | String? | Major/specialization |
| `startDate` | String? | Start date |
| `endDate` | String? | End/graduation date |
| `level` | EducationLevel? | Standardized education level |

**Enum `EducationLevel`:** `HIGH_SCHOOL`, `BACHELOR`, `MASTER`, `PHD`, `VOCATIONAL`, `OTHER`

### 5.3.4 CandidateLanguage

| Field | Type | Purpose |
|-------|------|---------|
| `language` | String | Language name (e.g., "English", "German") |
| `selfDeclaredLevel` | CEFRLevel? | What the candidate claims on their CV |
| `assessedLevel` | CEFRLevel? | What the assessment determined |

**Unique Constraint:** `@@unique([candidateId, language])` — one entry per language per candidate.

**Design Decision — Two-Level Tracking:**
The dual fields (`selfDeclaredLevel` vs `assessedLevel`) enable the core platform purpose: comparing what candidates claim about their language ability against verified assessment results.

**Enum `CEFRLevel`:** `A1`, `A2`, `B1`, `B2`, `C1`, `C2` — the Common European Framework of Reference for Languages.

### 5.3.5 Job

| Field Group | Fields | Purpose |
|-------------|--------|---------|
| **Core** | `title`, `description`, `department`, `location`, `country` | Basic job information |
| **Type** | `type` (enum JobType) | FULL_TIME, PART_TIME, INTERNSHIP, CONTRACT |
| **Internship** | `startDate`, `endDate`, `stipend`, `mentorName`, `mentorEmail`, `isErasmus`, `internshipStatus` | Fields active only for internship-type jobs |
| **External** | `externalId` (unique), `sourceUrl` | Scraped job data from adidas portal |
| **Requirements** | `requiredLanguage`, `requiredLanguageLevel`, `requiredExperienceType`, `minYearsExperience`, `requiredEducationLevel` | Matching criteria |
| **Status** | `status` (enum JobStatus) | DRAFT, OPEN, CLOSED, ARCHIVED |

**Design Decision — Single Table Inheritance for Job Types:**
Instead of separate `Job` and `Internship` tables, internships are stored in the `Job` table with `type = INTERNSHIP` and additional nullable fields (`startDate`, `endDate`, `stipend`, etc.). This simplifies:
- Application logic (one `applyToJob` method works for both)
- Matching (same algorithm applies)
- Querying (filter by `type` rather than joining)

The tradeoff is nullable internship fields on non-internship jobs, accepted as pragmatic for the project's scale.

**Design Decision — `externalId` for Scraped Jobs:**
Jobs scraped from the adidas portal receive an `externalId` (URL slug). The `upsertByExternalId` method prevents duplicates when re-running the scraper — it updates existing records rather than creating duplicates.

### 5.3.6 JobApplication

| Field | Type | Purpose |
|-------|------|---------|
| `jobId` | String | FK to Job |
| `candidateId` | String | FK to Candidate |
| `status` | ApplicationStatus | SUBMITTED → UNDER_REVIEW → INVITED → ASSESSED → SHORTLISTED / REJECTED / WITHDRAWN |
| `notes` | String? | Internal notes |
| `learningAgreementUrl` | String? | Erasmus learning agreement upload |

**Unique Constraint:** `@@unique([jobId, candidateId])` — one application per candidate per job.

**Enum `ApplicationStatus`:** Defines the full application lifecycle: `SUBMITTED`, `UNDER_REVIEW`, `INVITED`, `ASSESSED`, `SHORTLISTED`, `REJECTED`, `WITHDRAWN`.

### 5.3.7 JobMatch

| Field | Type | Purpose |
|-------|------|---------|
| `jobId` | String | FK to Job |
| `candidateId` | String | FK to Candidate |
| `matchScore` | Float | Overall match percentage (0-100) |
| `breakdown` | Json? | Per-criterion breakdown (location, language, experience, education) |

**Unique Constraint:** `@@unique([jobId, candidateId])` — one match record per candidate-job pair.

**Design Decision — `breakdown` as JSON:**
The match breakdown is a complex nested structure (4 criteria, each with score + matched + details). Storing as JSON avoids creating another normalized table while providing full transparency into how the score was calculated.

### 5.3.8 Assessment

| Field | Type | Purpose |
|-------|------|---------|
| `candidateId` | String | FK to Candidate |
| `jobId` | String? | Optional FK to Job |
| `templateId` | String? | Optional FK to template |
| `magicToken` | String (unique) | Magic link token for public access |
| `expiresAt` | DateTime | Token expiry (default: 48 hours) |
| `accessedAt` | DateTime? | When candidate first opened the link |
| `type` | AssessmentType | LISTENING_WRITTEN, SPEAKING, READING_ALOUD, COMBINED |
| `status` | AssessmentStatus | PENDING → IN_PROGRESS → SUBMITTED → SCORED → REVIEWED / EXPIRED |
| `language` | String | Language being assessed |

**Design Decision — Magic Link Authentication:**
Candidates access assessments via unique token URLs (e.g., `/assess/abc123def`), eliminating the need for a full authentication system. The token is validated server-side with expiry checking.

### 5.3.9 AssessmentResult

One-to-one with Assessment. Contains:

| Score Component | Type | Weight |
|----------------|------|--------|
| `grammarScore` | Float? | 20% |
| `vocabularyScore` | Float? | 20% |
| `clarityScore` | Float? | 20% |
| `fluencyScore` | Float? | 20% |
| `customerHandlingScore` | Float? | 20% |
| `overallScore` | Float? | Weighted composite |
| `cefrEstimation` | CEFRLevel? | Mapped from overall score |
| `isBorderline` | Boolean | Score between 45-60 |

Plus: `audioUrl`, `transcript`, `candidateText`, `feedbackSummary`, `rawAiResponse` (JSON for transparency).

### 5.3.10 AssessmentTemplate

Reusable assessment configuration: instructions, audio URLs, reading texts, prompts, duration, and per-criterion scoring weights.

### 5.3.11 ImprovementTrack + ImprovementProgress

14-day improvement program for borderline candidates.

| Model | Key Fields |
|-------|-----------|
| `ImprovementTrack` | `language`, `targetLevel` (CEFRLevel), `status` (TrackStatus), `startDate`, `endDate` |
| `ImprovementProgress` | `day` (1-14), `title`, `content`, `isCompleted` — one entry per day per track |

**Unique Constraint:** `@@unique([trackId, day])` — exactly one progress entry per day.

### 5.3.12 Notification

| Field | Type | Purpose |
|-------|------|---------|
| `type` | NotificationType | 16 distinct types across system + promotional |
| `message` | String | Notification text (or HTML for campaign notifications) |
| `read` | Boolean | Read/unread state |
| `targetRole` | String? | "CANDIDATE", "HR", or null (global) |
| `jobId` | String? | Related job |
| `candidateId` | String? | Target candidate |
| `applicationId` | String? | Related application |
| `campaignId` | String? | Source campaign |

**Enum `NotificationType` (16 values):**

| Category | Types |
|----------|-------|
| Candidate-facing | `JOB_POSTED`, `INTERNSHIP_POSTED`, `JOB_STATE_CHANGED`, `APPLICATION_RECEIVED`, `APPLICATION_STATUS_CHANGED`, `APPLICATION_WITHDRAWN`, `ASSESSMENT_INVITE`, `ASSESSMENT_COMPLETED` |
| HR-facing | `HR_APPLICATION_RECEIVED`, `HR_APPLICATION_WITHDRAWN`, `HR_ASSESSMENT_COMPLETED`, `HR_CV_UPLOADED` |
| Promotional | `PROMOTIONAL` |
| Legacy | `CV_UPLOADED`, `STATUS_CHANGE` |

### 5.3.13 NotificationPreference

One-to-one with Candidate. Controls what notifications a candidate receives.

| Field | Type | Purpose |
|-------|------|---------|
| `jobNotifications` | Boolean (default true) | Receive new job alerts |
| `internshipNotifications` | Boolean (default true) | Receive new internship alerts |
| `onlyMyCountry` | Boolean (default false) | Only receive jobs in my country |
| `fieldFilters` | String[] | Department filter (empty = all departments) |
| `promotionalNotifications` | Boolean (default true) | Receive promotional campaigns |

**Design Decision — `fieldFilters` as String Array:**
PostgreSQL arrays provide a simple, queryable mechanism for storing a candidate's preferred departments without requiring a junction table. Prisma supports array fields natively.

### 5.3.14 PromoCampaign

| Field | Type | Purpose |
|-------|------|---------|
| `title` | String | Campaign title |
| `body` | String | Rich text content (HTML from TipTap editor) |
| `imageUrl` | String? | Optional image |
| `linkUrl` | String? | Optional CTA link |
| `isPinned` | Boolean | Pinned campaigns appear at top |
| `targetAll` | Boolean | Target all candidates |
| `targetCountries` | String[] | Country filter |
| `targetFields` | String[] | Department/field filter |
| `targetEducation` | String[] | Education level filter |
| `targetEmails` | String[] | Individual email targeting |
| `scheduledAt` | DateTime? | Future send time |
| `status` | CampaignStatus | DRAFT, SENT, CANCELLED |
| `recipientCount` | Int? | Number of recipients when sent |

### 5.3.15 ParsingJob

Tracks the progress of bulk CV upload operations.

| Field | Type | Purpose |
|-------|------|---------|
| `status` | ParsingJobStatus | QUEUED → PROCESSING → COMPLETED / FAILED |
| `totalFiles` | Int | Number of files in batch |
| `parsedFiles` | Int | Successfully parsed so far |
| `failedFiles` | Int | Failed to parse |
| `errorLog` | Json? | Array of error entries (file, error, timestamp) |
| `uploadedBy` | String? | Who initiated the upload |
| `fileName` | String? | Original upload filename |

### 5.3.16 ScoringWeights

Stores the active CV scoring weight configuration used by the HR candidates evaluation page.

| Field | Type | Default | Purpose |
|-------|------|---------|---------|
| `experienceWeight` | Float | 30 | Weight for experience relevance component |
| `yearsWeight` | Float | 20 | Weight for years of experience component |
| `educationWeight` | Float | 20 | Weight for education level component |
| `locationWeight` | Float | 15 | Weight for location match component |
| `languageWeight` | Float | 15 | Weight for language proficiency component |
| `isActive` | Boolean | true | Only one active configuration at a time |

**Design Decision — Single Active Row:**
Only one `ScoringWeights` row should be active at a time (`isActive = true`). The API ensures this by deactivating others before activating a new configuration.

### 5.3.17 ScoringPreset

Stores saved scoring configurations that HR can recall with one click.

| Field | Type | Purpose |
|-------|------|---------|
| `name` | String (unique) | User-given preset name (e.g., "Technical Roles") |
| `experienceWeight` | Float | Saved experience weight |
| `yearsWeight` | Float | Saved years weight |
| `educationWeight` | Float | Saved education weight |
| `locationWeight` | Float | Saved location weight |
| `languageWeight` | Float | Saved language weight |

**Unique Constraint:** `name` is unique — prevents duplicate preset names.

---

## 5.4 Index Strategy

| Model | Indexed Fields | Purpose |
|-------|---------------|---------|
| Candidate | `email`, `status`, `overallCvScore`, `country` | Search, filter, sort operations |
| Experience | `candidateId` | Relation loading |
| Education | `candidateId` | Relation loading |
| CandidateLanguage | `candidateId` + unique(`candidateId`, `language`) | Relation loading + prevent duplicates |
| Skill | `candidateId` | Relation loading |
| CandidateTag | `candidateId` + unique(`candidateId`, `tag`) | Relation loading + prevent duplicates |
| CandidateNote | `candidateId` | Relation loading |
| Job | `status`, `externalId`, `type` | Filter by type, dedup on scrape |
| JobApplication | `jobId`, `candidateId`, `status` + unique(`jobId`, `candidateId`) | Queries + prevent double-apply |
| JobMatch | `jobId`, `candidateId`, `matchScore` + unique(`jobId`, `candidateId`) | Ranking query + dedup |
| Assessment | `candidateId`, `jobId`, `magicToken`, `status` | Token lookup, status filter |
| ImprovementTrack | `candidateId`, `status` | Candidate progress lookup |
| ImprovementProgress | `trackId` + unique(`trackId`, `day`) | Daily progress + prevent duplicates |
| Notification | `candidateId`, `targetRole`, `read`, `createdAt`, `type` | Multi-dimensional filtering |
| PromoCampaign | `status` | Campaign management |
| ParsingJob | `status` | Pipeline monitoring |

---

## 5.5 Cascade Delete Strategy

All child records cascade-delete when their parent is removed:

| Parent → Child | onDelete |
|----------------|----------|
| Candidate → Experience | Cascade |
| Candidate → Education | Cascade |
| Candidate → CandidateLanguage | Cascade |
| Candidate → Skill | Cascade |
| Candidate → CandidateTag | Cascade |
| Candidate → CandidateNote | Cascade |
| Candidate → Assessment | Cascade |
| Candidate → ImprovementTrack | Cascade |
| Candidate → JobMatch | Cascade |
| Candidate → JobApplication | Cascade |
| Candidate → Notification | Cascade |
| Candidate → NotificationPreference | Cascade |
| Job → JobApplication | Cascade |
| Job → JobMatch | Cascade |
| Job → Notification | Cascade |
| Assessment → AssessmentResult | Cascade |
| ImprovementTrack → ImprovementProgress | Cascade |

**Rationale:** Deleting a candidate removes all their data — consistent with GDPR "right to be forgotten." Deleting a job removes all related applications and match records.

---

## 5.6 Migration History

The database schema evolved through iterative `prisma db push` and `prisma migrate dev` operations. Key migrations:

| Migration | Models Affected | Change |
|-----------|----------------|--------|
| Initial schema | 12 models | Core entities: Candidate, Job, Assessment, etc. |
| Internship support | Job | Added `type`, `startDate`, `endDate`, `stipend`, `mentorName`, `mentorEmail`, `isErasmus`, `internshipStatus` |
| Applications | JobApplication | New model for candidate-to-job applications |
| Notifications v2 | Notification, NotificationPreference, PromoCampaign | Full notification system with preferences and campaigns |
| Fields of work | NotificationPreference | Added `fieldFilters` array field |
| Parsing pipeline | ParsingJob | Bulk upload tracking with progress and error log |

---

## 5.7 Data Volume (Current State)

| Entity | Approximate Records | Source |
|--------|-------------------|--------|
| Jobs | 1,019 | Scraped from adidas careers portal |
| Departments | 16 (standardized from 21 raw) | Extracted and consolidated from scraped jobs |
| Countries | 50+ | From scraped job locations |
| Candidates | Testing-scale | Created via CV upload and self-registration |
| Notifications | Testing-scale | System-generated + campaign notifications |
