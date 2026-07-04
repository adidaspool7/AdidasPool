/**
 * Batch 6b — HrProfileUseCases + AnalyticsUseCases (Application layer).
 * Thin orchestration: auto-create-on-first-access, partial update, activity
 * log, and the analytics dashboard fan-out. Ports mocked.
 */
import { describe, it, expect, vi } from "vitest";
import { HrProfileUseCases } from "@server/application/use-cases/hr-profile.use-cases";
import { AnalyticsUseCases } from "@server/application/use-cases/analytics.use-cases";
import type {
  IHrProfileRepository,
  INotificationRepository,
  IAnalyticsRepository,
} from "@server/domain/ports/repositories";

describe("HrProfileUseCases", () => {
  it("returns the existing profile when present", async () => {
    const repo = {
      findByUserId: vi.fn(async () => ({ userId: "u-1", firstName: "Rui" })),
      upsert: vi.fn(),
    } as unknown as IHrProfileRepository;
    const uc = new HrProfileUseCases(repo, {} as INotificationRepository);

    const p = await uc.getCurrentProfile("u-1");
    expect(p).toMatchObject({ firstName: "Rui" });
    expect(repo.upsert).not.toHaveBeenCalled();
  });

  it("auto-creates a default profile on first access", async () => {
    const repo = {
      findByUserId: vi.fn(async () => null),
      upsert: vi.fn(async (userId, data) => ({ userId, ...data })),
    } as unknown as IHrProfileRepository;
    const uc = new HrProfileUseCases(repo, {} as INotificationRepository);

    await uc.getCurrentProfile("u-1");
    expect(repo.upsert).toHaveBeenCalledWith("u-1", { firstName: "HR", lastName: "Manager" });
  });

  it("updateProfile delegates to upsert", async () => {
    const repo = {
      findByUserId: vi.fn(),
      upsert: vi.fn(async (userId, data) => ({ userId, ...data })),
    } as unknown as IHrProfileRepository;
    const uc = new HrProfileUseCases(repo, {} as INotificationRepository);

    await uc.updateProfile("u-1", { firstName: "Ana" } as never);
    expect(repo.upsert).toHaveBeenCalledWith("u-1", { firstName: "Ana" });
  });

  it("getActivity returns the HR user's triggered notifications", async () => {
    const notif = {
      findHrActivity: vi.fn(async () => [{ id: "n-1" }]),
    } as unknown as INotificationRepository;
    const uc = new HrProfileUseCases({} as IHrProfileRepository, notif);

    const rows = await uc.getActivity("hr@x.com");
    expect(rows).toHaveLength(1);
    expect(notif.findHrActivity).toHaveBeenCalledWith("hr@x.com");
  });
});

describe("AnalyticsUseCases.getDashboardAnalytics", () => {
  it("fans out to every analytics query and assembles the payload", async () => {
    const repo: IAnalyticsRepository = {
      getOverviewCounts: vi.fn(async () => ({ candidates: 5 })),
      getCandidatesByStatus: vi.fn(async () => [{ label: "NEW", value: 2 }]),
      getCandidatesByCountry: vi.fn(async () => [{ label: "PT", value: 3 }]),
      getTopSkills: vi.fn(async () => [{ label: "TS", value: 4 }]),
      getTopLanguages: vi.fn(async () => [{ label: "EN", value: 5 }]),
      getApplicationsPerJob: vi.fn(async () => []),
      getRecentApplicationTrend: vi.fn(async () => []),
      getScoreDistribution: vi.fn(async () => []),
    } as unknown as IAnalyticsRepository;
    const uc = new AnalyticsUseCases(repo);

    const result = await uc.getDashboardAnalytics();

    expect(result.overview).toEqual({ candidates: 5 });
    expect(result.pipeline).toEqual([{ label: "NEW", value: 2 }]);
    expect(repo.getCandidatesByCountry).toHaveBeenCalledWith(10);
    expect(repo.getTopSkills).toHaveBeenCalledWith(15);
    expect(repo.getRecentApplicationTrend).toHaveBeenCalledWith(30);
  });
});
