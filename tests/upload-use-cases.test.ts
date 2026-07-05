/**
 * UploadUseCases — Unit Tests
 *
 * Tests the full candidate CV upload pipeline with all dependencies mocked.
 * Covers: validation, storage, text extraction, LLM parsing, Zod validation,
 * deduplication, candidate creation & update.
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { UploadUseCases } from "@server/application/use-cases/upload.use-cases";
import { ValidationError } from "@server/application/errors";
import type { ICandidateRepository, IDeduplicationRepository, IParsingJobRepository } from "@server/domain/ports/repositories";
import type {
  ICvParserService,
  IStorageService,
  ITextExtractionService,
  CvExtractionResult,
} from "@server/domain/ports/services";

// ─── Fixtures ─────────────────────────────────────────────────────

function validExtraction(overrides: Partial<CvExtractionResult> = {}): CvExtractionResult {
  return {
    firstName: "Maria",
    lastName: "Garcia",
    email: "maria@example.com",
    phone: "+351 912 345 678",
    location: "Porto, Portugal",
    country: "Portugal",
    linkedinUrl: "https://linkedin.com/in/maria-garcia",
    experiences: [
      {
        jobTitle: "Project Manager",
        company: "adidas",
        location: "Porto",
        startDate: "2020-01",
        endDate: null,
        isCurrent: true,
        description: "Leading cross-functional teams in product development",
      },
    ],
    education: [
      {
        institution: "Universidade do Porto",
        degree: "Master",
        fieldOfStudy: "Business Administration",
        startDate: "2016-09",
        endDate: "2018-06",
        level: "MASTER",
      },
    ],
    languages: [
      { language: "Portuguese", level: "C2" },
      { language: "English", level: "C1" },
    ],
    skills: [
      { name: "Project Management", category: "Management" },
      { name: "Agile", category: "Methodology" },
    ],
    ...overrides,
  };
}

function createMockFile(
  name = "resume.pdf",
  type = "application/pdf",
  sizeMB = 1
): File {
  const sizeBytes = sizeMB * 1024 * 1024;
  const buffer = new ArrayBuffer(sizeBytes);
  return new File([buffer], name, { type });
}

// ─── Mock factories ───────────────────────────────────────────────

function createMockDedup(): IDeduplicationRepository {
  return {
    checkForDuplicate: vi.fn().mockResolvedValue({
      isDuplicate: false,
      duplicateOf: null,
      matchType: null,
      confidence: 0,
    }),
  };
}

function createMockCvParser(): ICvParserService {
  return {
    parseCvText: vi.fn().mockResolvedValue(validExtraction()),
    classifyExperienceRelevance: vi.fn().mockResolvedValue({ score: 85, reason: "Relevant" }),
  };
}

function createMockStorage(): IStorageService {
  return {
    uploadFile: vi.fn().mockResolvedValue({
      url: "https://blob.vercel-storage.com/cvs/resume.pdf",
      pathname: "cvs/resume.pdf",
    }),
    deleteFile: vi.fn().mockResolvedValue(undefined),
  };
}

function createMockTextExtraction(): ITextExtractionService {
  return {
    extractText: vi.fn().mockResolvedValue({
      text: "Maria Garcia\nProject Manager at adidas\n10+ years experience in supply chain...",
      pageCount: 2,
    }),
  };
}

function createMockCandidateRepo(): ICandidateRepository {
  return {
    findMany: vi.fn(),
    findById: vi.fn(),
    findByIdWithSelect: vi.fn(),
    findByUserId: vi.fn().mockResolvedValue(null),
    findByEmail: vi.fn().mockResolvedValue(null),
    findFirstByCreation: vi.fn().mockResolvedValue(null),
    createDefault: vi.fn().mockResolvedValue({ id: "new-candidate-id" }),
    update: vi.fn().mockResolvedValue({ id: "existing-id" }),
    updateWithSelect: vi.fn().mockResolvedValue({ id: "existing-id" }),
    addNote: vi.fn(),
    updateStatus: vi.fn(),
    findForMatching: vi.fn(),
    findForNotifications: vi.fn().mockResolvedValue([]),
    findForExport: vi.fn(),
    findForRescore: vi.fn().mockResolvedValue([]),
    createWithRelations: vi.fn().mockResolvedValue({ id: "new-candidate-id" }),
    replaceRelatedRecords: vi.fn().mockResolvedValue(undefined),
    delete: vi.fn().mockResolvedValue(undefined),
  };
}

function createMockParsingJobRepo(): IParsingJobRepository {
  return {
    create: vi.fn().mockResolvedValue({ id: "job-1", status: "QUEUED", totalFiles: 0, parsedFiles: 0, failedFiles: 0, errorLog: [] }),
    findById: vi.fn().mockResolvedValue({ id: "job-1", status: "COMPLETED", totalFiles: 2, parsedFiles: 2, failedFiles: 0, errorLog: [] }),
    findRecent: vi.fn().mockResolvedValue([]),
    updateStatus: vi.fn().mockResolvedValue(undefined),
    incrementParsed: vi.fn().mockResolvedValue(undefined),
    incrementFailed: vi.fn().mockResolvedValue(undefined),
    appendError: vi.fn().mockResolvedValue(undefined),
    recoverStaleJobs: vi.fn().mockResolvedValue(0),
    delete: vi.fn().mockResolvedValue(undefined),
  };
}

// ─── Tests ────────────────────────────────────────────────────────

describe("UploadUseCases", () => {
  let useCases: UploadUseCases;
  let dedup: ReturnType<typeof createMockDedup>;
  let parser: ReturnType<typeof createMockCvParser>;
  let storage: ReturnType<typeof createMockStorage>;
  let extraction: ReturnType<typeof createMockTextExtraction>;
  let candidateRepo: ReturnType<typeof createMockCandidateRepo>;
  let parsingJobRepo: ReturnType<typeof createMockParsingJobRepo>;

  beforeEach(() => {
    dedup = createMockDedup();
    parser = createMockCvParser();
    storage = createMockStorage();
    extraction = createMockTextExtraction();
    candidateRepo = createMockCandidateRepo();
    parsingJobRepo = createMockParsingJobRepo();

    useCases = new UploadUseCases(dedup, parser, storage, extraction, candidateRepo, parsingJobRepo);
  });

  // ────────────────────────────────────────────────────────
  // File Validation
  // ────────────────────────────────────────────────────────

  describe("file validation", () => {
    it("should reject unsupported file types", async () => {
      const file = createMockFile("photo.png", "image/png", 0.5);

      await expect(useCases.uploadCandidateCv(file)).rejects.toThrow(
        ValidationError
      );
      await expect(useCases.uploadCandidateCv(file)).rejects.toThrow(
        "Unsupported file type"
      );
    });

    it("should reject files exceeding the size limit", async () => {
      const file = createMockFile("huge.pdf", "application/pdf", 15); // 15 MB > 10 MB limit

      await expect(useCases.uploadCandidateCv(file)).rejects.toThrow(
        ValidationError
      );
      await expect(useCases.uploadCandidateCv(file)).rejects.toThrow(
        "too large"
      );
    });

    it("should accept PDF files within size limit", async () => {
      const file = createMockFile("resume.pdf", "application/pdf", 2);
      const result = await useCases.uploadCandidateCv(file);
      expect(result.candidateId).toBe("new-candidate-id");
    });

    it("should accept DOCX files", async () => {
      const file = createMockFile(
        "resume.docx",
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        1
      );
      const result = await useCases.uploadCandidateCv(file);
      expect(result.candidateId).toBeDefined();
    });

    it("should accept TXT files", async () => {
      const file = createMockFile("resume.txt", "text/plain", 0.1);
      const result = await useCases.uploadCandidateCv(file);
      expect(result.candidateId).toBeDefined();
    });
  });

  // ────────────────────────────────────────────────────────
  // Full Pipeline — Happy Path
  // ────────────────────────────────────────────────────────

  describe("happy path pipeline", () => {
    it("should execute all pipeline steps in order", async () => {
      const file = createMockFile("resume.pdf", "application/pdf", 1);

      const result = await useCases.uploadCandidateCv(file);

      // Step 2: Storage
      expect(storage.uploadFile).toHaveBeenCalledOnce();
      expect(storage.uploadFile).toHaveBeenCalledWith(
        file,
        expect.stringContaining("cvs/candidates/")
      );

      // Step 3: Text extraction
      expect(extraction.extractText).toHaveBeenCalledOnce();
      expect(extraction.extractText).toHaveBeenCalledWith(
        expect.any(Buffer),
        "application/pdf"
      );

      // Step 4: LLM parsing
      expect(parser.parseCvText).toHaveBeenCalledOnce();

      // Step 6: Dedup check
      expect(dedup.checkForDuplicate).toHaveBeenCalledWith(
        expect.objectContaining({
          email: "maria@example.com",
          firstName: "Maria",
          lastName: "Garcia",
          location: "Porto, Portugal",
        })
      );

      // Step 7: Candidate creation
      expect(candidateRepo.createWithRelations).toHaveBeenCalledOnce();

      // Result shape
      expect(result).toMatchObject({
        candidateId: "new-candidate-id",
        status: "created",
        isDuplicate: false,
        duplicateOf: null,
        rawCvUrl: "https://blob.vercel-storage.com/cvs/resume.pdf",
      });
      expect(result.extraction).toBeDefined();
      expect(result.extraction.firstName).toBe("Maria");
    });

    it("should return structured extraction data in result", async () => {
      const file = createMockFile("resume.pdf", "application/pdf", 1);
      const result = await useCases.uploadCandidateCv(file);

      expect(result.extraction.experiences).toHaveLength(1);
      expect(result.extraction.education).toHaveLength(1);
      expect(result.extraction.languages).toHaveLength(2);
      expect(result.extraction.skills).toHaveLength(2);
    });
  });

  // ────────────────────────────────────────────────────────
  // Deduplication
  // ────────────────────────────────────────────────────────

  describe("deduplication", () => {
    it("should update existing candidate when duplicate detected", async () => {
      dedup.checkForDuplicate = vi.fn().mockResolvedValue({
        isDuplicate: true,
        duplicateOf: "existing-dup-id",
        matchType: "email",
        confidence: 0.95,
      });

      const file = createMockFile("resume.pdf", "application/pdf", 1);
      const result = await useCases.uploadCandidateCv(file);

      expect(result.status).toBe("updated");
      expect(result.isDuplicate).toBe(true);
      expect(result.duplicateOf).toBe("existing-dup-id");
      // Should update, not create
      expect(candidateRepo.update).toHaveBeenCalledWith("existing-dup-id", expect.any(Object));
      expect(candidateRepo.replaceRelatedRecords).toHaveBeenCalledWith(
        "existing-dup-id",
        expect.objectContaining({
          experiences: expect.any(Array),
          education: expect.any(Array),
          languages: expect.any(Array),
          skills: expect.any(Array),
        })
      );
      expect(candidateRepo.createWithRelations).not.toHaveBeenCalled();
    });

    it("should update when candidateId is provided (self-update)", async () => {
      const file = createMockFile("resume.pdf", "application/pdf", 1);
      const result = await useCases.uploadCandidateCv(file, "my-candidate-id");

      expect(result.status).toBe("updated");
      expect(candidateRepo.update).toHaveBeenCalledWith("my-candidate-id", expect.any(Object));
      expect(candidateRepo.replaceRelatedRecords).toHaveBeenCalledWith(
        "my-candidate-id",
        expect.any(Object)
      );
    });
  });

  // ────────────────────────────────────────────────────────
  // LLM Parsing / Zod Validation
  // ────────────────────────────────────────────────────────

  describe("LLM parsing and validation", () => {
    it("should retry parsing if first attempt fails Zod validation", async () => {
      const invalidExtraction = { ...validExtraction(), firstName: 123 as any }; // Invalid
      const validExtractionData = validExtraction();

      parser.parseCvText = vi
        .fn()
        .mockResolvedValueOnce(invalidExtraction)
        .mockResolvedValueOnce(validExtractionData);

      const file = createMockFile("resume.pdf", "application/pdf", 1);
      const result = await useCases.uploadCandidateCv(file);

      // Should have retried
      expect(parser.parseCvText).toHaveBeenCalledTimes(2);
      expect(result.candidateId).toBeDefined();
    });

    it("should throw if both first and retry Zod validation fail", async () => {
      const invalidExtraction = { ...validExtraction(), firstName: 123 as any };

      parser.parseCvText = vi.fn().mockResolvedValue(invalidExtraction);

      const file = createMockFile("resume.pdf", "application/pdf", 1);
      await expect(useCases.uploadCandidateCv(file)).rejects.toThrow(
        "CV parsing failed validation after retry"
      );
      expect(parser.parseCvText).toHaveBeenCalledTimes(2);
    });
  });

  // ────────────────────────────────────────────────────────
  // Candidate data mapping
  // ────────────────────────────────────────────────────────

  describe("candidate data mapping", () => {
    it("should map extraction data to createWithRelations correctly", async () => {
      const file = createMockFile("resume.pdf", "application/pdf", 1);
      await useCases.uploadCandidateCv(file);

      const [candidateData, relations] = (candidateRepo.createWithRelations as any).mock.calls[0];

      // Base candidate data
      expect(candidateData).toMatchObject({
        firstName: "Maria",
        lastName: "Garcia",
        email: "maria@example.com",
        phone: "+351 912 345 678",
        location: "Porto, Portugal",
        country: "Portugal",
        status: "PARSED",
        sourceType: "EXTERNAL",
      });

      // Relations
      expect(relations.experiences).toHaveLength(1);
      expect(relations.experiences[0]).toMatchObject({
        jobTitle: "Project Manager",
        company: "adidas",
        isCurrent: true,
      });

      expect(relations.education).toHaveLength(1);
      expect(relations.education[0]).toMatchObject({
        institution: "Universidade do Porto",
        degree: "Master",
        level: "MASTER",
      });

      expect(relations.languages).toHaveLength(2);
      expect(relations.languages[0]).toMatchObject({
        language: "Portuguese",
        selfDeclaredLevel: "C2",
      });

      expect(relations.skills).toHaveLength(2);
      expect(relations.skills[0]).toMatchObject({
        name: "Project Management",
        category: "Management",
      });
    });

    it("should handle null optional fields in extraction", async () => {
      parser.parseCvText = vi.fn().mockResolvedValue(
        validExtraction({
          email: null,
          phone: null,
          location: null,
          country: null,
          linkedinUrl: null,
        })
      );

      const file = createMockFile("resume.pdf", "application/pdf", 1);
      await useCases.uploadCandidateCv(file);

      const [candidateData] = (candidateRepo.createWithRelations as any).mock.calls[0];
      expect(candidateData.email).toBeNull();
      expect(candidateData.phone).toBeNull();
      expect(candidateData.location).toBeNull();
    });
  });

  // ────────────────────────────────────────────────────────
  // HR Bulk Upload (Phase 2 placeholder)
  // ────────────────────────────────────────────────────────

  describe("HR bulk upload", () => {
    it("should throw if no files provided", async () => {
      await expect(useCases.uploadCvFiles([])).rejects.toThrow("No files provided");
    });

    it("should create a parsing job, process files, and return summary", async () => {
      const files = [createMockFile("a.pdf"), createMockFile("b.pdf")];
      const result = await useCases.uploadCvFiles(files);

      expect(result.jobId).toBe("job-1");
      expect(result.totalFiles).toBe(2);
      expect(parsingJobRepo.create).toHaveBeenCalledWith({ totalFiles: 2, fileName: "2 files" });
      expect(parsingJobRepo.updateStatus).toHaveBeenCalledWith("job-1", "PROCESSING");
    });

    it("should increment parsed count for each successful file", async () => {
      const files = [createMockFile("a.pdf")];
      await useCases.uploadCvFiles(files);

      expect(parsingJobRepo.incrementParsed).toHaveBeenCalled();
    });

    it("should increment failed count and log errors for bad files", async () => {
      extraction.extractText = vi.fn().mockRejectedValue(new Error("corrupt PDF"));
      parsingJobRepo.findById = vi.fn().mockResolvedValue({
        id: "job-1", status: "FAILED", totalFiles: 1, parsedFiles: 0, failedFiles: 1, errorLog: []
      });

      const files = [createMockFile("bad.pdf")];
      const result = await useCases.uploadCvFiles(files);

      expect(parsingJobRepo.incrementFailed).toHaveBeenCalled();
      expect(parsingJobRepo.appendError).toHaveBeenCalledWith("job-1", expect.objectContaining({
        file: "bad.pdf",
        error: "corrupt PDF",
      }));
    });
  });

  // ────────────────────────────────────────────────────────
  // Parsing job management
  // ────────────────────────────────────────────────────────

  describe("parsing job management", () => {
    it("getParsingJob returns the job or throws when missing", async () => {
      const job = await useCases.getParsingJob("job-1");
      expect(job.id).toBe("job-1");

      parsingJobRepo.findById = vi.fn().mockResolvedValue(null);
      await expect(useCases.getParsingJob("x")).rejects.toThrow(ValidationError);
    });

    it("getRecentParsingJobs delegates with the limit", async () => {
      await useCases.getRecentParsingJobs(5);
      expect(parsingJobRepo.findRecent).toHaveBeenCalledWith(5);
    });

    it("cancelJob signals a PROCESSING job", async () => {
      parsingJobRepo.findById = vi.fn().mockResolvedValue({ id: "job-1", status: "PROCESSING" });
      const res = await useCases.cancelJob("job-1");
      expect(res.cancelled).toBe(true);
    });

    it("cancelJob fails a QUEUED job immediately", async () => {
      parsingJobRepo.findById = vi.fn().mockResolvedValue({ id: "job-1", status: "QUEUED" });
      const res = await useCases.cancelJob("job-1");
      expect(res.cancelled).toBe(true);
      expect(parsingJobRepo.updateStatus).toHaveBeenCalledWith("job-1", "FAILED");
    });

    it("cancelJob is a no-op for terminal jobs and throws when missing", async () => {
      parsingJobRepo.findById = vi.fn().mockResolvedValue({ id: "job-1", status: "COMPLETED" });
      expect((await useCases.cancelJob("job-1")).cancelled).toBe(false);

      parsingJobRepo.findById = vi.fn().mockResolvedValue(null);
      await expect(useCases.cancelJob("x")).rejects.toThrow(ValidationError);
    });

    it("recoverStaleJobs delegates the threshold", async () => {
      await useCases.recoverStaleJobs(30);
      expect(parsingJobRepo.recoverStaleJobs).toHaveBeenCalledWith(30);
    });

    it("deleteParsingJob refuses running jobs and deletes terminal ones", async () => {
      parsingJobRepo.findById = vi.fn().mockResolvedValue({ id: "job-1", status: "PROCESSING" });
      await expect(useCases.deleteParsingJob("job-1")).rejects.toThrow(/cancel it first/);

      parsingJobRepo.findById = vi.fn().mockResolvedValue({ id: "job-1", status: "COMPLETED" });
      const res = await useCases.deleteParsingJob("job-1");
      expect(res.deleted).toBe(true);
      expect(parsingJobRepo.delete).toHaveBeenCalledWith("job-1");

      parsingJobRepo.findById = vi.fn().mockResolvedValue(null);
      await expect(useCases.deleteParsingJob("x")).rejects.toThrow(ValidationError);
    });
  });

  // ────────────────────────────────────────────────────────
  // prepareBulkUpload / processBulkUpload
  // ────────────────────────────────────────────────────────

  describe("bulk upload phases", () => {
    it("prepareBulkUpload creates a parsing job for plain files", async () => {
      const files = [createMockFile("a.pdf"), createMockFile("b.pdf")];
      const res = await useCases.prepareBulkUpload(files);
      expect(res.jobId).toBe("job-1");
      expect(res.totalFiles).toBe(2);
      expect(parsingJobRepo.create).toHaveBeenCalledWith({ totalFiles: 2, fileName: "2 files" });
    });

    it("prepareBulkUpload rejects an empty file list", async () => {
      await expect(useCases.prepareBulkUpload([])).rejects.toThrow("No files provided");
    });

    it("processBulkUpload marks PROCESSING then a terminal status", async () => {
      const { jobId, fileEntries } = await useCases.prepareBulkUpload([createMockFile("a.pdf")]);
      await useCases.processBulkUpload(jobId, fileEntries);
      expect(parsingJobRepo.updateStatus).toHaveBeenNthCalledWith(1, jobId, "PROCESSING");
      const lastStatus = (parsingJobRepo.updateStatus as any).mock.calls.at(-1)[1];
      expect(["COMPLETED", "FAILED"]).toContain(lastStatus);
    });
  });

  // ────────────────────────────────────────────────────────
  // Motivation letter / learning agreement
  // ────────────────────────────────────────────────────────

  describe("uploadMotivationLetter", () => {
    it("rejects an unsupported file type", async () => {
      const f = createMockFile("letter.png", "image/png", 0.2);
      await expect(useCases.uploadMotivationLetter(f)).rejects.toThrow(ValidationError);
    });

    it("stores the letter, extracts text, and updates the candidate", async () => {
      const f = createMockFile("letter.pdf", "application/pdf", 0.5);
      const res = await useCases.uploadMotivationLetter(f, "c-1");
      expect(res.url).toBeDefined();
      expect(res.extractedText).toContain("Maria Garcia");
      expect(candidateRepo.update).toHaveBeenCalledWith(
        "c-1",
        expect.objectContaining({ motivationLetterUrl: res.url })
      );
    });

    it("swallows text-extraction failures", async () => {
      extraction.extractText = vi.fn().mockRejectedValue(new Error("bad"));
      const f = createMockFile("letter.pdf", "application/pdf", 0.5);
      const res = await useCases.uploadMotivationLetter(f);
      expect(res.extractedText).toBe("");
    });
  });

  describe("uploadLearningAgreement", () => {
    const updateApplication = vi.fn(async (id: string, data: Record<string, unknown>) => ({ id, ...data }));

    beforeEach(() => updateApplication.mockClear());

    it("rejects an unsupported file type", async () => {
      const f = createMockFile("la.txt", "text/plain", 0.1);
      await expect(
        useCases.uploadLearningAgreement(f, { candidateId: "c-1" }, updateApplication)
      ).rejects.toThrow(ValidationError);
    });

    it("requires a target", async () => {
      const f = createMockFile("la.pdf", "application/pdf", 0.5);
      await expect(
        useCases.uploadLearningAgreement(f, {}, updateApplication)
      ).rejects.toThrow(/applicationId or candidateId/);
    });

    it("attaches to an application when applicationId is given", async () => {
      const f = createMockFile("la.pdf", "application/pdf", 0.5);
      const res = await useCases.uploadLearningAgreement(f, { applicationId: "app-1" }, updateApplication);
      expect(res.targetType).toBe("application");
      expect(updateApplication).toHaveBeenCalledWith("app-1", { learningAgreementUrl: res.url });
    });

    it("attaches to a candidate when only candidateId is given", async () => {
      const f = createMockFile("la.pdf", "application/pdf", 0.5);
      const res = await useCases.uploadLearningAgreement(f, { candidateId: "c-1" }, updateApplication);
      expect(res.targetType).toBe("candidate");
      expect(candidateRepo.update).toHaveBeenCalledWith("c-1", { learningAgreementUrl: res.url });
    });
  });
});

// ─── ValidationError class ──────────────────────────────────────

describe("ValidationError", () => {
  it("should have name 'ValidationError'", () => {
    const err = new ValidationError("test");
    expect(err.name).toBe("ValidationError");
    expect(err.message).toBe("test");
    expect(err).toBeInstanceOf(Error);
  });
});
