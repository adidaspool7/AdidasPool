/**
 * Batch 2 — NotificationUseCases (Application layer).
 *
 * Covers the logic-bearing methods with all ports mocked:
 *   - thin delegations (listing, mark-as-read, preferences)
 *   - getTargetCandidatesForJob preference-aware targeting
 *   - updateCampaign status-transition guard
 *   - deleteCampaign deletion guard
 *   - sendCampaign standard + segment targeting, opt-out, batching
 *   - previewAudience segment fast-path + opt-out counting
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { NotificationUseCases } from "@server/application/use-cases/notification.use-cases";
import type {
  INotificationRepository,
  ICandidateRepository,
  ISegmentRepository,
  CandidateRow,
  CampaignRow,
  NotificationPreferencesRow,
} from "@server/domain/ports/repositories";

// ─── Mock builders ────────────────────────────────────────────────

function makeNotifRepo(
  overrides: Partial<INotificationRepository> = {}
): INotificationRepository {
  const base: Partial<INotificationRepository> = {
    findForCandidate: vi.fn(async () => []),
    findForHR: vi.fn(async () => []),
    countUnread: vi.fn(async () => 3),
    findById: vi.fn(async (id: string) => ({ id })),
    findInteractionHistory: vi.fn(async () => []),
    create: vi.fn(async (data) => ({ id: "n-1", ...data })),
    createMany: vi.fn(async (rows) => rows.length),
    markAsRead: vi.fn(async (id: string) => ({ id })),
    archiveNotification: vi.fn(async (id: string) => ({ id })),
    getPreferences: vi.fn(async () => null),
    upsertPreferences: vi.fn(async (candidateId, prefs) => ({ candidateId, ...prefs })),
    findCampaignById: vi.fn(async (id: string) => ({ id, status: "DRAFT" }) as CampaignRow),
    updateCampaign: vi.fn(async (id: string, data) => ({ id, ...data }) as CampaignRow),
    deleteCampaign: vi.fn(async () => undefined),
    ...overrides,
  };
  return base as INotificationRepository;
}

function makeCandidateRepo(
  candidates: CandidateRow[] = [],
  overrides: Partial<ICandidateRepository> = {}
): ICandidateRepository {
  const base: Partial<ICandidateRepository> = {
    findForNotifications: vi.fn(async () => candidates),
    findInternshipCandidateIds: vi.fn(async () => new Set<string>()),
    ...overrides,
  };
  return base as ICandidateRepository;
}

function makeSegmentRepo(memberIds: string[]): ISegmentRepository {
  return { findMemberIds: vi.fn(async () => memberIds) } as unknown as ISegmentRepository;
}

const prefs = (
  p: Partial<NotificationPreferencesRow>
): NotificationPreferencesRow => ({ ...p });

// ─── Thin delegations ─────────────────────────────────────────────

describe("NotificationUseCases — delegations", () => {
  it("listForCandidate forwards id + filters", async () => {
    const repo = makeNotifRepo();
    const uc = new NotificationUseCases(repo);
    await uc.listForCandidate("c-1", { archived: false } as never);
    expect(repo.findForCandidate).toHaveBeenCalledWith("c-1", { archived: false });
  });

  it("countUnread forwards scope", async () => {
    const repo = makeNotifRepo();
    const uc = new NotificationUseCases(repo);
    const n = await uc.countUnread("c-1", "CANDIDATE");
    expect(repo.countUnread).toHaveBeenCalledWith("c-1", "CANDIDATE");
    expect(n).toBe(3);
  });

  it("markAsRead / archiveNotification / getInteractionHistory delegate", async () => {
    const repo = makeNotifRepo();
    const uc = new NotificationUseCases(repo);
    await uc.markAsRead("n-1");
    await uc.archiveNotification("n-2");
    await uc.getInteractionHistory("c-1");
    expect(repo.markAsRead).toHaveBeenCalledWith("n-1");
    expect(repo.archiveNotification).toHaveBeenCalledWith("n-2");
    expect(repo.findInteractionHistory).toHaveBeenCalledWith("c-1");
  });

  it("updatePreferences forwards to upsert", async () => {
    const repo = makeNotifRepo();
    const uc = new NotificationUseCases(repo);
    await uc.updatePreferences("c-1", { jobNotifications: false });
    expect(repo.upsertPreferences).toHaveBeenCalledWith("c-1", {
      jobNotifications: false,
    });
  });
});

// ─── getTargetCandidatesForJob ────────────────────────────────────

describe("NotificationUseCases.getTargetCandidatesForJob", () => {
  const job = { id: "j-1", type: "FULL_TIME", country: "Portugal", department: "Retail" };

  it("returns [] when no candidate repository is wired", async () => {
    const uc = new NotificationUseCases(makeNotifRepo());
    expect(await uc.getTargetCandidatesForJob(job)).toEqual([]);
  });

  it("returns [] when there are no candidates", async () => {
    const uc = new NotificationUseCases(makeNotifRepo(), makeCandidateRepo([]));
    expect(await uc.getTargetCandidatesForJob(job)).toEqual([]);
  });

  it("includes candidates with no preferences (default receive-all)", async () => {
    const cands = [{ id: "c-1" }, { id: "c-2" }] as CandidateRow[];
    const uc = new NotificationUseCases(
      makeNotifRepo({ getPreferences: vi.fn(async () => null) }),
      makeCandidateRepo(cands)
    );
    expect(await uc.getTargetCandidatesForJob(job)).toEqual(["c-1", "c-2"]);
  });

  it("excludes a candidate who opted out of job notifications", async () => {
    const cands = [{ id: "c-1" }] as CandidateRow[];
    const uc = new NotificationUseCases(
      makeNotifRepo({ getPreferences: vi.fn(async () => prefs({ jobNotifications: false })) }),
      makeCandidateRepo(cands)
    );
    expect(await uc.getTargetCandidatesForJob(job)).toEqual([]);
  });

  it("excludes a candidate who opted out of internship notifications for an internship", async () => {
    const cands = [{ id: "c-1" }] as CandidateRow[];
    const uc = new NotificationUseCases(
      makeNotifRepo({ getPreferences: vi.fn(async () => prefs({ internshipNotifications: false })) }),
      makeCandidateRepo(cands)
    );
    const internship = { ...job, type: "INTERNSHIP" };
    expect(await uc.getTargetCandidatesForJob(internship)).toEqual([]);
  });

  it("respects onlyMyCountry and excludes a country mismatch", async () => {
    const cands = [{ id: "c-1", country: "Spain" }] as CandidateRow[];
    const uc = new NotificationUseCases(
      makeNotifRepo({
        getPreferences: vi.fn(async () =>
          prefs({ jobNotifications: true, onlyMyCountry: true })
        ),
      }),
      makeCandidateRepo(cands)
    );
    expect(await uc.getTargetCandidatesForJob(job)).toEqual([]);
  });

  it("applies field filters case-insensitively", async () => {
    const cands = [{ id: "c-1" }, { id: "c-2" }] as CandidateRow[];
    const uc = new NotificationUseCases(
      makeNotifRepo({
        getPreferences: vi.fn(async (id: string) =>
          id === "c-1"
            ? prefs({ jobNotifications: true, fieldFilters: ["retail"] })
            : prefs({ jobNotifications: true, fieldFilters: ["finance"] })
        ),
      }),
      makeCandidateRepo(cands)
    );
    // job.department = "Retail" → c-1 (retail) matches, c-2 (finance) excluded.
    expect(await uc.getTargetCandidatesForJob(job)).toEqual(["c-1"]);
  });
});

// ─── updateCampaign status-transition guard ───────────────────────

describe("NotificationUseCases.updateCampaign", () => {
  it("throws when the campaign is missing and a status is being set", async () => {
    const repo = makeNotifRepo({ findCampaignById: vi.fn(async () => null) });
    const uc = new NotificationUseCases(repo);
    await expect(uc.updateCampaign("x", { status: "SENT" })).rejects.toThrow(
      "Campaign not found"
    );
  });

  it("rejects an illegal DRAFT→SENT transition via update", async () => {
    const repo = makeNotifRepo({
      findCampaignById: vi.fn(async (id) => ({ id, status: "DRAFT" }) as CampaignRow),
    });
    const uc = new NotificationUseCases(repo);
    await expect(uc.updateCampaign("x", { status: "SENT" })).rejects.toThrow(
      /Cannot change status/
    );
  });

  it("allows a legal SENT→TERMINATED transition", async () => {
    const repo = makeNotifRepo({
      findCampaignById: vi.fn(async (id) => ({ id, status: "SENT" }) as CampaignRow),
    });
    const uc = new NotificationUseCases(repo);
    await uc.updateCampaign("x", { status: "TERMINATED" });
    expect(repo.updateCampaign).toHaveBeenCalledWith("x", { status: "TERMINATED" });
  });

  it("passes through a non-status update without validation", async () => {
    const repo = makeNotifRepo();
    const uc = new NotificationUseCases(repo);
    await uc.updateCampaign("x", { title: "New title" });
    expect(repo.findCampaignById).not.toHaveBeenCalled();
    expect(repo.updateCampaign).toHaveBeenCalledWith("x", { title: "New title" });
  });
});

// ─── deleteCampaign guard ─────────────────────────────────────────

describe("NotificationUseCases.deleteCampaign", () => {
  it("throws when the campaign is missing", async () => {
    const repo = makeNotifRepo({ findCampaignById: vi.fn(async () => null) });
    const uc = new NotificationUseCases(repo);
    await expect(uc.deleteCampaign("x")).rejects.toThrow("Campaign not found");
  });

  it("refuses to delete a SENT campaign", async () => {
    const repo = makeNotifRepo({
      findCampaignById: vi.fn(async (id) => ({ id, status: "SENT" }) as CampaignRow),
    });
    const uc = new NotificationUseCases(repo);
    await expect(uc.deleteCampaign("x")).rejects.toThrow(/Only Draft or Archived/);
  });

  it("deletes a DRAFT campaign", async () => {
    const repo = makeNotifRepo({
      findCampaignById: vi.fn(async (id) => ({ id, status: "DRAFT" }) as CampaignRow),
    });
    const uc = new NotificationUseCases(repo);
    await uc.deleteCampaign("x");
    expect(repo.deleteCampaign).toHaveBeenCalledWith("x");
  });

  it("deletes an ARCHIVED campaign", async () => {
    const repo = makeNotifRepo({
      findCampaignById: vi.fn(async (id) => ({ id, status: "ARCHIVED" }) as CampaignRow),
    });
    const uc = new NotificationUseCases(repo);
    await uc.deleteCampaign("x");
    expect(repo.deleteCampaign).toHaveBeenCalledWith("x");
  });
});

// ─── sendCampaign ─────────────────────────────────────────────────

describe("NotificationUseCases.sendCampaign", () => {
  beforeEach(() => vi.clearAllMocks());

  it("throws when the campaign is missing", async () => {
    const repo = makeNotifRepo({ findCampaignById: vi.fn(async () => null) });
    const uc = new NotificationUseCases(repo, makeCandidateRepo());
    await expect(uc.sendCampaign("x", "hr@x.com")).rejects.toThrow(
      "Campaign not found"
    );
  });

  it("throws when the campaign is not in DRAFT", async () => {
    const repo = makeNotifRepo({
      findCampaignById: vi.fn(async (id) => ({ id, status: "SENT" }) as CampaignRow),
    });
    const uc = new NotificationUseCases(repo, makeCandidateRepo());
    await expect(uc.sendCampaign("x", "hr@x.com")).rejects.toThrow(
      /already sent or cancelled/
    );
  });

  it("throws when no candidate repository is available", async () => {
    const repo = makeNotifRepo();
    const uc = new NotificationUseCases(repo);
    await expect(uc.sendCampaign("x", "hr@x.com")).rejects.toThrow(
      /Candidate repository required/
    );
  });

  it("sends to all candidates and marks the campaign SENT (standard targeting)", async () => {
    const cands = [{ id: "c-1" }, { id: "c-2" }] as CandidateRow[];
    const repo = makeNotifRepo({
      findCampaignById: vi.fn(async (id) => ({ id, status: "DRAFT", targetAll: true, body: "Hi" }) as CampaignRow),
    });
    const uc = new NotificationUseCases(repo, makeCandidateRepo(cands));

    const result = await uc.sendCampaign("camp-1", "hr@x.com");

    expect(result.recipientCount).toBe(2);
    expect(repo.createMany).toHaveBeenCalledTimes(1);
    expect(repo.updateCampaign).toHaveBeenCalledWith(
      "camp-1",
      expect.objectContaining({ status: "SENT", sentBy: "hr@x.com", recipientCount: 2 })
    );
  });

  it("excludes candidates who opted out of promotional notifications", async () => {
    const cands = [{ id: "c-1" }, { id: "c-2" }] as CandidateRow[];
    const repo = makeNotifRepo({
      findCampaignById: vi.fn(async (id) => ({ id, status: "DRAFT", targetAll: true, body: "Hi" }) as CampaignRow),
      getPreferences: vi.fn(async (id: string) =>
        id === "c-2" ? prefs({ promotionalNotifications: false }) : null
      ),
    });
    const uc = new NotificationUseCases(repo, makeCandidateRepo(cands));

    const result = await uc.sendCampaign("camp-1", "hr@x.com");

    expect(result.recipientCount).toBe(1);
  });

  it("restricts to segment members when the campaign has a segmentId", async () => {
    const cands = [{ id: "c-1" }, { id: "c-2" }, { id: "c-3" }] as CandidateRow[];
    const repo = makeNotifRepo({
      findCampaignById: vi.fn(async (id) => ({ id, status: "DRAFT", body: "Hi", segmentId: "seg-1" }) as CampaignRow),
    });
    const seg = makeSegmentRepo(["c-1", "c-3"]);
    const uc = new NotificationUseCases(repo, makeCandidateRepo(cands), seg);

    const result = await uc.sendCampaign("camp-1", "hr@x.com");

    expect(seg.findMemberIds).toHaveBeenCalledWith("seg-1");
    expect(result.recipientCount).toBe(2);
  });
});

// ─── previewAudience ──────────────────────────────────────────────

describe("NotificationUseCases.previewAudience", () => {
  it("returns 0 when no candidate repository is wired", async () => {
    const uc = new NotificationUseCases(makeNotifRepo());
    expect(await uc.previewAudience({ targetAll: true })).toBe(0);
  });

  it("uses the segment member count as a fast path", async () => {
    const seg = makeSegmentRepo(["c-1", "c-2", "c-3"]);
    const uc = new NotificationUseCases(
      makeNotifRepo(),
      makeCandidateRepo([{ id: "c-1" }] as CandidateRow[]),
      seg
    );
    expect(await uc.previewAudience({ targetAll: false, segmentId: "seg-1" })).toBe(3);
  });

  it("counts targetAll recipients while respecting promotional opt-out", async () => {
    const cands = [{ id: "c-1" }, { id: "c-2" }, { id: "c-3" }] as CandidateRow[];
    const uc = new NotificationUseCases(
      makeNotifRepo({
        getPreferences: vi.fn(async (id: string) =>
          id === "c-3" ? prefs({ promotionalNotifications: false }) : null
        ),
      }),
      makeCandidateRepo(cands)
    );
    expect(await uc.previewAudience({ targetAll: true })).toBe(2);
  });
});
