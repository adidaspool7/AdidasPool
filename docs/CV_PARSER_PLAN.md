# CV Parser — Implementation Plan

> **Feature**: Structured CV parsing, storage, and display  
> **Status**: Phase 1 ~95% Complete — candidate self-upload pipeline is fully functional  
> **Last updated**: 2026-03-10

---

## 1. Overview

The CV Parser is a core feature that extracts structured data from uploaded CVs (PDF, DOCX, TXT) and stores it in the database so HR can consult candidate information directly in the platform. It supports two entry points:

| Flow | Actor | Input | Volume |
|------|-------|-------|--------|
| **Self-upload** | Candidate | Single CV file via profile/application | 1 file at a time |
| **Bulk upload** | HR | Single CV or ZIP archive | Up to 500 files per batch |

---

## 2. Parsing Strategy

### The Core Problem

CVs come in wildly different formats — PDFs with tables, multi-column layouts, DOCX with custom styling, scanned images, creative designs. No single regex or template approach can reliably extract structured data from all of them.

### Recommended Approach: Two-Stage Pipeline

```
File → [Stage 1: Text Extraction] → Raw Text → [Stage 2: LLM Structuring] → Structured JSON
```

#### Stage 1 — Text Extraction (file → raw text)

Convert the binary file into clean plaintext. Different strategies per format:

| Format | Library | Notes |
|--------|---------|-------|
| **PDF** (text-based) | `unpdf` (npm) | Uses Mozilla's pdf.js under the hood. Pure JS, Vercel-compatible. ✅ Implemented. |
| **PDF** (scanned/image) | `unpdf` fallback → OCR flag | If `unpdf` returns <50 chars, flag as "needs OCR". Phase 2: integrate Tesseract.js or an external OCR API. |
| **DOCX** | `mammoth` (npm) | Extracts raw text from .docx. Handles formatting, tables, lists reliably. ✅ Implemented. |
| **DOC** (legacy) | `mammoth` or convert via LibreOffice | Rare but possible. For v1, reject .doc and accept .docx only. |
| **TXT** | Native `File.text()` / Buffer | Direct read, no conversion needed. |

**Why not a single all-in-one library?** Libraries like Apache Tika (Java) or `textract` (Python) are heavy and require system-level dependencies. For a Node.js/Vercel deployment, `unpdf` + `mammoth` covers 95%+ of real-world CVs with zero native dependencies.

> **Implementation note (2026-03-10):** We chose `unpdf` over `pdf-parse` because `pdf-parse` has a stale transitive dependency on an old `pdf.js` fork. `unpdf` wraps the latest Mozilla pdf.js and is actively maintained.

#### Stage 2 — LLM Structuring (raw text → JSON)

> **Already implemented** in `OpenAiCvParserService.parseCvText()` — uses the OpenAI SDK with a custom `baseURL` pointing to Groq.

The raw text is sent to **Groq Llama 3.3 70B** (primary, free tier) via the OpenAI-compatible API, with JSON mode enabled and a detailed system prompt that instructs extraction of: name, email, phone, location, experiences, education, languages, and skills. **OpenAI GPT-4o** is configured as a fallback when Groq is unavailable.

**Why LLM instead of regex/NLP?** CVs have no standard schema. Section headings vary ("Work Experience" vs "Professional Background" vs "Berufserfahrung"). Dates appear in dozens of formats. An LLM handles all of this without brittle rules.

**Quality safeguards:**
- Post-validate LLM output against `CvExtractionSchema` (Zod 4, `.strict()` mode) — already defined in DTOs
- If validation fails, retry once with a stricter prompt
- If still invalid, mark the file as `FAILED` with an error log

---

## 3. Architecture

### 3.1 Data Flow — Candidate Self-Upload

```
Candidate uploads CV
        │
        ▼
  POST /api/upload/candidate
        │
        ▼
  Validate (type, size ≤10MB)
        │
        ▼
  Upload to IStorageService → rawCvUrl
  (LocalStorageService in dev / VercelBlobStorageService in prod)
        │
        ▼
  Extract text (unpdf / mammoth)
        │
        ▼
  Parse via Groq Llama 3.3 70B → CvExtractionResult
        │
        ▼
  Validate with CvExtractionSchema
        │
        ▼
  Upsert Candidate + related records
  (Experience, Education, Language, Skill)
        │
        ▼
  Store rawCvText + parsedData JSON
        │
        ▼
  Calculate CV scores (scoring.service.ts)
        │
        ▼
  Return success + parsed preview
```

This is **synchronous** — the candidate waits a few seconds and sees their parsed profile immediately. A single file processed in ~3-8 seconds is acceptable UX.

### 3.2 Data Flow — HR Bulk Upload

```
HR uploads CV(s) or ZIP
        │
        ▼
  POST /api/upload
        │
        ▼
  Validate files (type, size, count ≤500)
        │
        ▼
  Create ParsingJob (status: QUEUED)
        │
        ▼
  Upload all files to IStorageService
        │
        ▼
  Return 202 + parsingJobId (async from here)
        │
        ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─
        │  Background processing begins
        ▼
  If ZIP → extract individual files
        │
        ▼
  For each file (sequential or batched):
    ├─ Extract text
    ├─ Deduplication check (email/name/phone)
    ├─ Parse via Groq / GPT-4o fallback
    ├─ Validate extraction
    ├─ Upsert Candidate + relations
    ├─ Score CV
    └─ Update ParsingJob progress
        │
        ▼
  Mark ParsingJob COMPLETED/FAILED
        │
        ▼
  HR polls /api/upload/[jobId] for progress
```

### 3.3 Background Processing Strategy

For v1, we have two options:

| Option | Mechanism | Pros | Cons |
|--------|-----------|------|------|
| **A — Vercel Function + polling** | Process files in a long-running serverless function (up to 300s on Pro). HR polls a status endpoint. | No extra infra. Simple. | 300s limit. ~40 CVs max per batch at ~7s each. |
| **B — BullMQ + Redis** | Queue each file as a job. A worker process (or separate Vercel cron) picks them up. | Scales to 500+ files. Retry logic. Real progress tracking. | Requires Redis (Upstash). More complexity. |

**Recommendation**: Start with **Option A** for v1 (covers batches up to ~30-40 CVs). Move to **Option B** when bulk uploads exceed that threshold.

---

## 4. What Needs To Be Built

### 4.1 Infrastructure Layer (new)

| Component | File | Description |
|-----------|------|-------------|
| `TextExtractionService` | `src/server/infrastructure/extraction/text-extraction.service.ts` | ✅ **Implemented.** Accepts a `Buffer` + MIME type, returns raw text. Uses `unpdf` for PDFs, `mammoth` for DOCX, direct read for TXT. |
| `VercelBlobStorageService` | `src/server/infrastructure/storage/vercel-blob-storage.service.ts` | ✅ **Implemented.** Wraps `@vercel/blob` for `uploadFile()` and `deleteFile()`. Used in production. |
| `LocalStorageService` | `src/server/infrastructure/storage/local-storage.service.ts` | ✅ **Implemented.** Writes to `public/uploads/`. Auto-selected in dev by DI container. |
| `ZipExtractorService` | `src/server/infrastructure/extraction/zip-extractor.service.ts` | ❌ **Not built.** Phase 2. |

### 4.2 Domain Layer (new port + updates)

| Component | File | Description |
|-----------|------|-------------|
| `ITextExtractionService` | `src/server/domain/ports/services.ts` | ✅ **Implemented.** Port: `extractText(buffer: Buffer, mimeType: string): Promise<string>` |
| `IZipExtractorService` | `src/server/domain/ports/services.ts` | ❌ **Not built.** Phase 2. Port: `extract(buffer: Buffer): Promise<ExtractedFile[]>` |
| `IParsingJobRepository` | `src/server/domain/ports/repositories.ts` | ❌ **Not built.** Port defined but no implementation. Phase 2. |

### 4.3 Application Layer (new + rewrite)

| Component | File | Description |
|-----------|------|-------------|
| `UploadUseCases` (rewrite) | `src/server/application/use-cases/upload.use-cases.ts` | ✅ **Implemented (candidate flow).** Full orchestration: validate → store → extract text → parse → upsert → score. HR bulk upload method is still a stub. |
| `ParsingJobUseCases` | `src/server/application/use-cases/parsing-job.use-cases.ts` | ❌ **Not built.** Phase 2. |

### 4.4 API Routes

| Endpoint | Method | Actor | Description |
|----------|--------|-------|-------------|
| `/api/upload/candidate` | `POST` | Candidate | ✅ **Implemented.** Single CV upload. Synchronous response with parsed data. |
| `/api/upload` | `POST` | HR | ❌ **Stub.** Single or ZIP upload. Returns `202` + `parsingJobId`. |
| `/api/upload/[jobId]` | `GET` | HR | ❌ **Not built.** Poll parsing job progress. |
| `/api/upload/[jobId]` | `GET` | HR | ❌ **Not built.** Get parsing job details including error logs. |

### 4.5 Frontend Pages

| Page | Actor | Description |
|------|-------|-------------|
| **Candidate CV Upload** | Candidate | ✅ **Implemented.** Drag-and-drop zone (single file). Shows parsing progress spinner, then parsed data preview with inline editing. Saves to profile on confirm. |
| **HR Bulk Upload** | HR | ❌ **Placeholder.** Drag-and-drop zone with upload history table. Phase 2. |
| **HR Candidate Detail** | HR | ⚠️ **Partial.** Exists at `/dashboard/candidates/[id]`. Needs enhancement to show full parsed CV data, timeline, and download link. |

### 4.6 Container Wiring

Update `src/server/container.ts` to register:
- ✅ `TextExtractionService` → `ITextExtractionService` — done
- ✅ `LocalStorageService` / `VercelBlobStorageService` → `IStorageService` — done (auto-selected by env)
- ❌ `ZipExtractorService` → `IZipExtractorService` — Phase 2
- ❌ `PrismaParsingJobRepository` → `IParsingJobRepository` — Phase 2

Update `src/server/application/index.ts` to inject new dependencies into `UploadUseCases`. ✅ Done for candidate flow.

---

## 5. Database — What Already Exists

The Prisma schema already has the right models. No schema changes needed for v1:

```
Candidate
  ├── rawCvUrl        → Link to original file (LocalStorageService in dev / Vercel Blob in prod)
  ├── rawCvText       → Extracted plaintext (Stage 1 output)
  ├── parsedData      → Full JSON from LLM (Stage 2 output)
  ├── overallCvScore  → Calculated by scoring.service.ts
  ├── sourceType      → "CV_UPLOAD" | "MANUAL" | "SCRAPED"
  ├── isDuplicate     → Dedup flag
  ├── duplicateOf     → Reference to original candidate
  │
  ├── Experience[]    → Parsed work history entries
  ├── Education[]     → Parsed education entries
  ├── CandidateLanguage[] → Languages + CEFR levels
  └── Skill[]         → Extracted skills with categories

ParsingJob
  ├── status          → QUEUED | PROCESSING | COMPLETED | FAILED
  ├── totalFiles      → Files in batch
  ├── parsedFiles     → Successfully processed count
  ├── failedFiles     → Failed count
  ├── errorLog        → JSON array of per-file errors
  ├── uploadedBy      → Who initiated the upload
  └── fileName        → Original filename or ZIP name
```

---

## 6. NPM Dependencies To Add

| Package | Purpose | Size | Status |
|---------|---------|------|--------|
| `unpdf` | PDF text extraction (wraps Mozilla pdf.js) | ~50KB | ✅ Installed (v1.4) |
| `mammoth` | DOCX text extraction | ~300KB | ✅ Installed (v1.11) |
| `jszip` | ZIP file extraction | ~100KB | ❌ Not installed (Phase 2) |
| `@vercel/blob` | Vercel Blob storage SDK | ~50KB | ✅ Installed (v2.3.1) |

> **Note:** The original plan called for `pdf-parse`, but we switched to `unpdf` due to `pdf-parse`'s stale dependency on an old pdf.js fork. `unpdf` is actively maintained and Vercel-compatible.

---

## 7. LLM Parsing — Prompt Engineering Notes

The existing prompt in `cv-parser.service.ts` is solid. Key enhancements for robustness:

1. **Multi-language support** — CVs may be in Portuguese, German, English, etc. Add instruction: *"Extract information regardless of the CV's language. Always return field values in their original language except for standardized fields (country codes, CEFR levels)."*

2. **Confidence scoring** — Ask the LLM to return a `confidence: number` (0-1) per field so we can flag uncertain extractions for HR review.

3. **Fallback fields** — If a section is missing entirely (e.g., no education listed), return an empty array rather than inventing data. The current prompt already handles this but should be explicit.

4. **Token budget** — Average CV text: ~1,500-3,000 tokens. Groq Llama 3.3 70B response: ~500-1,000 tokens. **Cost per CV: $0.00** (Groq free tier). Fallback via GPT-4o: ~$0.01-0.02 per CV.

---

## 8. Deduplication Strategy

Already scaffolded in `IDeduplicationRepository`. The matching logic should:

1. **Exact match** on email (strongest signal)
2. **Fuzzy match** on first name + last name + phone (for CVs without email)
3. **Threshold**: If match confidence >80%, mark as duplicate and link via `duplicateOf`
4. **HR override**: Duplicates are flagged but not blocked — HR can merge or dismiss

---

## 9. Error Handling & Edge Cases

| Scenario | Handling |
|----------|----------|
| Corrupted PDF | `unpdf` throws → catch, log, mark file as FAILED with reason "Unreadable PDF" |
| Scanned/image PDF | `unpdf` returns <50 chars → log as "Image-based PDF — OCR not yet supported", mark FAILED |
| Password-protected file | `unpdf` throws specific error → mark FAILED with "Password-protected file" |
| LLM returns invalid JSON | Zod validation fails → retry once with stricter prompt → if still invalid, mark FAILED |
| LLM rate limit / timeout | Exponential backoff (1s, 2s, 4s) → max 3 retries → mark FAILED |
| Duplicate candidate | Flag as `isDuplicate`, link `duplicateOf`, don't create duplicate relations |
| Empty CV / no extractable content | Mark FAILED with "No content could be extracted" |
| File exceeds 10MB | Reject at upload validation, return 400 |
| ZIP contains >500 files | Reject at validation, return 400 |
| ZIP contains nested ZIPs | Flatten one level only. Reject deeper nesting. |

---

## 10. Implementation Phases

### Phase 1 — Single CV Upload (Candidate Flow)
> **Scope**: Candidate uploads 1 CV → synchronous parse → data stored  
> **Effort**: ~2-3 days

- [x] Install `unpdf`, `mammoth`, `@vercel/blob`
- [x] Implement `TextExtractionService` (PDF + DOCX + TXT)
- [x] Implement `LocalStorageService` (dev) + `VercelBlobStorageService` (prod)
- [x] Add `ITextExtractionService` port
- [x] Rewrite `UploadUseCases.uploadCandidateCv()` — full sync pipeline
- [x] Create `POST /api/upload/candidate` route
- [x] Build candidate upload UI (drag-and-drop + parsed data preview + inline editing)
- [x] Wire new services into container

### Phase 2 — HR Bulk Upload
> **Scope**: HR uploads single or ZIP → async processing → progress tracking  
> **Effort**: ~3-4 days

- [ ] Install `jszip`
- [ ] Implement `ZipExtractorService`
- [ ] Implement `PrismaParsingJobRepository`
- [ ] Add `IParsingJobRepository` and `IZipExtractorService` ports
- [ ] Rewrite `UploadUseCases.uploadBulkCvs()` — async pipeline
- [ ] Create `ParsingJobUseCases` (status, listing)
- [ ] Create `POST /api/upload` (bulk) and `GET /api/upload/[jobId]` routes
- [ ] Build HR upload UI (multi-file drop, job history table, progress bars)

### Phase 3 — Polish & Edge Cases
> **Scope**: Better error handling, dedup UI, candidate CV viewer for HR  
> **Effort**: ~2-3 days

- [ ] Enhance HR candidate detail page with full CV data display
- [ ] Implement deduplication merge UI
- [ ] Add download-original-CV button (Vercel Blob signed URL)
- [ ] Add retry mechanism for failed files
- [ ] Add parsing job error log viewer for HR

### Phase 4 — Scale (Future)
> **Scope**: BullMQ queues, OCR, batch optimization  
> **Effort**: TBD

- [ ] Migrate to BullMQ + Redis for batch processing >40 files (BullMQ + ioredis already installed as dependencies, not yet wired)
- [ ] Add OCR support for scanned PDFs (Tesseract.js or external API)
- [ ] Batch Groq/OpenAI calls with parallel processing (5 concurrent)
- [ ] Add webhook/SSE for real-time progress instead of polling

---

## 11. Security Considerations

- **File validation**: Check MIME type AND magic bytes (not just extension) to prevent disguised uploads
- **Size limits**: 10MB per file, enforced at both client and server
- **Blob storage**: In production, use Vercel Blob's built-in access controls; generate short-lived signed URLs for downloads. In dev, `LocalStorageService` writes to `public/uploads/` (served statically).
- **PII handling**: CV data contains personal information — ensure database encryption at rest (Neon provides this by default)
- **Rate limiting**: Limit uploads to prevent abuse (e.g., 10 uploads/minute per session)

---

## 12. Existing Code Inventory

| Component | Status | Location |
|-----------|--------|----------|
| `CvExtractionSchema` (Zod) | ✅ Done | `src/server/application/dtos.ts` |
| `CvExtractionResult` (type) | ✅ Done | `src/server/domain/ports/services.ts` |
| `ICvParserService` (port) | ✅ Done | `src/server/domain/ports/services.ts` |
| `OpenAiCvParserService` (Groq/GPT-4o) | ✅ Done | `src/server/infrastructure/ai/cv-parser.service.ts` — uses Groq Llama 3.3 70B via OpenAI SDK with custom baseURL |
| `IStorageService` (port) | ✅ Done | `src/server/domain/ports/services.ts` |
| `IDeduplicationRepository` (port) | ✅ Done | `src/server/domain/ports/repositories.ts` |
| `PrismaDeduplicationRepository` | ✅ Done | `src/server/infrastructure/database/` |
| `ScoringService` (CV scoring) | ✅ Done | `src/server/domain/services/scoring.service.ts` |
| `ParsingJob` (Prisma model) | ✅ Done | `prisma/schema.prisma` |
| `Candidate` model (CV fields) | ✅ Done | `prisma/schema.prisma` |
| File validation constants | ✅ Done | `src/server/domain/value-objects.ts` |
| `IStorageService` implementation | ✅ Done | `LocalStorageService` (dev) + `VercelBlobStorageService` (prod), both in `src/server/infrastructure/storage/` |
| `IParsingJobRepository` | ❌ Missing | Phase 2 — ParsingJob model exists in Prisma but no repository implementation |
| Text extraction (PDF/DOCX) | ✅ Done | `TextExtractionService` using `unpdf` + `mammoth` |
| ZIP extraction | ❌ Missing | Phase 2 — `jszip` not yet installed |
| Upload orchestration | ✅ Candidate flow | `UploadUseCases.uploadCandidateCv()` is fully implemented. HR bulk upload is still a stub. |
| Upload UI | ✅ Candidate flow | Drag-and-drop with parsed preview, inline editing, save to profile. HR upload page is a placeholder. |
