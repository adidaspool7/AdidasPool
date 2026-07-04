/**
 * Batch 1 — CandidateUseCases (Application layer).
 *
 * Exercises the orchestration logic with every port mocked — no database,
 * no storage, no framework. Focus areas:
 *   - listCandidates filter pass-through + AMBASSADOR exclusion rule
 *   - getCandidateById / findByUserId
 *   - updateCandidate STATUS_CHANGE notification branching
 *   - updateCandidateWithRelations not-found + conditional paths
 *   - addNote validation
 *   - deleteCandidate not-found + best-effort blob cleanup
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  CandidateUseCases,
  NotFoundError,
  ValidationError,
} from "@server/application/use-cases/candidate.use-cases";
import type {
  ICandidateRepository,
  INotificationRepository,
  CandidateRow,
} from "@server/domain/ports/repositories";
import type { IStorageService } from "@server/domain/ports/services";
import type { CandidateFilter } from "@server/application/dtos";

// ─── Mock builders ────────────────────────────────────────────────

function makeCandidateRepo(
  overrides: Partial<ICandidateRepository> = {}
): ICandidateRepository {
  const base: Partial<ICandidateRepository> = {
    findMany: vi.fn(async () => ({
      data: [],
      total: 0,
      page: 1,
      pageSize: 20,
      totalPages: 0,
    })),
    findById: vi.fn(async (id: string) => ({ id }) as CandidateRow),
    findByUserId: vi.fn(async () => null),
    update: vi.fn(async (id: string, data: Record<string, unknown>) => ({
      id,
      ...data,
    })),
    replaceRelatedRecords: vi.fn(async () => undefined),
    addNote: vi.fn(async (candidateId: string, author: string, content: string) => ({
      id: "note-1",
      candidateId,
      author,
      content,
    })),
    delete: vi.fn(async () => undefined),
    ...overrides,
  };
  return base as ICandidateRepository;
}

function makeNotificationRepo(
  overrides: Partial<INotificationRepository> = {}
): INotificationRepository {
  const base: Partial<INotificationRepository> = {
    create: vi.fn(async (data) => ({ id: "notif-1", ...data })),
    ...overrides,
  };
  return base as INotificationRepository;
}

function makeStorage(
  overrides: Partial<IStorageService> = {}
): IStorageService {
  const base: Partial<IStorageService> = {
    deleteFile: vi.fn(async () => undefined),
    ...overrides,
  };
  return base as IStorageService;
}

const baseFilter = (over: Partial<CandidateFilter> = {}): CandidateFilter =>
  ({ page: 1, pageSize: 20, ...over }) as CandidateFilter;

// ─── listCandidates ───────────────────────────────────────────────

describe("CandidateUseCases.listCandidates", () => {
  it("defaults sortBy to createdAt when not provided", async () => {
    const repo = makeCandidateRepo();
    const uc = new CandidateUseCases(repo);

    await uc.listCandidates(baseFilter());

    expect(repo.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ sortBy: "createdAt" })
    );
  });

  it("honours an explicit sortBy", async () => {
    const repo = makeCandidateRepo();
    const uc = new CandidateUseCases(repo);

    await uc.listCandidates(baseFilter({ sortBy: "overallCvScore" }));

    expect(repo.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ sortBy: "overallCvScore" })
    );
  });

  it("excludes AMBASSADOR candidates when no sourceType filter is set", async () => {
    const repo = makeCandidateRepo();
    const uc = new CandidateUseCases(repo);

    await uc.listCandidates(baseFilter());

    expect(repo.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ excludeSourceTypes: ["AMBASSADOR"] })
    );
  });

  it("does NOT exclude AMBASSADOR when a sourceType filter is explicitly set", async () => {
    const repo = makeCandidateRepo();
    const uc = new CandidateUseCases(repo);

    await uc.listCandidates(baseFilter({ sourceType: "AMBASSADOR" }));

    expect(repo.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ excludeSourceTypes: undefined })
    );
  });
});

// ─── getCandidateById / findByUserId ──────────────────────────────

describe("CandidateUseCases.getCandidateById", () => {
  it("returns the candidate when found", async () => {
    const repo = makeCandidateRepo({
      findById: vi.fn(async (id: string) => ({ id, firstName: "Ana" }) as CandidateRow),
    });
    const uc = new CandidateUseCases(repo);

    const result = await uc.getCandidateById("c-1");

    expect(result).toMatchObject({ id: "c-1", firstName: "Ana" });
  });

  it("throws NotFoundError when the candidate does not exist", async () => {
    const repo = makeCandidateRepo({ findById: vi.fn(async () => null) });
    const uc = new CandidateUseCases(repo);

    await expect(uc.getCandidateById("missing")).rejects.toBeInstanceOf(
      NotFoundError
    );
  });
});

describe("CandidateUseCases.findByUserId", () => {
  it("delegates to the repository", async () => {
    const repo = makeCandidateRepo({
      findByUserId: vi.fn(async (uid: string) => ({ id: "c-9", userId: uid }) as CandidateRow),
    });
    const uc = new CandidateUseCases(repo);

    const result = await uc.findByUserId("user-abc");

    expect(repo.findByUserId).toHaveBeenCalledWith("user-abc");
    expect(result).toMatchObject({ id: "c-9", userId: "user-abc" });
  });
});

// ─── updateCandidate + STATUS_CHANGE notification ─────────────────

describe("CandidateUseCases.updateCandidate", () => {
  beforeEach(() => vi.clearAllMocks());

  it("updates and returns the candidate", async () => {
    const repo = makeCandidateRepo();
    const uc = new CandidateUseCases(repo);

    const result = await uc.updateCandidate("c-1", { firstName: "New" });

    expect(repo.update).toHaveBeenCalledWith("c-1", { firstName: "New" });
    expect(result).toMatchObject({ id: "c-1", firstName: "New" });
  });

  it("fires a STATUS_CHANGE notification for a known HR status, with attribution", async () => {
    const repo = makeCandidateRepo();
    const notif = makeNotificationRepo();
    const uc = new CandidateUseCases(repo, undefined, notif);

    await uc.updateCandidate("c-1", { status: "HIRED" }, "hr@x.com");

    expect(notif.create).toHaveBeenCalledWith(
      expect.objectContaining({
        type: "STATUS_CHANGE",
        targetRole: "CANDIDATE",
        candidateId: "c-1",
        createdBy: "hr@x.com",
        metadata: { newStatus: "HIRED" },
      })
    );
  });

  it("does NOT fire a notification for a system status not in the message map", async () => {
    const repo = makeCandidateRepo();
    const notif = makeNotificationRepo();
    const uc = new CandidateUseCases(repo, undefined, notif);

    await uc.updateCandidate("c-1", { status: "PARSED" });

    expect(notif.create).not.toHaveBeenCalled();
  });

  it("does NOT fire a notification when no notificationRepo is wired", async () => {
    const repo = makeCandidateRepo();
    const uc = new CandidateUseCases(repo);

    // Should not throw even though status change would normally notify.
    const result = await uc.updateCandidate("c-1", { status: "HIRED" });
    expect(result).toMatchObject({ id: "c-1" });
  });

  it("does NOT fire a notification when status is not a string", async () => {
    const repo = makeCandidateRepo();
    const notif = makeNotificationRepo();
    const uc = new CandidateUseCases(repo, undefined, notif);

    await uc.updateCandidate("c-1", { status: 123 as unknown as string });

    expect(notif.create).not.toHaveBeenCalled();
  });

  it("swallows notification errors and still returns the updated candidate", async () => {
    const errSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    const repo = makeCandidateRepo();
    const notif = makeNotificationRepo({
      create: vi.fn(async () => {
        throw new Error("notif backend down");
      }),
    });
    const uc = new CandidateUseCases(repo, undefined, notif);

    const result = await uc.updateCandidate("c-1", { status: "REJECTED" });

    expect(result).toMatchObject({ id: "c-1" });
    expect(errSpy).toHaveBeenCalled();
    errSpy.mockRestore();
  });
});

// ─── updateCandidateWithRelations ─────────────────────────────────

describe("CandidateUseCases.updateCandidateWithRelations", () => {
  beforeEach(() => vi.clearAllMocks());

  it("throws NotFoundError when the candidate does not exist", async () => {
    const repo = makeCandidateRepo({ findById: vi.fn(async () => null) });
    const uc = new CandidateUseCases(repo);

    await expect(
      uc.updateCandidateWithRelations("missing", {}, {})
    ).rejects.toBeInstanceOf(NotFoundError);
  });

  it("updates personal fields only when some are provided", async () => {
    const repo = makeCandidateRepo();
    const uc = new CandidateUseCases(repo);

    await uc.updateCandidateWithRelations("c-1", { firstName: "Zoe" }, {});

    expect(repo.update).toHaveBeenCalledWith("c-1", { firstName: "Zoe" });
    expect(repo.replaceRelatedRecords).not.toHaveBeenCalled();
  });

  it("skips the personal update when data is empty", async () => {
    const repo = makeCandidateRepo();
    const uc = new CandidateUseCases(repo);

    await uc.updateCandidateWithRelations("c-1", {}, {});

    expect(repo.update).not.toHaveBeenCalled();
  });

  it("replaces related records when relations are provided, filling defaults", async () => {
    const repo = makeCandidateRepo();
    const uc = new CandidateUseCases(repo);

    await uc.updateCandidateWithRelations(
      "c-1",
      {},
      { skills: [{ name: "SQL", category: null }] }
    );

    expect(repo.replaceRelatedRecords).toHaveBeenCalledWith("c-1", {
      experiences: [],
      education: [],
      languages: [],
      skills: [{ name: "SQL", category: null }],
    });
  });

  it("returns the refreshed candidate from findById", async () => {
    const findById = vi
      .fn()
      .mockResolvedValueOnce({ id: "c-1" }) // existence check
      .mockResolvedValueOnce({ id: "c-1", firstName: "Updated" }); // final read
    const repo = makeCandidateRepo({ findById });
    const uc = new CandidateUseCases(repo);

    const result = await uc.updateCandidateWithRelations(
      "c-1",
      { firstName: "Updated" },
      {}
    );

    expect(result).toMatchObject({ id: "c-1", firstName: "Updated" });
  });
});

// ─── addNote ──────────────────────────────────────────────────────

describe("CandidateUseCases.addNote", () => {
  it("throws ValidationError when author is missing", async () => {
    const uc = new CandidateUseCases(makeCandidateRepo());
    await expect(uc.addNote("c-1", "", "hello")).rejects.toBeInstanceOf(
      ValidationError
    );
  });

  it("throws ValidationError when content is missing", async () => {
    const uc = new CandidateUseCases(makeCandidateRepo());
    await expect(uc.addNote("c-1", "hr@x.com", "")).rejects.toBeInstanceOf(
      ValidationError
    );
  });

  it("delegates to the repository when valid", async () => {
    const repo = makeCandidateRepo();
    const uc = new CandidateUseCases(repo);

    const note = await uc.addNote("c-1", "hr@x.com", "Strong candidate");

    expect(repo.addNote).toHaveBeenCalledWith("c-1", "hr@x.com", "Strong candidate");
    expect(note).toMatchObject({ id: "note-1", content: "Strong candidate" });
  });
});

// ─── deleteCandidate ──────────────────────────────────────────────

describe("CandidateUseCases.deleteCandidate", () => {
  beforeEach(() => vi.clearAllMocks());

  it("throws NotFoundError when the candidate does not exist", async () => {
    const repo = makeCandidateRepo({ findById: vi.fn(async () => null) });
    const uc = new CandidateUseCases(repo);

    await expect(uc.deleteCandidate("missing")).rejects.toBeInstanceOf(
      NotFoundError
    );
  });

  it("deletes present blob URLs then the DB row, returning a receipt", async () => {
    const repo = makeCandidateRepo({
      findById: vi.fn(async (id: string) => ({
        id,
        rawCvUrl: "https://blob/cv.pdf",
        motivationLetterUrl: "https://blob/letter.pdf",
        learningAgreementUrl: null,
      }) as CandidateRow),
    });
    const storage = makeStorage();
    const uc = new CandidateUseCases(repo, storage);

    const result = await uc.deleteCandidate("c-1");

    expect(storage.deleteFile).toHaveBeenCalledTimes(2);
    expect(storage.deleteFile).toHaveBeenCalledWith("https://blob/cv.pdf");
    expect(storage.deleteFile).toHaveBeenCalledWith("https://blob/letter.pdf");
    expect(repo.delete).toHaveBeenCalledWith("c-1");
    expect(result).toEqual({ id: "c-1", deleted: true });
  });

  it("ignores empty / whitespace-only blob URLs", async () => {
    const repo = makeCandidateRepo({
      findById: vi.fn(async (id: string) => ({
        id,
        rawCvUrl: "   ",
        motivationLetterUrl: "",
        learningAgreementUrl: null,
      }) as CandidateRow),
    });
    const storage = makeStorage();
    const uc = new CandidateUseCases(repo, storage);

    await uc.deleteCandidate("c-1");

    expect(storage.deleteFile).not.toHaveBeenCalled();
    expect(repo.delete).toHaveBeenCalledWith("c-1");
  });

  it("still deletes the DB row when a blob deletion fails", async () => {
    const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
    const repo = makeCandidateRepo({
      findById: vi.fn(async (id: string) => ({
        id,
        rawCvUrl: "https://blob/cv.pdf",
      }) as CandidateRow),
    });
    const storage = makeStorage({
      deleteFile: vi.fn(async () => {
        throw new Error("storage 500");
      }),
    });
    const uc = new CandidateUseCases(repo, storage);

    const result = await uc.deleteCandidate("c-1");

    expect(result).toEqual({ id: "c-1", deleted: true });
    expect(repo.delete).toHaveBeenCalledWith("c-1");
    expect(warnSpy).toHaveBeenCalled();
    warnSpy.mockRestore();
  });

  it("works without a storage service (no blob cleanup attempted)", async () => {
    const repo = makeCandidateRepo({
      findById: vi.fn(async (id: string) => ({
        id,
        rawCvUrl: "https://blob/cv.pdf",
      }) as CandidateRow),
    });
    const uc = new CandidateUseCases(repo);

    const result = await uc.deleteCandidate("c-1");

    expect(result).toEqual({ id: "c-1", deleted: true });
    expect(repo.delete).toHaveBeenCalledWith("c-1");
  });
});
