/**
 * Batch 3d — DashboardWidgetUseCases (Application layer).
 * Spec validation on read AND write, title trimming/limits, position
 * derivation, and CRUD delegation. Widget repo + query runner mocked.
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  DashboardWidgetUseCases,
  WidgetSpecValidationError,
} from "@server/application/use-cases/dashboard-widget.use-cases";
import type {
  IDashboardWidgetRepository,
  DashboardWidget,
} from "@server/domain/ports/repositories";

const VALID_SPEC = { metric: "candidates", dimension: "status", chartType: "bar" };

function makeWidgetRepo(
  overrides: Partial<IDashboardWidgetRepository> = {}
): IDashboardWidgetRepository {
  const base: Partial<IDashboardWidgetRepository> = {
    listForUser: vi.fn(async () => []),
    maxPositionForUser: vi.fn(async () => 2),
    create: vi.fn(async (data) => ({ id: "w-1", ...data }) as unknown as DashboardWidget),
    update: vi.fn(async (id, userId, data) => ({ id, userId, ...data }) as unknown as DashboardWidget),
    delete: vi.fn(async () => true),
    ...overrides,
  };
  return base as IDashboardWidgetRepository;
}

const runnerOk = vi.fn(async () => ({ data: [{ label: "NEW", value: 5 }] }) as never);

describe("DashboardWidgetUseCases — validation", () => {
  it("validateSpec throws WidgetSpecValidationError on a bad metric", () => {
    const uc = new DashboardWidgetUseCases(makeWidgetRepo(), runnerOk);
    expect(() => uc.validateSpec({ metric: "snacks", dimension: "status", chartType: "bar" })).toThrow(
      WidgetSpecValidationError
    );
  });

  it("validateSpec returns the parsed spec on valid input", () => {
    const uc = new DashboardWidgetUseCases(makeWidgetRepo(), runnerOk);
    expect(uc.validateSpec(VALID_SPEC)).toMatchObject(VALID_SPEC);
  });

  it("runQuery validates before executing", async () => {
    const runner = vi.fn(async () => ({ data: [] }) as never);
    const uc = new DashboardWidgetUseCases(makeWidgetRepo(), runner);
    await expect(uc.runQuery({ metric: "bad" })).rejects.toBeInstanceOf(
      WidgetSpecValidationError
    );
    expect(runner).not.toHaveBeenCalled();
  });

  it("runQuery executes the runner for a valid spec", async () => {
    const uc = new DashboardWidgetUseCases(makeWidgetRepo(), runnerOk);
    await uc.runQuery(VALID_SPEC);
    expect(runnerOk).toHaveBeenCalled();
  });
});

describe("DashboardWidgetUseCases — CRUD", () => {
  beforeEach(() => vi.clearAllMocks());

  it("createForUser validates the spec, derives next position, and trims title", async () => {
    const repo = makeWidgetRepo();
    const uc = new DashboardWidgetUseCases(repo, runnerOk);

    await uc.createForUser("user-1", { title: "  Status breakdown  ", spec: VALID_SPEC });

    expect(repo.create).toHaveBeenCalledWith(
      expect.objectContaining({
        userId: "user-1",
        title: "Status breakdown",
        position: 3, // maxPositionForUser (2) + 1
      })
    );
  });

  it("createForUser rejects an empty title", async () => {
    const uc = new DashboardWidgetUseCases(makeWidgetRepo(), runnerOk);
    await expect(
      uc.createForUser("user-1", { title: "   ", spec: VALID_SPEC })
    ).rejects.toBeInstanceOf(WidgetSpecValidationError);
  });

  it("createForUser rejects an invalid spec before touching the repo", async () => {
    const repo = makeWidgetRepo();
    const uc = new DashboardWidgetUseCases(repo, runnerOk);
    await expect(
      uc.createForUser("user-1", { title: "x", spec: { metric: "nope" } })
    ).rejects.toBeInstanceOf(WidgetSpecValidationError);
    expect(repo.create).not.toHaveBeenCalled();
  });

  it("updateForUser floors and clamps position", async () => {
    const repo = makeWidgetRepo();
    const uc = new DashboardWidgetUseCases(repo, runnerOk);
    await uc.updateForUser("w-1", "user-1", { position: 4.9 });
    expect(repo.update).toHaveBeenCalledWith("w-1", "user-1", { position: 4 });
  });

  it("updateForUser rejects a non-finite position", async () => {
    const uc = new DashboardWidgetUseCases(makeWidgetRepo(), runnerOk);
    await expect(
      uc.updateForUser("w-1", "user-1", { position: Infinity })
    ).rejects.toBeInstanceOf(WidgetSpecValidationError);
  });

  it("updateForUser validates a provided spec", async () => {
    const uc = new DashboardWidgetUseCases(makeWidgetRepo(), runnerOk);
    await expect(
      uc.updateForUser("w-1", "user-1", { spec: { metric: "bad" } })
    ).rejects.toBeInstanceOf(WidgetSpecValidationError);
  });

  it("deleteForUser delegates and returns the result", async () => {
    const repo = makeWidgetRepo();
    const uc = new DashboardWidgetUseCases(repo, runnerOk);
    const ok = await uc.deleteForUser("w-1", "user-1");
    expect(ok).toBe(true);
    expect(repo.delete).toHaveBeenCalledWith("w-1", "user-1");
  });
});
