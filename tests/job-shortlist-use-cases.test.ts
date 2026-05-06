/**
 * Phase 1 — Per-Job Shortlist use case tests.
 *
 * Verifies idempotent add, fit-snapshot at add time, and not-found
 * handling without touching the database. Repository ports are mocked.
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { ShortlistUseCases } from "../src/server/application/use-cases/shortlist.use-cases";
import { NotFoundError } from "../src/server/application/use-cases/candidate.use-cases";
import type {
  IShortlistRepository,
  ICandidateRepository,
  IJobRepository,
  ShortlistEntry,
} from "../src/server/domain/ports/repositories";

function makeShortlistRepoMock(): IShortlistRepository & {
  __addCalls: { args: unknown }[];
} {
  const calls: { args: unknown }[] = [];
  return {
    __addCalls: calls,
    async add(args) {
      calls.push({ args });
      const entry: ShortlistEntry = {
        id: "sh-1",
        jobId: args.jobId,
        candidateId: args.candidateId,
        addedBy: args.addedBy,
        addedAt: new Date(),
        fitScoreAtAdd: args.fitScoreAtAdd,
        notes: args.notes,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      return { entry, created: true };
    },
    async remove() {
      return true;
    },
    async findByJob() {
      return [];
    },
    async findByCandidate() {
      return [];
    },
    async findOne() {
      return null;
    },
    async updateNote() {
      return null;
    },
    async countByJob() {
      return 0;
    },
    async findCachedFitScore() {
      return null;
    },
  };
}

const jobRepoOk: Pick<IJobRepository, "findById"> = {
  findById: vi.fn(async (id: string) => ({ id, title: "Software Engineer" })),
};

const candidateRepoOk: Pick<ICandidateRepository, "findById"> = {
  findById: vi.fn(async (id: string) => ({ id, firstName: "A", lastName: "B" })),
};

describe("ShortlistUseCases.add", () => {
  beforeEach(() => vi.clearAllMocks());

  it("snapshots the cached fit score from the matches cache at add time", async () => {
    const repo = makeShortlistRepoMock();
    repo.findCachedFitScore = vi.fn(async () => 73.4);

    const uc = new ShortlistUseCases(
      repo,
      jobRepoOk as IJobRepository,
      candidateRepoOk as ICandidateRepository
    );

    const result = await uc.add("job-1", "cand-1", "hr@x.com", null);

    expect(repo.findCachedFitScore).toHaveBeenCalledWith("job-1", "cand-1");
    expect(result.entry.fitScoreAtAdd).toBe(73.4);
    expect(result.entry.addedBy).toBe("hr@x.com");
  });

  it("snapshots null when no cached match exists", async () => {
    const repo = makeShortlistRepoMock();
    repo.findCachedFitScore = vi.fn(async () => null);

    const uc = new ShortlistUseCases(
      repo,
      jobRepoOk as IJobRepository,
      candidateRepoOk as ICandidateRepository
    );

    const result = await uc.add("job-1", "cand-1", null, null);
    expect(result.entry.fitScoreAtAdd).toBeNull();
  });

  it("throws NotFoundError when job does not exist", async () => {
    const repo = makeShortlistRepoMock();
    const jobRepo: Pick<IJobRepository, "findById"> = {
      findById: vi.fn(async () => null),
    };
    const uc = new ShortlistUseCases(
      repo,
      jobRepo as IJobRepository,
      candidateRepoOk as ICandidateRepository
    );

    await expect(uc.add("missing", "cand-1", null, null)).rejects.toBeInstanceOf(
      NotFoundError
    );
  });

  it("throws NotFoundError when candidate does not exist", async () => {
    const repo = makeShortlistRepoMock();
    const candidateRepo: Pick<ICandidateRepository, "findById"> = {
      findById: vi.fn(async () => null),
    };
    const uc = new ShortlistUseCases(
      repo,
      jobRepoOk as IJobRepository,
      candidateRepo as ICandidateRepository
    );

    await expect(uc.add("job-1", "missing", null, null)).rejects.toBeInstanceOf(
      NotFoundError
    );
  });

  it("idempotent: returns existing entry with created=false on conflict", async () => {
    const existing: ShortlistEntry = {
      id: "sh-existing",
      jobId: "job-1",
      candidateId: "cand-1",
      addedBy: "earlier@x.com",
      addedAt: new Date("2026-01-01T00:00:00Z"),
      fitScoreAtAdd: 80,
      notes: "good fit",
      createdAt: new Date("2026-01-01T00:00:00Z"),
      updatedAt: new Date("2026-01-01T00:00:00Z"),
    };
    const repo = makeShortlistRepoMock();
    repo.add = vi.fn(async () => ({ entry: existing, created: false }));

    const uc = new ShortlistUseCases(
      repo,
      jobRepoOk as IJobRepository,
      candidateRepoOk as ICandidateRepository
    );

    const result = await uc.add("job-1", "cand-1", "later@x.com", null);
    expect(result.created).toBe(false);
    expect(result.entry.id).toBe("sh-existing");
    expect(result.entry.addedBy).toBe("earlier@x.com");
  });
});

describe("ShortlistUseCases.remove / list / updateNote", () => {
  it("delegates remove to repository", async () => {
    const repo = makeShortlistRepoMock();
    repo.remove = vi.fn(async () => true);
    const uc = new ShortlistUseCases(
      repo,
      jobRepoOk as IJobRepository,
      candidateRepoOk as ICandidateRepository
    );
    expect(await uc.remove("j", "c")).toBe(true);
    expect(repo.remove).toHaveBeenCalledWith("j", "c");
  });

  it("listByJob returns whatever the repo returns", async () => {
    const repo = makeShortlistRepoMock();
    repo.findByJob = vi.fn(async () => []);
    const uc = new ShortlistUseCases(
      repo,
      jobRepoOk as IJobRepository,
      candidateRepoOk as ICandidateRepository
    );
    const result = await uc.listByJob("j");
    expect(result).toEqual([]);
    expect(repo.findByJob).toHaveBeenCalledWith("j");
  });

  it("updateNote forwards to repo and returns null on missing entry", async () => {
    const repo = makeShortlistRepoMock();
    repo.updateNote = vi.fn(async () => null);
    const uc = new ShortlistUseCases(
      repo,
      jobRepoOk as IJobRepository,
      candidateRepoOk as ICandidateRepository
    );
    const out = await uc.updateNote("j", "c", "hello");
    expect(out).toBeNull();
    expect(repo.updateNote).toHaveBeenCalledWith("j", "c", "hello");
  });
});
