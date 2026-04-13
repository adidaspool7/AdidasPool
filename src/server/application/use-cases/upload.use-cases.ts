/**
 * CV Upload Use Cases
 *
 * ONION LAYER: Application
 * DEPENDENCIES: Domain ports (inward only)
 *
 * Orchestrates CV file uploads for both candidate self-upload
 * (synchronous) and HR bulk upload (async with ParsingJob tracking).
 */

import type {
  ICandidateRepository,
  IDeduplicationRepository,
  IParsingJobRepository,
} from "@server/domain/ports/repositories";
import type {
  ICvParserService,
  IStorageService,
  ITextExtractionService,
  CvExtractionResult,
} from "@server/domain/ports/services";
import { CvExtractionSchema } from "@server/application/dtos";
import type { CvExtraction } from "@server/application/dtos";
import {
  MAX_FILE_SIZE_MB,
  MAX_BULK_FILES,
  ALLOWED_CV_MIME_TYPES,
  ALLOWED_CV_EXTENSIONS,
} from "@server/domain/value-objects";
import { calculateCvScore } from "@server/domain/services/scoring.service";
import JSZip from "jszip";

// ─── Types ───────────────────────────────────────────────────────

/** Track cancelled job IDs so the processing loop can check and abort */
const cancelledJobs = new Set<string>();

export interface CandidateUploadResult {
  candidateId: string;
  status: "created" | "updated";
  extraction: CvExtractionResult;
  isDuplicate: boolean;
  duplicateOf: string | null;
  rawCvUrl: string;
}

export interface BulkFileEntry {
  name: string;
  type: string;
  size: number;
  buffer: Buffer;
}

export interface BulkUploadResult {
  jobId: string;
  totalFiles: number;
}

// ─── Use Cases ───────────────────────────────────────────────────

export class UploadUseCases {
  constructor(
    private readonly deduplicationRepo: IDeduplicationRepository,
    private readonly cvParserService: ICvParserService,
    private readonly storageService: IStorageService,
    private readonly textExtractionService: ITextExtractionService,
    private readonly candidateRepository: ICandidateRepository,
    private readonly parsingJobRepo: IParsingJobRepository
  ) {}

  // ─── Candidate Self-Upload (Synchronous) ─────────────────────

  /**
   * Full synchronous pipeline for a single candidate CV upload:
   * validate → store → extract text → parse with LLM → dedup → upsert candidate + relations
   *
   * @param file - The uploaded CV file (PDF, DOCX, or TXT)
   * @param candidateId - If the candidate already exists (updating their CV)
   */
  async uploadCandidateCv(
    file: File,
    candidateId?: string
  ): Promise<CandidateUploadResult> {
    // 1. Validate
    this.validateFile(file);

    // 2. Upload original to Vercel Blob
    const { url: rawCvUrl } = await this.storageService.uploadFile(
      file,
      `cvs/candidates/${Date.now()}-${file.name}`
    );

    // 3. Extract raw text from file
    const buffer = Buffer.from(await file.arrayBuffer());
    const { text: rawCvText } = await this.textExtractionService.extractText(
      buffer,
      file.type
    );

    // 4. Parse with LLM (GPT-4o)
    const rawExtraction = await this.cvParserService.parseCvText(rawCvText);

    // 5. Validate LLM output — use validated data (transforms normalize URLs etc.)
    const validation = CvExtractionSchema.safeParse(rawExtraction);
    let extraction;
    if (!validation.success) {
      // Retry once with the raw text (LLM may have hallucinated)
      const retryExtraction = await this.cvParserService.parseCvText(rawCvText);
      const retryValidation = CvExtractionSchema.safeParse(retryExtraction);
      if (!retryValidation.success) {
        throw new Error(
          `CV parsing failed validation after retry: ${retryValidation.error.message}`
        );
      }
      extraction = retryValidation.data;
    } else {
      extraction = validation.data;
    }

    // 6. Deduplication check
    const dedup = await this.deduplicationRepo.checkForDuplicate({
      email: extraction.email,
      firstName: extraction.firstName,
      lastName: extraction.lastName,
      location: extraction.location,
    });

    // 7. Upsert candidate + related records
    const resolvedCandidateId = candidateId ?? dedup.duplicateOf ?? undefined;
    const upsertedCandidate = await this.upsertCandidateFromExtraction(
      extraction,
      rawCvUrl,
      rawCvText,
      dedup.isDuplicate,
      dedup.duplicateOf,
      resolvedCandidateId,
      extraction // validated extraction with business area + confidence
    );

    return {
      candidateId: upsertedCandidate.id,
      status: resolvedCandidateId ? "updated" : "created",
      extraction,
      isDuplicate: dedup.isDuplicate,
      duplicateOf: dedup.duplicateOf,
      rawCvUrl,
    };
  }

  // ─── HR Bulk Upload ───────────────────────────────────────────

  /**
   * Phase 1: Accept files, extract from ZIP if needed, create ParsingJob.
   * Returns the job ID and extracted file entries for background processing.
   */
  async prepareBulkUpload(
    files: File[]
  ): Promise<{ jobId: string; fileEntries: BulkFileEntry[]; totalFiles: number }> {
    if (files.length === 0) {
      throw new ValidationError("No files provided");
    }

    // Extract individual CV files (expand ZIPs)
    const fileEntries = await this.extractFileEntries(files);

    if (fileEntries.length === 0) {
      throw new ValidationError(
        "No valid CV files found. Accepted formats: PDF, DOCX, TXT"
      );
    }

    if (fileEntries.length > MAX_BULK_FILES) {
      throw new ValidationError(
        `Too many files (${fileEntries.length}). Maximum: ${MAX_BULK_FILES}`
      );
    }

    // Create ParsingJob
    const zipFile = files.find((f) =>
      f.name.toLowerCase().endsWith(".zip") ||
      f.type === "application/zip" ||
      f.type === "application/x-zip-compressed"
    );
    const job = await this.parsingJobRepo.create({
      totalFiles: fileEntries.length,
      fileName: zipFile ? zipFile.name : `${files.length} files`,
    });

    return { jobId: job.id, fileEntries, totalFiles: fileEntries.length };
  }

  /**
   * Phase 2: Process each file entry — runs after response is sent (via after()).
   * Updates ParsingJob progress after each file.
   * Includes a configurable delay between files to respect LLM rate limits.
   * Checks for cancellation between files.
   */
  async processBulkUpload(jobId: string, fileEntries: BulkFileEntry[]) {
    await this.parsingJobRepo.updateStatus(jobId, "PROCESSING");

    // Throttle: 500ms delay between files to avoid burst rate limits (RPM/TPM)
    const THROTTLE_DELAY_MS = 500;

    for (let i = 0; i < fileEntries.length; i++) {
      // Check for cancellation before each file
      if (cancelledJobs.has(jobId)) {
        cancelledJobs.delete(jobId);
        console.log(`[BulkUpload] Job ${jobId} was cancelled by user.`);
        await this.parsingJobRepo.updateStatus(jobId, "FAILED");
        await this.parsingJobRepo.appendError(jobId, {
          file: "—",
          error: `Cancelled by user after processing ${i} of ${fileEntries.length} files`,
          timestamp: new Date().toISOString(),
        });
        return;
      }

      const entry = fileEntries[i];
      try {
        await this.processSingleBulkFile(entry);
        await this.parsingJobRepo.incrementParsed(jobId);
      } catch (error) {
        // Duplicate candidates are "skipped" not "failed" — still increment parsed
        if (error instanceof DuplicateSkipError) {
          await this.parsingJobRepo.appendError(jobId, {
            file: entry.name,
            error: error.message,
            type: "skipped",
            timestamp: new Date().toISOString(),
          });
          // Count as processed successfully (not a failure)
          await this.parsingJobRepo.incrementParsed(jobId);
        } else {
          await this.parsingJobRepo.incrementFailed(jobId);
          await this.parsingJobRepo.appendError(jobId, {
            file: entry.name,
            error: error instanceof Error ? error.message : "Unknown error",
            type: "error",
            timestamp: new Date().toISOString(),
          });
          console.error(`[BulkUpload] Failed to process ${entry.name}:`, error);
        }
      }

      // Throttle between files (skip after last file)
      if (i < fileEntries.length - 1) {
        await new Promise((resolve) => setTimeout(resolve, THROTTLE_DELAY_MS));
      }
    }

    // Determine final status
    const finalJob = await this.parsingJobRepo.findById(jobId);
    const allFailed = finalJob?.parsedFiles === 0 && finalJob?.failedFiles > 0;
    await this.parsingJobRepo.updateStatus(
      jobId,
      allFailed ? "FAILED" : "COMPLETED"
    );
  }

  /**
   * Get parsing job status for polling.
   */
  async getParsingJob(jobId: string) {
    const job = await this.parsingJobRepo.findById(jobId);
    if (!job) throw new ValidationError("Parsing job not found");
    return job;
  }

  /**
   * Get recent parsing jobs for history table.
   */
  async getRecentParsingJobs(limit = 20) {
    return this.parsingJobRepo.findRecent(limit);
  }

  /**
   * Cancel a running parsing job.
   * If the job is PROCESSING, signals the loop to stop after the current file.
   * If the job is QUEUED, immediately marks it as FAILED.
   */
  async cancelJob(jobId: string): Promise<{ cancelled: boolean }> {
    const job = await this.parsingJobRepo.findById(jobId);
    if (!job) throw new ValidationError("Parsing job not found");

    if (job.status === "PROCESSING") {
      // Signal the processing loop to stop
      cancelledJobs.add(jobId);
      return { cancelled: true };
    }

    if (job.status === "QUEUED") {
      await this.parsingJobRepo.updateStatus(jobId, "FAILED");
      await this.parsingJobRepo.appendError(jobId, {
        file: "—",
        error: "Cancelled by user before processing started",
        timestamp: new Date().toISOString(),
      });
      return { cancelled: true };
    }

    // Already COMPLETED or FAILED — nothing to cancel
    return { cancelled: false };
  }

  /**
   * Recover stale PROCESSING jobs (server crash / restart).
   * Marks them as FAILED so they don't stay "Processing" forever.
   */
  async recoverStaleJobs(staleMinutes = 10): Promise<number> {
    return this.parsingJobRepo.recoverStaleJobs(staleMinutes);
  }

  // ─── Legacy bulk entry point (kept for backward compat) ──────

  async uploadCvFiles(files: File[]) {
    const { jobId, fileEntries, totalFiles } = await this.prepareBulkUpload(files);
    // Process synchronously (used when after() is not available)
    await this.processBulkUpload(jobId, fileEntries);
    const job = await this.parsingJobRepo.findById(jobId);
    return {
      jobId,
      totalFiles,
      parsedFiles: job?.parsedFiles ?? 0,
      failedFiles: job?.failedFiles ?? 0,
      errors: job?.errorLog ?? [],
    };
  }

  // ─── ZIP Extraction ──────────────────────────────────────────

  /**
   * Extract individual CV files from the uploaded file list.
   * If a ZIP file is found, extract its contents.
   * Filters to only valid CV file types.
   */
  private async extractFileEntries(files: File[]): Promise<BulkFileEntry[]> {
    const entries: BulkFileEntry[] = [];

    for (const file of files) {
      const ext = this.getExtension(file.name);
      const isZip =
        ext === ".zip" ||
        file.type === "application/zip" ||
        file.type === "application/x-zip-compressed";

      if (isZip) {
        // Extract files from ZIP
        const zipBuffer = Buffer.from(await file.arrayBuffer());
        const zip = await JSZip.loadAsync(zipBuffer);

        for (const [path, zipEntry] of Object.entries(zip.files)) {
          if (zipEntry.dir) continue;

          const entryExt = this.getExtension(path);
          if (!this.isValidCvExtension(entryExt)) continue;

          const buffer = Buffer.from(await zipEntry.async("arraybuffer"));
          const fileName = path.split("/").pop() || path;

          // Skip files that are too large
          const sizeMB = buffer.length / (1024 * 1024);
          if (sizeMB > MAX_FILE_SIZE_MB) continue;

          entries.push({
            name: fileName,
            type: this.mimeFromExtension(entryExt),
            size: buffer.length,
            buffer,
          });
        }
      } else if (this.isValidCvExtension(ext)) {
        const buffer = Buffer.from(await file.arrayBuffer());
        entries.push({
          name: file.name,
          type: file.type || this.mimeFromExtension(ext),
          size: file.size,
          buffer,
        });
      }
    }

    return entries;
  }

  /**
   * Process a single file from the bulk upload batch.
   */
  private async processSingleBulkFile(entry: BulkFileEntry): Promise<void> {
    // 1. Extract text
    const { text: rawCvText } = await this.textExtractionService.extractText(
      entry.buffer,
      entry.type
    );

    if (!rawCvText || rawCvText.trim().length < 50) {
      throw new Error("Could not extract meaningful text from file");
    }

    // 2. Upload original file to storage
    const uint8 = new Uint8Array(entry.buffer);
    const blob = new Blob([uint8], { type: entry.type });
    const file = new File([blob], entry.name, { type: entry.type });
    const { url: rawCvUrl } = await this.storageService.uploadFile(
      file,
      `cvs/bulk/${Date.now()}-${entry.name}`
    );

    // 3. Parse with LLM
    const rawExtraction = await this.cvParserService.parseCvText(rawCvText);

    // 4. Validate LLM output
    const validation = CvExtractionSchema.safeParse(rawExtraction);
    let extraction: CvExtractionResult;
    if (!validation.success) {
      // Retry once
      const retryExtraction = await this.cvParserService.parseCvText(rawCvText);
      const retryValidation = CvExtractionSchema.safeParse(retryExtraction);
      if (!retryValidation.success) {
        throw new Error(
          `CV parsing failed validation: ${retryValidation.error.message}`
        );
      }
      extraction = retryValidation.data as unknown as CvExtractionResult;
    } else {
      extraction = validation.data as unknown as CvExtractionResult;
    }

    // 5. Deduplication check — skip if candidate already exists (by email)
    const dedup = await this.deduplicationRepo.checkForDuplicate({
      email: extraction.email,
      firstName: extraction.firstName,
      lastName: extraction.lastName,
      location: extraction.location,
    });

    if (dedup.isDuplicate && extraction.email) {
      throw new DuplicateSkipError(
        `Candidate already exists (${extraction.email}). Use the candidate profile to update their CV.`
      );
    }

    // 6. Upsert candidate
    const existingId = dedup.duplicateOf ?? undefined;
    await this.upsertCandidateFromExtraction(
      extraction,
      rawCvUrl,
      rawCvText,
      dedup.isDuplicate,
      dedup.duplicateOf,
      existingId,
      extraction as unknown as CvExtraction // validated extraction with business area + confidence
    );
  }

  private getExtension(filename: string): string {
    const idx = filename.lastIndexOf(".");
    return idx >= 0 ? filename.slice(idx).toLowerCase() : "";
  }

  private isValidCvExtension(ext: string): boolean {
    return ALLOWED_CV_EXTENSIONS.includes(ext);
  }

  private mimeFromExtension(ext: string): string {
    switch (ext) {
      case ".pdf":
        return "application/pdf";
      case ".doc":
        return "application/msword";
      case ".docx":
        return "application/vnd.openxmlformats-officedocument.wordprocessingml.document";
      case ".txt":
        return "text/plain";
      default:
        return "application/octet-stream";
    }
  }

  // ─── Private Helpers ─────────────────────────────────────────

  private validateFile(file: File): void {
    if (!ALLOWED_CV_MIME_TYPES.includes(file.type)) {
      throw new ValidationError(
        `Unsupported file type: ${file.type}. Accepted: PDF, DOCX, TXT`
      );
    }

    const sizeMB = file.size / (1024 * 1024);
    if (sizeMB > MAX_FILE_SIZE_MB) {
      throw new ValidationError(
        `File too large (${sizeMB.toFixed(1)}MB). Maximum: ${MAX_FILE_SIZE_MB}MB`
      );
    }
  }

  private async upsertCandidateFromExtraction(
    extraction: CvExtractionResult,
    rawCvUrl: string,
    rawCvText: string,
    isDuplicate: boolean,
    duplicateOf: string | null,
    existingCandidateId?: string,
    validatedExtraction?: CvExtraction
  ) {
    // ─── Compute scores ──────────────────────────────────────
    const highestEducation = this.getHighestEducationLevel(extraction.education);
    const estimatedYears =
      (validatedExtraction?.estimatedTotalYears as number | null) ??
      this.estimateYearsFromExperiences(extraction.experiences);

    const scoring = calculateCvScore({
      yearsOfExperience: estimatedYears,
      educationLevel: highestEducation,
      candidateLocation: extraction.location || null,
      candidateCountry: extraction.country || null,
      languages: extraction.languages.map((l) => ({
        language: l.language,
        level: l.level || null,
      })),
    });

    // ─── Business area classification ────────────────────────
    const bizArea = validatedExtraction?.businessAreaClassification;
    const confidence = validatedExtraction?.parsingConfidence;
    const needsReview = (confidence?.overall ?? 1) < 0.7;

    // Build candidate base data
    const candidateData: Record<string, unknown> = {
      firstName: extraction.firstName,
      lastName: extraction.lastName,
      email: extraction.email || null,
      phone: extraction.phone || null,
      location: extraction.location || null,
      country: extraction.country || null,
      linkedinUrl: extraction.linkedinUrl || null,
      rawCvUrl,
      rawCvText,
      parsedData: extraction as unknown as Record<string, unknown>,
      status: "PARSED",
      sourceType: "EXTERNAL",
      isDuplicate,
      duplicateOf,
      // Scoring
      overallCvScore: scoring.overallScore,
      experienceScore: scoring.experienceScore,
      educationScore: scoring.educationScore,
      locationScore: scoring.locationScore,
      languageScore: scoring.languageScore,
      yearsOfExperience: estimatedYears,
      // Business area
      primaryBusinessArea: bizArea?.primary || null,
      secondaryBusinessAreas: bizArea?.secondary || [],
      candidateCustomArea: bizArea?.customArea || null,
      // Parsing confidence
      parsingConfidence: confidence || null,
      needsReview,
    };

    if (existingCandidateId) {
      // Update existing candidate
      const updated = await this.candidateRepository.update(
        existingCandidateId,
        candidateData
      );

      // Replace related records (delete old, create new)
      await this.replaceRelatedRecords(existingCandidateId, extraction);

      return updated;
    } else {
      // Create new candidate with related records via the repository
      // We use the candidate repository's update method on a newly created record
      // because the repository doesn't expose a create-with-relations method yet.
      // For now, we create via a raw approach through the update method.
      const created = await this.candidateRepository.createWithRelations(
        candidateData,
        {
          experiences: extraction.experiences.map((exp) => ({
            jobTitle: exp.jobTitle || "Unknown Role",
            company: exp.company || null,
            location: exp.location || null,
            startDate: exp.startDate || null,
            endDate: exp.endDate || null,
            isCurrent: exp.isCurrent,
            description: exp.description || null,
          })),
          education: extraction.education.map((edu) => ({
            institution: edu.institution || null,
            degree: edu.degree || null,
            fieldOfStudy: edu.fieldOfStudy || null,
            startDate: edu.startDate || null,
            endDate: edu.endDate || null,
            level: edu.level || null,
          })),
          languages: extraction.languages.map((lang) => ({
            language: lang.language,
            selfDeclaredLevel: null,
          })),
          skills: extraction.skills.map((skill) => ({
            name: skill.name,
            category: skill.category || null,
          })),
        }
      );

      return created;
    }
  }

  private async replaceRelatedRecords(
    candidateId: string,
    extraction: CvExtractionResult
  ) {
    await this.candidateRepository.replaceRelatedRecords(candidateId, {
      experiences: extraction.experiences.map((exp) => ({
        jobTitle: exp.jobTitle || "Unknown Role",
        company: exp.company || null,
        location: exp.location || null,
        startDate: exp.startDate || null,
        endDate: exp.endDate || null,
        isCurrent: exp.isCurrent,
        description: exp.description || null,
      })),
      education: extraction.education.map((edu) => ({
        institution: edu.institution || null,
        degree: edu.degree || null,
        fieldOfStudy: edu.fieldOfStudy || null,
        startDate: edu.startDate || null,
        endDate: edu.endDate || null,
        level: edu.level || null,
      })),
      languages: extraction.languages.map((lang) => ({
        language: lang.language,
        selfDeclaredLevel: null,
      })),
      skills: extraction.skills.map((skill) => ({
        name: skill.name,
        category: skill.category || null,
      })),
    });
  }

  /**
   * Get the highest education level from the candidate's education records.
   */
  private getHighestEducationLevel(
    education: CvExtractionResult["education"]
  ): string | null {
    const rank: Record<string, number> = {
      HIGH_SCHOOL: 1,
      VOCATIONAL: 2,
      OTHER: 2,
      BACHELOR: 3,
      MASTER: 4,
      PHD: 5,
    };
    let highest: string | null = null;
    let highestRank = 0;
    for (const edu of education) {
      const level = edu.level || null;
      if (level && (rank[level] ?? 0) > highestRank) {
        highestRank = rank[level] ?? 0;
        highest = level;
      }
    }
    return highest;
  }

  /**
   * Estimate total years of experience from parsed experience dates.
   * Fallback when LLM doesn't provide estimatedTotalYears.
   */
  private estimateYearsFromExperiences(
    experiences: CvExtractionResult["experiences"]
  ): number {
    let totalMonths = 0;
    const now = new Date();

    for (const exp of experiences) {
      const start = this.parseApproximateDate(exp.startDate);
      if (!start) continue;
      const end = exp.isCurrent ? now : this.parseApproximateDate(exp.endDate) ?? now;
      const months = (end.getFullYear() - start.getFullYear()) * 12 + (end.getMonth() - start.getMonth());
      if (months > 0) totalMonths += months;
    }

    return Math.round((totalMonths / 12) * 10) / 10;
  }

  /**
   * Parse approximate date strings like "2020-06", "2020", "Jun 2020", etc.
   */
  private parseApproximateDate(dateStr: string | null | undefined): Date | null {
    if (!dateStr) return null;
    const trimmed = dateStr.trim();

    // "YYYY-MM" format
    const ymd = trimmed.match(/^(\d{4})-(\d{1,2})/);
    if (ymd) return new Date(parseInt(ymd[1]), parseInt(ymd[2]) - 1);

    // "YYYY" only
    const yOnly = trimmed.match(/^(\d{4})$/);
    if (yOnly) return new Date(parseInt(yOnly[1]), 0);

    // Try native parse as last resort
    const d = new Date(trimmed);
    return isNaN(d.getTime()) ? null : d;
  }

  // ─── Document Uploads (Motivation Letter / Learning Agreement) ─

  /**
   * Upload a motivation letter, extract text, and save to candidate.
   */
  async uploadMotivationLetter(
    file: File,
    candidateId?: string | null
  ): Promise<{ url: string; fileName: string; extractedText: string }> {
    const allowedTypes = [
      "application/pdf",
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      "text/plain",
    ];

    if (!allowedTypes.includes(file.type)) {
      throw new ValidationError("Unsupported file type. Use PDF, DOCX, or TXT.");
    }

    if (file.size > MAX_FILE_SIZE_MB * 1024 * 1024) {
      throw new ValidationError(`File too large. Maximum ${MAX_FILE_SIZE_MB}MB.`);
    }

    const { url } = await this.storageService.uploadFile(file, "motivation-letters");

    const buffer = Buffer.from(await file.arrayBuffer());
    let extractedText = "";
    try {
      const result = await this.textExtractionService.extractText(buffer, file.type);
      extractedText = result.text;
    } catch {
      // Non-critical: text extraction might fail for some files
    }

    if (candidateId) {
      await this.candidateRepository.update(candidateId, {
        motivationLetterUrl: url,
        motivationLetterText: extractedText || null,
      });
    }

    return { url, fileName: file.name, extractedText };
  }

  /**
   * Upload a learning agreement and save to candidate or application.
   */
  async uploadLearningAgreement(
    file: File,
    target: { applicationId?: string | null; candidateId?: string | null },
    updateApplication: (id: string, data: Record<string, unknown>) => Promise<any>
  ): Promise<{ url: string; fileName: string; targetId: string; targetType: "application" | "candidate" }> {
    const allowedTypes = [
      "application/pdf",
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    ];

    if (!allowedTypes.includes(file.type)) {
      throw new ValidationError("Unsupported file type. Use PDF or DOCX.");
    }

    if (file.size > MAX_FILE_SIZE_MB * 1024 * 1024) {
      throw new ValidationError(`File too large. Maximum ${MAX_FILE_SIZE_MB}MB.`);
    }

    if (!target.applicationId && !target.candidateId) {
      throw new ValidationError("Either applicationId or candidateId is required.");
    }

    const { url } = await this.storageService.uploadFile(file, "learning-agreements");

    if (target.applicationId) {
      await updateApplication(target.applicationId, { learningAgreementUrl: url });
      return { url, fileName: file.name, targetId: target.applicationId, targetType: "application" };
    }

    await this.candidateRepository.update(target.candidateId!, {
      learningAgreementUrl: url,
    });

    return { url, fileName: file.name, targetId: target.candidateId!, targetType: "candidate" };
  }
}

// ─── Error Classes ─────────────────────────────────────────────

export class ValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ValidationError";
  }
}

export class DuplicateSkipError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "DuplicateSkipError";
  }
}

