/**
 * Batch 5 — JobUseCases (Application layer).
 *
 * Focuses on the orchestration logic the use case owns: job CRUD guards,
 * preference-aware new-posting notifications, sync reconciliation, and the
 * lazy-parse / force-reparse / match orchestration. All ports are mocked;
 * the pure matcher (computeJobFit) and requirements schema run for real.
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  JobUseCases,
  JobClosedError,
  type IJobRequirementsExtractor,
} from "@server/application/use-cases/job.use-cases";
import { NotFoundError } from "@server/application/errors";
import { JOB_REQUIREMENTS_SCHEMA_VERSION } from "@server/domain/services/job-requirements.schema";
import type {
  IJobRepository,
  ICandidateRepository,
  INotificationRepository,
} from "@server/domain/ports/repositories";
import type { IJobScraperService } from "@server/domain/ports/services";
import type { CreateJobInput, UpdateJobInput } from "@server/application/dtos";

// ─── Mock builders ────────────────────────────────────────────────

function makeJobRepo(overrides: Partial<IJobRepository> = {}): IJobRepository {
  const base: Partial<IJobRepository> = {
    findMany: vi.fn(async () => ({ data: [], total: 0, page: 1, pageSize: 20, totalPages: 0 })),
    findById: vi.fn(async (id: string) => ({ id, title: "Job", type: "FULL_TIME" }) as never),
    create: vi.fn(async (d) => ({ id: "job-1", ...d }) as never),
    update: vi.fn(async (id, d) => ({ id, ...d }) as never),
    delete: vi.fn(async () => undefined),
    findDistinctCountries: vi.fn(async () => ["PT", "DE"]),
    findAllForPicker: vi.fn(async () => []),
    bulkUpsertByExternalId: vi.fn(async () => ({ created: 2, updated: 1 })),
    closeStaleScrapedJobs: vi.fn(async () => 3),
    findUnparsedJobs: vi.fn(async () => []),
    updateParsedRequirements: vi.fn(async () => undefined),
    markClosed: vi.fn(async () => undefined),
    upsertMatch: vi.fn(async () => ({}) as never),
    ...overrides,
  };
  return base as IJobRepository;
}

function makeCandidateRepo(overrides: Partial<ICandidateRepository> = {}): ICandidateRepository {
  return {
    findForMatching: vi.fn(async () => []),
    ...overrides,
  } as unknown as ICandidateRepository;
}

function makeNotifRepo(overrides: Partial<INotificationRepository> = {}): INotificationRepository {
  return {
    getPreferences: vi.fn(async () => null),
    createMany: vi.fn(async () => undefined),
    create: vi.fn(async () => ({}) as never),
    ...overrides,
  } as unknown as INotificationRepository;
}

function makeScraper(overrides: Partial<IJobScraperService> = {}): IJobScraperService {
  return {
    scrapeJobs: vi.fn(async () => []),
    fetchJobDescription: vi.fn(async () => ({ status: "OPEN", body: "x".repeat(400) })),
    ...overrides,
  } as unknown as IJobScraperService;
}

function makeExtractor(): IJobRequirementsExtractor {
  return {
    schemaVersion: JOB_REQUIREMENTS_SCHEMA_VERSION,
    extract: vi.fn(async () => ({
      fieldsOfWork: [],
      requiredSkills: [],
      preferredSkills: [],
      requiredLanguages: [],
      rawExtractionModel: "test-model",
      rawExtractionTimestamp: "2026-01-01T00:00:00Z",
    })),
  };
}

const FRESH_REQUIREMENTS = {
  fieldsOfWork: [],
  seniorityLevel: null,
  minYearsInField: null,
  requiredSkills: [],
  preferredSkills: [],
  requiredLanguages: [],
  requiredEducationLevel: null,
  responsibilitiesSummary: null,
  rawExtractionModel: "cached-model",
  rawExtractionTimestamp: "2026-01-01T00:00:00Z",
};

beforeEach(() => vi.clearAllMocks());

// ─── Simple delegations ───────────────────────────────────────────

describe("JobUseCases — list delegations", () => {
  it("listJobs forwards options to the repository", async () => {
    const repo = makeJobRepo();
    const uc = new JobUseCases(repo, makeCandidateRepo());
    await uc.listJobs({ page: 2, search: "eng" });
    expect(repo.findMany).toHaveBeenCalledWith({ page: 2, search: "eng" });
  });

  it("listDistinctCountries and listJobsForPicker delegate", async () => {
    const repo = makeJobRepo();
    const uc = new JobUseCases(repo, makeCandidateRepo());
    expect(await uc.listDistinctCountries()).toEqual(["PT", "DE"]);
    await uc.listJobsForPicker();
    expect(repo.findAllForPicker).toHaveBeenCalled();
  });
});

// ─── createJob ────────────────────────────────────────────────────

describe("JobUseCases.createJob", () => {
  it("converts date strings and defaults internship status to DRAFT", async () => {
    const repo = makeJobRepo();
    const uc = new JobUseCases(repo, makeCandidateRepo());
    await uc.createJob({
      title: "Intern",
      type: "INTERNSHIP",
      startDate: "2026-06-01",
      endDate: "2026-09-01",
    } as unknown as CreateJobInput);

    const [data] = (repo.create as ReturnType<typeof vi.fn>).mock.calls[0];
    expect(data.startDate).toBeInstanceOf(Date);
    expect(data.endDate).toBeInstanceOf(Date);
    expect(data.internshipStatus).toBe("DRAFT");
  });

  it("notifies preference-eligible candidates about a new full-time job", async () => {
    const repo = makeJobRepo({
      create: vi.fn(async () => ({ id: "job-1", title: "Engineer", type: "FULL_TIME", country: "PT", department: "IT" }) as never),
    });
    const candidateRepo = makeCandidateRepo({
      findForMatching: vi.fn(async () => [{ id: "c-1", country: "PT" }, { id: "c-2", country: "DE" }] as never),
    });
    const notif = makeNotifRepo({
      // c-1 opts out of jobs, c-2 receives all (null prefs)
      getPreferences: vi.fn(async (id: string) =>
        id === "c-1" ? ({ jobNotifications: false } as never) : null
      ),
    });
    const uc = new JobUseCases(repo, candidateRepo, undefined, notif);

    await uc.createJob({ title: "Engineer", type: "FULL_TIME" } as unknown as CreateJobInput);

    const [rows] = (notif.createMany as ReturnType<typeof vi.fn>).mock.calls[0];
    expect(rows.map((r: { candidateId: string }) => r.candidateId)).toEqual(["c-2"]);
    expect(rows[0].type).toBe("JOB_POSTED");
  });

  it("does not notify when no notificationRepo is configured", async () => {
    const uc = new JobUseCases(makeJobRepo(), makeCandidateRepo());
    await expect(
      uc.createJob({ title: "X", type: "FULL_TIME" } as unknown as CreateJobInput)
    ).resolves.toBeDefined();
  });

  it("swallows notification errors and still returns the job", async () => {
    const errSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    const repo = makeJobRepo({
      create: vi.fn(async () => ({ id: "job-1", title: "X", type: "FULL_TIME" }) as never),
    });
    const candidateRepo = makeCandidateRepo({
      findForMatching: vi.fn(async () => {
        throw new Error("db down");
      }),
    });
    const uc = new JobUseCases(repo, candidateRepo, undefined, makeNotifRepo());

    const job = await uc.createJob({ title: "X", type: "FULL_TIME" } as unknown as CreateJobInput);
    expect(job).toMatchObject({ id: "job-1" });
    expect(errSpy).toHaveBeenCalled();
    errSpy.mockRestore();
  });
});

// ─── updateJob / getJob / deleteJob ───────────────────────────────

describe("JobUseCases.updateJob", () => {
  it("throws NotFoundError for a missing job", async () => {
    const repo = makeJobRepo({ findById: vi.fn(async () => null) });
    const uc = new JobUseCases(repo, makeCandidateRepo());
    await expect(
      uc.updateJob("nope", {} as UpdateJobInput)
    ).rejects.toBeInstanceOf(NotFoundError);
  });

  it("nulls empty mentorEmail and normalises dates", async () => {
    const repo = makeJobRepo({
      findById: vi.fn(async () => ({ id: "job-1", type: "FULL_TIME" }) as never),
    });
    const uc = new JobUseCases(repo, makeCandidateRepo());
    await uc.updateJob("job-1", {
      mentorEmail: "",
      startDate: "2026-06-01",
      endDate: null,
    } as unknown as UpdateJobInput);

    const [, data] = (repo.update as ReturnType<typeof vi.fn>).mock.calls[0];
    expect(data.mentorEmail).toBeNull();
    expect(data.startDate).toBeInstanceOf(Date);
    expect(data.endDate).toBeNull();
  });

  it("emits an HR JOB_STATE_CHANGED notification on a non-active transition", async () => {
    const repo = makeJobRepo({
      findById: vi.fn(async () => ({ id: "job-1", type: "INTERNSHIP", internshipStatus: "ACTIVE", title: "Intern" }) as never),
    });
    const notif = makeNotifRepo();
    const uc = new JobUseCases(repo, makeCandidateRepo(), undefined, notif);

    await uc.updateJob("job-1", { internshipStatus: "CLOSED" } as unknown as UpdateJobInput);

    expect(notif.create).toHaveBeenCalledWith(
      expect.objectContaining({ type: "JOB_STATE_CHANGED", targetRole: "HR" })
    );
  });
});

describe("JobUseCases.getJob / deleteJob", () => {
  it("getJob returns the job or throws NotFoundError", async () => {
    const uc = new JobUseCases(makeJobRepo(), makeCandidateRepo());
    expect(await uc.getJob("job-1")).toMatchObject({ id: "job-1" });

    const repo = makeJobRepo({ findById: vi.fn(async () => null) });
    const uc2 = new JobUseCases(repo, makeCandidateRepo());
    await expect(uc2.getJob("x")).rejects.toBeInstanceOf(NotFoundError);
  });

  it("deleteJob guards existence then deletes", async () => {
    const repo = makeJobRepo();
    const uc = new JobUseCases(repo, makeCandidateRepo());
    await uc.deleteJob("job-1");
    expect(repo.delete).toHaveBeenCalledWith("job-1");

    const repo2 = makeJobRepo({ findById: vi.fn(async () => null) });
    const uc2 = new JobUseCases(repo2, makeCandidateRepo());
    await expect(uc2.deleteJob("x")).rejects.toBeInstanceOf(NotFoundError);
    expect(repo2.delete).not.toHaveBeenCalled();
  });
});

// ─── syncJobsFromCareerSite ───────────────────────────────────────

describe("JobUseCases.syncJobsFromCareerSite", () => {
  it("throws when the scraper is not configured", async () => {
    const uc = new JobUseCases(makeJobRepo(), makeCandidateRepo());
    await expect(uc.syncJobsFromCareerSite()).rejects.toThrow(/scraper/i);
  });

  it("closes stale jobs only on a full scrape", async () => {
    const scraper = makeScraper({
      scrapeJobs: vi.fn(async () => [
        { externalId: "e1", title: "A", department: null, location: null, country: null, sourceUrl: "u1", type: "FULL_TIME" },
        { externalId: "e2", title: "B", department: null, location: null, country: null, sourceUrl: "u2", type: "INTERNSHIP" },
      ] as never),
    });
    const repo = makeJobRepo();
    const uc = new JobUseCases(repo, makeCandidateRepo(), scraper);

    const full = await uc.syncJobsFromCareerSite(0);
    expect(full.closed).toBe(3);
    expect(full.internships).toBe(1);
    expect(repo.closeStaleScrapedJobs).toHaveBeenCalled();
  });

  it("does not close stale jobs on a partial scrape", async () => {
    const scraper = makeScraper({
      scrapeJobs: vi.fn(async () => [
        { externalId: "e1", title: "A", department: null, location: null, country: null, sourceUrl: "u1", type: "FULL_TIME" },
      ] as never),
    });
    const repo = makeJobRepo();
    const uc = new JobUseCases(repo, makeCandidateRepo(), scraper);

    const partial = await uc.syncJobsFromCareerSite(5);
    expect(partial.closed).toBe(0);
    expect(repo.closeStaleScrapedJobs).not.toHaveBeenCalled();
  });
});

// ─── getOrParseRequirements ───────────────────────────────────────

describe("JobUseCases.getOrParseRequirements", () => {
  it("throws NotFoundError for a missing job", async () => {
    const repo = makeJobRepo({ findById: vi.fn(async () => null) });
    const uc = new JobUseCases(repo, makeCandidateRepo());
    await expect(uc.getOrParseRequirements("x")).rejects.toBeInstanceOf(NotFoundError);
  });

  it("returns the cached requirements when the cache is fresh", async () => {
    const repo = makeJobRepo({
      findById: vi.fn(async () => ({
        id: "job-1",
        parsedRequirements: FRESH_REQUIREMENTS,
        parsedRequirementsVersion: JOB_REQUIREMENTS_SCHEMA_VERSION,
      }) as never),
    });
    const extractor = makeExtractor();
    const uc = new JobUseCases(repo, makeCandidateRepo(), undefined, undefined, undefined, extractor);

    const req = await uc.getOrParseRequirements("job-1");
    expect(req.rawExtractionModel).toBe("cached-model");
    expect(extractor.extract).not.toHaveBeenCalled();
  });

  it("parses from the source page when the cache is missing", async () => {
    const repo = makeJobRepo({
      findById: vi.fn(async () => ({
        id: "job-1",
        title: "Engineer",
        description: null,
        sourceUrl: "https://careers/x",
        parsedRequirements: null,
        parsedRequirementsVersion: null,
      }) as never),
    });
    const scraper = makeScraper();
    const extractor = makeExtractor();
    const uc = new JobUseCases(repo, makeCandidateRepo(), scraper, undefined, undefined, extractor);

    await uc.getOrParseRequirements("job-1");
    expect(extractor.extract).toHaveBeenCalled();
    expect(repo.updateParsedRequirements).toHaveBeenCalled();
  });

  it("marks the job closed and throws JobClosedError when the posting is down", async () => {
    const repo = makeJobRepo({
      findById: vi.fn(async () => ({
        id: "job-1",
        title: "Engineer",
        description: null,
        sourceUrl: "https://careers/x",
        parsedRequirements: null,
        parsedRequirementsVersion: null,
      }) as never),
    });
    const scraper = makeScraper({
      fetchJobDescription: vi.fn(async () => ({ status: "CLOSED" })) as never,
    });
    const extractor = makeExtractor();
    const uc = new JobUseCases(repo, makeCandidateRepo(), scraper, undefined, undefined, extractor);

    await expect(uc.getOrParseRequirements("job-1")).rejects.toBeInstanceOf(JobClosedError);
    expect(repo.markClosed).toHaveBeenCalledWith("job-1");
  });
});

// ─── matchCandidatesToJob ─────────────────────────────────────────

describe("JobUseCases.matchCandidatesToJob", () => {
  it("ranks candidates by fit and persists the top-N", async () => {
    const repo = makeJobRepo({
      findById: vi.fn(async () => ({
        id: "job-1",
        title: "Engineer",
        sourceUrl: null,
        description: null,
        parsedRequirements: FRESH_REQUIREMENTS,
        parsedRequirementsVersion: JOB_REQUIREMENTS_SCHEMA_VERSION,
      }) as never),
    });
    const candidateRepo = makeCandidateRepo({
      findForMatching: vi.fn(async () => [
        { id: "c-1", firstName: "A", lastName: "One", experiences: [], languages: [], education: [], skills: [] },
        { id: "c-2", firstName: "B", lastName: "Two", experiences: [], languages: [], education: [], skills: [] },
      ] as never),
    });
    const extractor = makeExtractor();
    const uc = new JobUseCases(repo, candidateRepo, undefined, undefined, undefined, extractor);

    const result = await uc.matchCandidatesToJob("job-1");
    expect(result.job.id).toBe("job-1");
    expect(result.matches).toHaveLength(2);
    expect(repo.upsertMatch).toHaveBeenCalledTimes(2);
  });

  it("throws NotFoundError for a missing job", async () => {
    const repo = makeJobRepo({ findById: vi.fn(async () => null) });
    const uc = new JobUseCases(repo, makeCandidateRepo());
    await expect(uc.matchCandidatesToJob("x")).rejects.toBeInstanceOf(NotFoundError);
  });
});

// ─── forceReparseRequirements ─────────────────────────────────────

describe("JobUseCases.forceReparseRequirements", () => {
  it("throws NotFoundError for a missing job", async () => {
    const repo = makeJobRepo({ findById: vi.fn(async () => null) });
    const uc = new JobUseCases(repo, makeCandidateRepo(), undefined, undefined, undefined, makeExtractor());
    await expect(uc.forceReparseRequirements("x")).rejects.toBeInstanceOf(NotFoundError);
  });

  it("throws when the extractor is not configured", async () => {
    const uc = new JobUseCases(makeJobRepo(), makeCandidateRepo());
    await expect(uc.forceReparseRequirements("job-1")).rejects.toThrow(/extractor/i);
  });

  it("synthesizes requirements from HR form fields for a manual job", async () => {
    const repo = makeJobRepo({
      findById: vi.fn(async () => ({
        id: "job-1",
        title: "Manual",
        description: null,
        sourceUrl: null,
        requiredSkills: ["Java", "SQL"],
        department: "Technology",
      }) as never),
    });
    const uc = new JobUseCases(repo, makeCandidateRepo(), undefined, undefined, undefined, makeExtractor());

    const req = await uc.forceReparseRequirements("job-1");
    expect(req.requiredSkills).toEqual(["Java", "SQL"]);
    expect(req.rawExtractionModel).toBe("manual:hr-form");
    expect(repo.updateParsedRequirements).toHaveBeenCalled();
  });

  it("re-extracts from the source page even when a cache exists", async () => {
    const repo = makeJobRepo({
      findById: vi.fn(async () => ({
        id: "job-1",
        title: "Engineer",
        description: null,
        sourceUrl: "https://careers/x",
        parsedRequirements: FRESH_REQUIREMENTS,
        parsedRequirementsVersion: JOB_REQUIREMENTS_SCHEMA_VERSION,
      }) as never),
    });
    const extractor = makeExtractor();
    const uc = new JobUseCases(repo, makeCandidateRepo(), makeScraper(), undefined, undefined, extractor);

    await uc.forceReparseRequirements("job-1");
    expect(extractor.extract).toHaveBeenCalled();
  });

  it("marks closed and throws JobClosedError when the posting is down", async () => {
    const repo = makeJobRepo({
      findById: vi.fn(async () => ({
        id: "job-1",
        title: "Engineer",
        description: null,
        sourceUrl: "https://careers/x",
      }) as never),
    });
    const scraper = makeScraper({
      fetchJobDescription: vi.fn(async () => ({ status: "UNAVAILABLE" })) as never,
    });
    const uc = new JobUseCases(repo, makeCandidateRepo(), scraper, undefined, undefined, makeExtractor());

    await expect(uc.forceReparseRequirements("job-1")).rejects.toBeInstanceOf(JobClosedError);
    expect(repo.markClosed).toHaveBeenCalledWith("job-1");
  });
});

// ─── parsePendingJobRequirements ──────────────────────────────────

describe("JobUseCases.parsePendingJobRequirements", () => {
  it("throws when scraper or extractor is missing", async () => {
    const noScraper = new JobUseCases(makeJobRepo(), makeCandidateRepo());
    await expect(noScraper.parsePendingJobRequirements()).rejects.toThrow(/scraper/i);

    const noExtractor = new JobUseCases(makeJobRepo(), makeCandidateRepo(), makeScraper());
    await expect(noExtractor.parsePendingJobRequirements()).rejects.toThrow(/extractor/i);
  });

  it("returns a zero summary when there is nothing pending", async () => {
    const repo = makeJobRepo({ findUnparsedJobs: vi.fn(async () => []) });
    const uc = new JobUseCases(repo, makeCandidateRepo(), makeScraper(), undefined, undefined, makeExtractor());

    const summary = await uc.parsePendingJobRequirements();
    expect(summary).toMatchObject({ attempted: 0, parsed: 0, failed: 0 });
  });

  it("parses a pending job by fetching its JD body from the source", async () => {
    const repo = makeJobRepo({
      findUnparsedJobs: vi.fn(async () => [
        { id: "job-1", title: "Engineer", sourceUrl: "https://careers/x", description: null },
      ]),
    });
    const extractor = makeExtractor();
    const uc = new JobUseCases(repo, makeCandidateRepo(), makeScraper(), undefined, undefined, extractor);

    const summary = await uc.parsePendingJobRequirements(20, 0);
    expect(summary.parsed).toBe(1);
    expect(extractor.extract).toHaveBeenCalled();
  });

  it("skips and marks closed when a pending job's posting is down", async () => {
    const repo = makeJobRepo({
      findUnparsedJobs: vi.fn(async () => [
        { id: "job-1", title: "Engineer", sourceUrl: "https://careers/x", description: null },
      ]),
    });
    const scraper = makeScraper({
      fetchJobDescription: vi.fn(async () => ({ status: "CLOSED" })) as never,
    });
    const extractor = makeExtractor();
    const uc = new JobUseCases(repo, makeCandidateRepo(), scraper, undefined, undefined, extractor);

    const summary = await uc.parsePendingJobRequirements(20, 0);
    expect(summary.parsed).toBe(0);
    expect(repo.markClosed).toHaveBeenCalledWith("job-1");
    expect(extractor.extract).not.toHaveBeenCalled();
  });

  it("records a failure when a manual job has no usable signal", async () => {
    const repo = makeJobRepo({
      findUnparsedJobs: vi.fn(async () => [
        { id: "job-1", title: "Empty", sourceUrl: null, description: null },
      ]),
      findById: vi.fn(async () => ({ id: "job-1", title: "Empty" }) as never),
    });
    const uc = new JobUseCases(repo, makeCandidateRepo(), makeScraper(), undefined, undefined, makeExtractor());

    const summary = await uc.parsePendingJobRequirements(20, 0);
    expect(summary.failed).toBe(1);
    expect(summary.errors[0].jobId).toBe("job-1");
  });
});

// ─── updateJob: internship becomes ACTIVE ─────────────────────────

describe("JobUseCases.updateJob — internship activation", () => {
  it("notifies preference-eligible candidates when an internship goes ACTIVE", async () => {
    const repo = makeJobRepo({
      findById: vi.fn(async () => ({
        id: "job-1",
        type: "INTERNSHIP",
        internshipStatus: "DRAFT",
        title: "Summer Intern",
        country: "PT",
      }) as never),
    });
    const candidateRepo = makeCandidateRepo({
      findForMatching: vi.fn(async () => [{ id: "c-1", country: "PT" }] as never),
    });
    const notif = makeNotifRepo();
    const uc = new JobUseCases(repo, candidateRepo, undefined, notif);

    await uc.updateJob("job-1", { internshipStatus: "ACTIVE" } as never);

    const [rows] = (notif.createMany as ReturnType<typeof vi.fn>).mock.calls[0];
    expect(rows[0].type).toBe("INTERNSHIP_POSTED");
    expect(rows[0].candidateId).toBe("c-1");
  });
});
