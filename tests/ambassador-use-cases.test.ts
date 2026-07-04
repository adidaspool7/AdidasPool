/**
 * Batch 3a — AmbassadorUseCases (Application layer).
 * Program CRUD guards, application-status validation, and the
 * submit-application flow (program-open check, duplicate guard,
 * source-type + tag side effects). All ports mocked.
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { AmbassadorUseCases } from "@server/application/use-cases/ambassador.use-cases";
import { NotFoundError, ValidationError } from "@server/application/errors";
import type {
  IAmbassadorProgramRepository,
  IAmbassadorApplicationRepository,
  ICandidateRepository,
  AmbassadorProgramRow,
  AmbassadorApplicationRow,
} from "@server/domain/ports/repositories";

function makeProgramRepo(
  overrides: Partial<IAmbassadorProgramRepository> = {}
): IAmbassadorProgramRepository {
  const base: Partial<IAmbassadorProgramRepository> = {
    findAll: vi.fn(async () => []),
    findById: vi.fn(async (id: string) => ({ id, status: "OPEN" }) as AmbassadorProgramRow),
    create: vi.fn(async (data) => ({ id: "p-1", ...data }) as AmbassadorProgramRow),
    update: vi.fn(async (id, data) => ({ id, ...data }) as AmbassadorProgramRow),
    delete: vi.fn(async () => undefined),
    ...overrides,
  };
  return base as IAmbassadorProgramRepository;
}

function makeAppRepo(
  overrides: Partial<IAmbassadorApplicationRepository> = {}
): IAmbassadorApplicationRepository {
  const base: Partial<IAmbassadorApplicationRepository> = {
    findByProgram: vi.fn(async () => []),
    findByCandidate: vi.fn(async () => []),
    findOne: vi.fn(async () => null),
    create: vi.fn(async (data) => ({ id: "app-1", ...data }) as AmbassadorApplicationRow),
    updateStatus: vi.fn(async (id, status) => ({ id, status }) as AmbassadorApplicationRow),
    ...overrides,
  };
  return base as IAmbassadorApplicationRepository;
}

function makeCandidateRepo(
  overrides: Partial<ICandidateRepository> = {}
): ICandidateRepository {
  const base: Partial<ICandidateRepository> = {
    update: vi.fn(async (id, data) => ({ id, ...data })),
    addTag: vi.fn(async () => undefined),
    ...overrides,
  };
  return base as ICandidateRepository;
}

describe("AmbassadorUseCases — programs", () => {
  beforeEach(() => vi.clearAllMocks());

  it("createProgram rejects a blank title", async () => {
    const uc = new AmbassadorUseCases(makeProgramRepo(), makeAppRepo(), makeCandidateRepo());
    await expect(uc.createProgram({ title: "   " })).rejects.toBeInstanceOf(
      ValidationError
    );
  });

  it("createProgram trims title and applies DRAFT default status", async () => {
    const programRepo = makeProgramRepo();
    const uc = new AmbassadorUseCases(programRepo, makeAppRepo(), makeCandidateRepo());
    await uc.createProgram({ title: "  Summer Squad  " });
    expect(programRepo.create).toHaveBeenCalledWith(
      expect.objectContaining({ title: "Summer Squad", status: "DRAFT" })
    );
  });

  it("getProgramById throws NotFoundError when missing", async () => {
    const uc = new AmbassadorUseCases(
      makeProgramRepo({ findById: vi.fn(async () => null) }),
      makeAppRepo(),
      makeCandidateRepo()
    );
    await expect(uc.getProgramById("x")).rejects.toBeInstanceOf(NotFoundError);
  });

  it("updateProgram checks existence before updating", async () => {
    const programRepo = makeProgramRepo({ findById: vi.fn(async () => null) });
    const uc = new AmbassadorUseCases(programRepo, makeAppRepo(), makeCandidateRepo());
    await expect(uc.updateProgram("x", { title: "y" })).rejects.toBeInstanceOf(
      NotFoundError
    );
    expect(programRepo.update).not.toHaveBeenCalled();
  });

  it("deleteProgram checks existence then deletes", async () => {
    const programRepo = makeProgramRepo();
    const uc = new AmbassadorUseCases(programRepo, makeAppRepo(), makeCandidateRepo());
    await uc.deleteProgram("p-1");
    expect(programRepo.delete).toHaveBeenCalledWith("p-1");
  });
});

describe("AmbassadorUseCases — applications", () => {
  beforeEach(() => vi.clearAllMocks());

  it("updateApplicationStatus rejects an invalid status", async () => {
    const uc = new AmbassadorUseCases(makeProgramRepo(), makeAppRepo(), makeCandidateRepo());
    await expect(
      uc.updateApplicationStatus("app-1", "BOGUS")
    ).rejects.toBeInstanceOf(ValidationError);
  });

  it("updateApplicationStatus accepts a valid status", async () => {
    const appRepo = makeAppRepo();
    const uc = new AmbassadorUseCases(makeProgramRepo(), appRepo, makeCandidateRepo());
    await uc.updateApplicationStatus("app-1", "SHORTLISTED");
    expect(appRepo.updateStatus).toHaveBeenCalledWith("app-1", "SHORTLISTED");
  });

  it("listApplications verifies the program exists first", async () => {
    const programRepo = makeProgramRepo({ findById: vi.fn(async () => null) });
    const uc = new AmbassadorUseCases(programRepo, makeAppRepo(), makeCandidateRepo());
    await expect(uc.listApplications("x")).rejects.toBeInstanceOf(NotFoundError);
  });
});

describe("AmbassadorUseCases.submitApplication", () => {
  beforeEach(() => vi.clearAllMocks());

  it("throws NotFoundError when the program does not exist", async () => {
    const uc = new AmbassadorUseCases(
      makeProgramRepo({ findById: vi.fn(async () => null) }),
      makeAppRepo(),
      makeCandidateRepo()
    );
    await expect(
      uc.submitApplication({ programId: "x", candidateId: "c-1" })
    ).rejects.toBeInstanceOf(NotFoundError);
  });

  it("throws ValidationError when the program is not OPEN", async () => {
    const uc = new AmbassadorUseCases(
      makeProgramRepo({ findById: vi.fn(async () => ({ id: "p-1", status: "DRAFT" }) as AmbassadorProgramRow) }),
      makeAppRepo(),
      makeCandidateRepo()
    );
    await expect(
      uc.submitApplication({ programId: "p-1", candidateId: "c-1" })
    ).rejects.toBeInstanceOf(ValidationError);
  });

  it("throws ValidationError on a duplicate application", async () => {
    const uc = new AmbassadorUseCases(
      makeProgramRepo(),
      makeAppRepo({ findOne: vi.fn(async () => ({ id: "app-existing" }) as AmbassadorApplicationRow) }),
      makeCandidateRepo()
    );
    await expect(
      uc.submitApplication({ programId: "p-1", candidateId: "c-1" })
    ).rejects.toBeInstanceOf(ValidationError);
  });

  it("marks the candidate as AMBASSADOR, tags them, and creates the application", async () => {
    const candidateRepo = makeCandidateRepo();
    const appRepo = makeAppRepo();
    const uc = new AmbassadorUseCases(makeProgramRepo(), appRepo, candidateRepo);

    await uc.submitApplication({
      programId: "p-1",
      candidateId: "c-1",
      motivation: "I love the brand",
    });

    expect(candidateRepo.update).toHaveBeenCalledWith("c-1", { sourceType: "AMBASSADOR" });
    expect(candidateRepo.addTag).toHaveBeenCalledWith("c-1", "brand-ambassador");
    expect(appRepo.create).toHaveBeenCalledWith(
      expect.objectContaining({ programId: "p-1", candidateId: "c-1", motivation: "I love the brand" })
    );
  });
});
