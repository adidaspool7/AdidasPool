/**
 * Batch 3b — SegmentUseCases (Application layer).
 * Name validation, trimming, not-found on rename, and the empty-input
 * short-circuit in addMembers. All ports mocked.
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { SegmentUseCases } from "@server/application/use-cases/segment.use-cases";
import type {
  ISegmentRepository,
  SegmentRow,
} from "@server/domain/ports/repositories";

function makeSegmentRepo(
  overrides: Partial<ISegmentRepository> = {}
): ISegmentRepository {
  const base: Partial<ISegmentRepository> = {
    findAll: vi.fn(async () => []),
    findById: vi.fn(async (id: string) => ({ id }) as SegmentRow),
    create: vi.fn(async (data) => ({ id: "s-1", ...data }) as SegmentRow),
    update: vi.fn(async (id, data) => ({ id, ...data }) as SegmentRow),
    delete: vi.fn(async () => undefined),
    findMembers: vi.fn(async () => []),
    findMemberIds: vi.fn(async () => []),
    addMembers: vi.fn(async (_id, ids: string[]) => ids.length),
    removeMember: vi.fn(async () => undefined),
    ...overrides,
  };
  return base as ISegmentRepository;
}

describe("SegmentUseCases", () => {
  beforeEach(() => vi.clearAllMocks());

  it("createSegment rejects a blank name", async () => {
    const uc = new SegmentUseCases(makeSegmentRepo());
    await expect(
      uc.createSegment({ name: "  ", description: null, createdBy: "hr@x.com" })
    ).rejects.toThrow(/name is required/i);
  });

  it("createSegment trims the name", async () => {
    const repo = makeSegmentRepo();
    const uc = new SegmentUseCases(repo);
    await uc.createSegment({ name: "  VIPs  ", description: null, createdBy: "hr@x.com" });
    expect(repo.create).toHaveBeenCalledWith(
      expect.objectContaining({ name: "VIPs" })
    );
  });

  it("renameSegment rejects an empty new name", async () => {
    const uc = new SegmentUseCases(makeSegmentRepo());
    await expect(uc.renameSegment("s-1", { name: "   " })).rejects.toThrow(
      /cannot be empty/i
    );
  });

  it("renameSegment throws when the segment is not found", async () => {
    const repo = makeSegmentRepo({ update: vi.fn(async () => null as unknown as SegmentRow) });
    const uc = new SegmentUseCases(repo);
    await expect(uc.renameSegment("s-1", { description: "x" })).rejects.toThrow(
      /not found/i
    );
  });

  it("renameSegment trims a provided name before updating", async () => {
    const repo = makeSegmentRepo();
    const uc = new SegmentUseCases(repo);
    await uc.renameSegment("s-1", { name: "  New Name  " });
    expect(repo.update).toHaveBeenCalledWith(
      "s-1",
      expect.objectContaining({ name: "New Name" })
    );
  });

  it("addMembers short-circuits to 0 for an empty list without hitting the repo", async () => {
    const repo = makeSegmentRepo();
    const uc = new SegmentUseCases(repo);
    const n = await uc.addMembers("s-1", []);
    expect(n).toBe(0);
    expect(repo.addMembers).not.toHaveBeenCalled();
  });

  it("addMembers delegates for a non-empty list", async () => {
    const repo = makeSegmentRepo();
    const uc = new SegmentUseCases(repo);
    const n = await uc.addMembers("s-1", ["c-1", "c-2"]);
    expect(n).toBe(2);
    expect(repo.addMembers).toHaveBeenCalledWith("s-1", ["c-1", "c-2"]);
  });

  it("removeMember delegates to the repository", async () => {
    const repo = makeSegmentRepo();
    const uc = new SegmentUseCases(repo);
    await uc.removeMember("s-1", "c-1");
    expect(repo.removeMember).toHaveBeenCalledWith("s-1", "c-1");
  });
});
