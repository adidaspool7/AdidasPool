/**
 * Batch 6a — ApplicationUseCases (Application layer).
 * Apply / re-apply / withdraw / status-update flows and the HR + candidate
 * notification fan-out. All ports mocked.
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { ApplicationUseCases } from "@server/application/use-cases/application.use-cases";
import type {
  IJobApplicationRepository,
  INotificationRepository,
  IJobRepository,
} from "@server/domain/ports/repositories";

function makeAppRepo(overrides: Partial<IJobApplicationRepository> = {}): IJobApplicationRepository {
  return {
    findByCandidateId: vi.fn(async () => []),
    findAll: vi.fn(async () => []),
    findByJobAndCandidate: vi.fn(async () => null),
    create: vi.fn(async (d) => ({ id: "app-1", ...d })),
    updateStatus: vi.fn(async (id, status) => ({ id, status, jobId: "job-1", candidateId: "c-1" })),
    update: vi.fn(async (id, d) => ({ id, jobId: "job-1", candidateId: "c-1", ...d })),
    ...overrides,
  } as unknown as IJobApplicationRepository;
}

function makeNotif(overrides: Partial<INotificationRepository> = {}): INotificationRepository {
  return { create: vi.fn(async (d) => ({ id: "n-1", ...d })), ...overrides } as unknown as INotificationRepository;
}

function makeJobRepo(): IJobRepository {
  return { findById: vi.fn(async () => ({ id: "job-1", type: "INTERNSHIP" })) } as unknown as IJobRepository;
}

beforeEach(() => vi.clearAllMocks());

describe("ApplicationUseCases.applyToJob", () => {
  it("creates a new application and notifies HR + candidate", async () => {
    const appRepo = makeAppRepo();
    const notif = makeNotif();
    const uc = new ApplicationUseCases(appRepo, notif, makeJobRepo());

    const res = await uc.applyToJob("job-1", "c-1");
    expect(res.alreadyApplied).toBe(false);
    expect(appRepo.create).toHaveBeenCalledWith({ jobId: "job-1", candidateId: "c-1" });
    // HR_APPLICATION_RECEIVED + APPLICATION_RECEIVED
    expect(notif.create).toHaveBeenCalledTimes(2);
  });

  it("returns alreadyApplied for an existing active application", async () => {
    const appRepo = makeAppRepo({
      findByJobAndCandidate: vi.fn(async () => ({ id: "app-9", status: "SUBMITTED" })) as never,
    });
    const uc = new ApplicationUseCases(appRepo, makeNotif());
    const res = await uc.applyToJob("job-1", "c-1");
    expect(res.alreadyApplied).toBe(true);
    expect(appRepo.create).not.toHaveBeenCalled();
  });

  it("re-activates a previously withdrawn application", async () => {
    const appRepo = makeAppRepo({
      findByJobAndCandidate: vi.fn(async () => ({ id: "app-9", status: "WITHDRAWN" })) as never,
    });
    const uc = new ApplicationUseCases(appRepo, makeNotif(), makeJobRepo());
    const res = await uc.applyToJob("job-1", "c-1");
    expect(res.alreadyApplied).toBe(false);
    expect(appRepo.updateStatus).toHaveBeenCalledWith("app-9", "SUBMITTED");
  });
});

describe("ApplicationUseCases.withdrawApplication", () => {
  it("sets WITHDRAWN and notifies both the candidate and HR", async () => {
    const appRepo = makeAppRepo();
    const notif = makeNotif();
    const uc = new ApplicationUseCases(appRepo, notif, makeJobRepo());

    await uc.withdrawApplication("app-1");

    expect(appRepo.updateStatus).toHaveBeenCalledWith("app-1", "WITHDRAWN");
    const types = (notif.create as ReturnType<typeof vi.fn>).mock.calls.map((c) => c[0].type);
    expect(types).toEqual(["APPLICATION_WITHDRAWN", "HR_APPLICATION_WITHDRAWN"]);
  });
});

describe("ApplicationUseCases.updateApplication", () => {
  it("notifies the candidate only when status changes", async () => {
    const appRepo = makeAppRepo();
    const notif = makeNotif();
    const uc = new ApplicationUseCases(appRepo, notif, makeJobRepo());

    await uc.updateApplication("app-1", { learningAgreementUrl: "u" });
    expect(notif.create).not.toHaveBeenCalled();

    await uc.updateApplication("app-1", { status: "SHORTLISTED" });
    expect(notif.create).toHaveBeenCalledWith(
      expect.objectContaining({ type: "APPLICATION_STATUS_CHANGED" })
    );
  });
});
