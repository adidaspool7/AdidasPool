# CV Parsing Feature — Database Schema (Deep Explanation)

## Overview

The CV parsing pipeline involves **8 Prisma models** and **6 enums** that work together in a flow:

```
File Upload → ParsingJob tracking → Text Extraction → LLM Parsing →
Candidate (upsert) + Experience/Education/Language/Skill (relations) →
Deduplication check → Scoring → Status lifecycle
```

---

## 1. `ParsingJob` — Bulk Upload Tracker

```
┌───────────────────────────────────────────────────────┐
│ ParsingJob                                            │
├───────────────┬───────────────────────────────────────┤
│ id            │ cuid()  PK                            │
│ createdAt     │ DateTime  auto                        │
│ updatedAt     │ DateTime  auto                        │
│ status        │ ParsingJobStatus  → QUEUED (default)  │
│ totalFiles    │ Int  → 0                              │
│ parsedFiles   │ Int  → 0  (incremented per success)   │
│ failedFiles   │ Int  → 0  (incremented per failure)   │
│ errorLog      │ Json?  → [{file, error, timestamp}]   │
│ uploadedBy    │ String?  (HR recruiter name)           │
│ fileName      │ String?  (e.g. "batch_march.zip")     │
├───────────────┴───────────────────────────────────────┤
│ INDEX: status                                         │
└───────────────────────────────────────────────────────┘

ParsingJobStatus: QUEUED → PROCESSING → COMPLETED | FAILED
```

**Purpose:** Tracks a single HR bulk upload session. When an HR user uploads 50 CVs (or a ZIP), one `ParsingJob` is created. As each file is processed, `parsedFiles` or `failedFiles` increments. The frontend polls this record every 2 seconds to show a live progress bar.

**Lifecycle:**
1. `QUEUED` — Created immediately when HR submits files
2. `PROCESSING` — Background worker begins processing files one by one
3. `COMPLETED` — All files done (may still have `failedFiles > 0`)
4. `FAILED` — Every single file failed (zero successes)

**`errorLog` structure** (JSON array):
```json
[
  { "file": "john_doe.pdf", "error": "Image-based PDF, no extractable text", "timestamp": "2026-03-10T..." },
  { "file": "corrupt.docx", "error": "Could not extract meaningful text from file", "timestamp": "..." }
]
```

---

## 2. `Candidate` — Central Entity

```
┌───────────────────────────────────────────────────────────────────┐
│ Candidate                                                         │
├───────────────────┬───────────────────────────────────────────────┤
│                   │  IDENTITY (from CV extraction)                │
│ id                │  cuid()  PK                                   │
│ firstName         │  String  (required — LLM-extracted)           │
│ lastName          │  String  (required — LLM-extracted)           │
│ email             │  String?  @unique (dedup key #1)              │
│ phone             │  String?                                      │
│ location          │  String?  (e.g. "Porto, Portugal")            │
│ country           │  String?  (e.g. "Portugal")                   │
│ linkedinUrl       │  String?                                      │
├───────────────────┼───────────────────────────────────────────────┤
│                   │  PROFILE (self-declared by candidate)         │
│ dateOfBirth       │  DateTime?                                    │
│ nationality       │  String?                                      │
│ willingToRelocate │  Boolean?                                     │
│ availability      │  String?  ("Immediately","1 month", etc.)     │
│ workModel         │  WorkModel?  (REMOTE|HYBRID|ON_SITE)          │
│ bio               │  String?  (max 500 chars)                     │
├───────────────────┼───────────────────────────────────────────────┤
│                   │  CV RAW DATA                                  │
│ rawCvUrl          │  String?  (Blob URL to original PDF/DOCX)     │
│ rawCvText         │  String?  (full extracted plaintext)           │
│ parsedData        │  Json?    (complete LLM JSON output)          │
├───────────────────┼───────────────────────────────────────────────┤
│                   │  SCORING (deterministic, not AI black-box)    │
│ overallCvScore    │  Float?  (0-100 weighted composite)           │
│ experienceScore   │  Float?  (0-100)                              │
│ educationScore    │  Float?  (0-100)                              │
│ locationScore     │  Float?  (0-100)                              │
│ yearsOfExperience │  Float?  (calculated from experience dates)   │
├───────────────────┼───────────────────────────────────────────────┤
│                   │  CLASSIFICATION                               │
│ status            │  CandidateStatus  → NEW (default)             │
│ sourceType        │  CandidateSource  → EXTERNAL (default)        │
│ isDuplicate       │  Boolean  → false                             │
│ duplicateOf       │  String?  (reference to original candidate)   │
├───────────────────┴───────────────────────────────────────────────┤
│ INDEXES: email, status, overallCvScore, country                   │
│ RELATIONS: →Experience[], →Education[], →CandidateLanguage[],     │
│            →Skill[], →CandidateTag[], →CandidateNote[],           │
│            →Assessment[], →JobMatch[], →JobApplication[]          │
└───────────────────────────────────────────────────────────────────┘
```

**Data flow during CV parsing:**
1. **LLM extracts** `firstName`, `lastName`, `email`, `phone`, `location`, `country`, `linkedinUrl` → stored directly
2. **Original file** → stored in Vercel Blob → URL saved as `rawCvUrl`
3. **Extracted plaintext** → saved as `rawCvText` (useful for re-parsing later without re-extracting)
4. **Full LLM JSON** → saved as `parsedData` (complete snapshot for audit/debug)
5. **Status transitions:** `NEW` → `PARSED` (after successful CV parse)
6. **Dedup check:** if `email` matches existing candidate OR `firstName+lastName+location` matches, `isDuplicate=true` and `duplicateOf` points to the original

**Scoring weights** (defined in `value-objects.ts`):

| Component | Weight | Formula |
|---|---|---|
| Experience Relevance | **35%** | AI-classified relevance score (0-100) |
| Years of Experience | **25%** | `min(100, years/10 × 100)` — caps at 10+ years |
| Education Level | **20%** | HIGH_SCHOOL=20, VOCATIONAL=40, BACHELOR=60, MASTER=80, PHD=100 |
| Location Match | **20%** | 100 if Porto/Portugal, 75 same country, 50 EU, 25 other |

---

## 3. `Experience` — Work History (1:N from Candidate)

```
┌───────────────────────────────────────────────────────┐
│ Experience                                            │
├───────────────────┬───────────────────────────────────┤
│ id                │ cuid()  PK                        │
│ candidateId       │ FK → Candidate (CASCADE delete)   │
│ jobTitle          │ String  (required)                 │
│ company           │ String?                            │
│ location          │ String?                            │
│ startDate         │ String?  ("2020-01" format)        │
│ endDate           │ String?  (null = current)          │
│ isCurrent         │ Boolean → false                   │
│ description       │ String?                            │
│ isRelevant        │ Boolean? (AI classification)       │
│ relevanceScore    │ Float?   (0-100)                   │
│ relevanceReason   │ String?  ("Why relevant/not")      │
├───────────────────┴───────────────────────────────────┤
│ INDEX: candidateId                                    │
└───────────────────────────────────────────────────────┘
```

**Why `startDate`/`endDate` are `String?` not `DateTime?`:** CVs contain wildly inconsistent date formats — "Jan 2020", "2020", "Q1 2020", "2020-01". Storing as strings avoids lossy parsing at the DB level. The scoring service interprets them when calculating `yearsOfExperience`.

**AI classification fields (`isRelevant`, `relevanceScore`, `relevanceReason`):** After extraction, each experience is optionally classified by the LLM for relevance to adidas target roles (e.g., "customer service" experience scores higher). These feed into the `experienceScore` component.

**Cascade delete:** When a candidate is deleted, all their experiences are deleted. When a CV is re-uploaded, all experiences are **replaced** (delete all → recreate from new extraction).

---

## 4. `Education` — Academic Background (1:N from Candidate)

```
┌───────────────────────────────────────────────────────┐
│ Education                                             │
├───────────────────┬───────────────────────────────────┤
│ id                │ cuid()  PK                        │
│ candidateId       │ FK → Candidate (CASCADE delete)   │
│ institution       │ String?                            │
│ degree            │ String?  (e.g. "Master")           │
│ fieldOfStudy      │ String?  (e.g. "Business Admin")   │
│ startDate         │ String?                            │
│ endDate           │ String?                            │
│ level             │ EducationLevel?                    │
├───────────────────┴───────────────────────────────────┤
│ INDEX: candidateId                                    │
│ ENUM EducationLevel: HIGH_SCHOOL | BACHELOR | MASTER  │
│                      | PHD | VOCATIONAL | OTHER       │
└───────────────────────────────────────────────────────┘
```

**`level` enum purpose:** The LLM maps free-text degrees to a standardized enum (e.g., "MSc" → `MASTER`, "BSc" → `BACHELOR`). The scoring service uses `EDUCATION_LEVEL_SCORES` to convert this to a 0-100 score:

| Level | Score |
|---|---|
| `HIGH_SCHOOL` | 20 |
| `VOCATIONAL` | 40 |
| `BACHELOR` | 60 |
| `MASTER` | 80 |
| `PHD` | 100 |
| `OTHER` | 30 |

---

## 5. `CandidateLanguage` — Language Proficiency (1:N from Candidate)

```
┌───────────────────────────────────────────────────────┐
│ CandidateLanguage                                     │
├─────────────────────┬─────────────────────────────────┤
│ id                  │ cuid()  PK                      │
│ candidateId         │ FK → Candidate (CASCADE delete)  │
│ language            │ String  ("English", "German"…)   │
│ selfDeclaredLevel   │ CEFRLevel?  (from CV/profile)    │
│ assessedLevel       │ CEFRLevel?  (from assessment)    │
├─────────────────────┴─────────────────────────────────┤
│ UNIQUE: (candidateId, language)                       │
│ INDEX: candidateId                                    │
│ ENUM CEFRLevel: A1 | A2 | B1 | B2 | C1 | C2         │
└───────────────────────────────────────────────────────┘
```

**Two-level design:** A candidate claims "English C1" on their CV (`selfDeclaredLevel`). After taking a language assessment, the platform stores the verified result in `assessedLevel`. This enables HR to see gaps — e.g., claimed C1 but assessed B2.

**Unique composite key** `(candidateId, language)`: A candidate can only have one record per language. Re-uploading a CV replaces all language records.

---

## 6. `Skill` — Extracted Skills (1:N from Candidate)

```
┌───────────────────────────────────────────────────────┐
│ Skill                                                 │
├───────────────────┬───────────────────────────────────┤
│ id                │ cuid()  PK                        │
│ candidateId       │ FK → Candidate (CASCADE delete)   │
│ name              │ String  ("JavaScript", "Agile"…)   │
│ category          │ String? ("Technical","Soft Skill") │
├───────────────────┴───────────────────────────────────┤
│ INDEX: candidateId                                    │
└───────────────────────────────────────────────────────┘
```

**Category** is LLM-classified during extraction. Common values: `"Technical"`, `"Soft Skill"`, `"Tool"`, `"Methodology"`, `"Language"`. Used for grouping in the candidate detail UI.

---

## 7. `CandidateTag` — HR-Applied Labels (1:N from Candidate)

```
┌───────────────────────────────────────────────────────┐
│ CandidateTag                                          │
├───────────────────┬───────────────────────────────────┤
│ id                │ cuid()  PK                        │
│ candidateId       │ FK → Candidate (CASCADE delete)   │
│ tag               │ String  (e.g. "high-priority")     │
│ createdAt         │ DateTime  auto                    │
├───────────────────┴───────────────────────────────────┤
│ UNIQUE: (candidateId, tag)                            │
└───────────────────────────────────────────────────────┘
```

Not directly from CV parsing, but HR can tag candidates after parsing results are reviewed.

---

## 8. `CandidateNote` — HR Annotations (1:N from Candidate)

```
┌───────────────────────────────────────────────────────┐
│ CandidateNote                                         │
├───────────────────┬───────────────────────────────────┤
│ id                │ cuid()  PK                        │
│ candidateId       │ FK → Candidate (CASCADE delete)   │
│ author            │ String  (recruiter name)           │
│ content           │ String                             │
│ createdAt         │ DateTime  auto                    │
│ updatedAt         │ DateTime  auto                    │
├───────────────────┴───────────────────────────────────┤
│ INDEX: candidateId                                    │
└───────────────────────────────────────────────────────┘
```

HR adds notes after reviewing parsed CV data (e.g., "Strong candidate, schedule interview").

---

## Entity Relationship Diagram

```
                                ┌──────────────┐
                                │  ParsingJob   │
                                │  (bulk track) │
                                └──────────────┘
                                       │
                           creates one Candidate per file
                                       │
┌──────────┐    1:N    ┌──────────────┴──────────────┐    1:N    ┌──────────────┐
│Experience├───────────┤        CANDIDATE             ├──────────┤  Education    │
│(work hist│           │                              │          │  (academic)   │
│ + AI rel)│           │  identity ← LLM extraction   │          └──────────────┘
└──────────┘           │  rawCvUrl ← Blob storage     │
                       │  rawCvText ← text extraction  │    1:N    ┌──────────────┐
                       │  parsedData ← full LLM JSON   ├──────────┤  Candidate   │
                       │  scores ← deterministic calc  │          │  Language     │
                       │  status lifecycle             │          │  (self+assess)│
                       │  dedup flags                  │          └──────────────┘
                       │                              │
                       ├──────────────────────────────┤    1:N    ┌──────────────┐
                       │                              ├──────────┤    Skill      │
                       │                              │          │  (name + cat) │
                       │                              │          └──────────────┘
                       ├──────────────────────────────┤
                       │                              │    1:N    ┌──────────────┐
                       │                              ├──────────┤ CandidateTag │
                       │                              │          └──────────────┘
                       │                              │
                       │                              │    1:N    ┌──────────────┐
                       │                              ├──────────┤CandidateNote │
                       └──────────────────────────────┘          └──────────────┘
```

---

## Status Lifecycle (CandidateStatus enum)

```
NEW ──→ PARSED ──→ SCREENED ──→ INVITED ──→ ASSESSED ──┬──→ SHORTLISTED ──→ HIRED
  │        │                                            │
  │        │                                            ├──→ BORDERLINE ──→ ON_IMPROVEMENT_TRACK
  │        │                                            │
  └────────┴──── (at any point) ──→ REJECTED            └──→ REJECTED
```

| Status | Meaning |
|---|---|
| `NEW` | Candidate record created (before CV parsing) |
| `PARSED` | CV successfully extracted + parsed by LLM — **set automatically by the upload pipeline** |
| `SCREENED` | HR reviewed the parsed data |
| `INVITED` | Invited for language assessment |
| `ASSESSED` | Completed language assessment |
| `SHORTLISTED` | Passed threshold (score ≥ 60) |
| `BORDERLINE` | Score between 45-60 |
| `ON_IMPROVEMENT_TRACK` | Enrolled in 2-week improvement program |
| `REJECTED` | Did not meet criteria |
| `HIRED` | Successful hire |

---

## Key Constraints & Indexes

| Table | Constraint | Purpose |
|---|---|---|
| `Candidate.email` | `@unique` | Dedup key — no two candidates with same email |
| `CandidateLanguage(candidateId, language)` | `@@unique` | One record per language per candidate |
| `CandidateTag(candidateId, tag)` | `@@unique` | No duplicate tags per candidate |
| `Candidate.status` | `@@index` | Fast filtering by pipeline stage |
| `Candidate.overallCvScore` | `@@index` | Fast sorting by score |
| `Candidate.country` | `@@index` | Fast filtering by country |
| `Experience.candidateId` | `@@index` | Fast join on candidate detail |
| `ParsingJob.status` | `@@index` | Quick lookup of active jobs |

All FK relations use **`onDelete: Cascade`** — deleting a candidate removes all their experiences, education, languages, skills, tags, and notes.

---

## Pipeline Constants (from `value-objects.ts`)

| Constant | Value | Used For |
|---|---|---|
| `MAX_FILE_SIZE_MB` | 10 | Per-file upload limit |
| `MAX_BULK_FILES` | 500 | Max files in one bulk upload |
| `ALLOWED_CV_EXTENSIONS` | `.pdf, .doc, .docx, .txt` | File type validation |
| `BORDERLINE_THRESHOLD` | `{min: 45, max: 60}` | Score range for borderline classification |
