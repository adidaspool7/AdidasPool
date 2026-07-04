/**
 * Batch 6c — AssessmentUseCases (Application layer).
 * List delegation + createAssessment orchestration: magic-link generation,
 * candidate status transition to INVITED, and the best-effort in-app invite
 * notification. Interview evaluation is out of scope. Ports mocked.
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { AssessmentUseCases } from "@server/application/use-cases/assessment.use-cases";
import type {
  IAssessmentRepository,
  ICandidateRepository,
  INotificationRepository,
} from "@server/domain/ports/repositories";
import type { IEmailService } from "@server/domain/ports/services";
import type { CreateAssessmentInput } from "@server/application/dtos";

function makeAssessmentRepo(overrides: Partial<IAssessmentRepository> = {}): IAssessmentRepository {
  return {
    findMany: vi.fn(async () => []),
    create: vi.fn(async (d) => ({ id: "as-1", magicToken: "tok-123", expiresAt: d.expiresAt })),
    ...overrides,
  } as unknown as IAssessmentRepository;
}

function makeCandidateRepo(): ICandidateRepository {
  return { updateStatus: vi.fn(async () => undefined) } as unknown as ICandidateRepository;
}

function makeNotif(overrides: Partial<INotificationRepository> = {}): INotificationRepository {
  return { create: vi.fn(async (d) => ({ id: "n-1", ...d })), ...overrides } as unknown as INotificationRepository;
}

const email = {} as IEmailService;

beforeEach(() => vi.clearAllMocks());

describe("AssessmentUseCases.listAssessments", () => {
  it("forwards filters to the repository", async () => {
    const repo = makeAssessmentRepo();
    const uc = new AssessmentUseCases(repo, makeCandidateRepo(), email);
    await uc.listAssessments({ status: "PENDING" });
    expect(repo.findMany).toHaveBeenCalledWith({ status: "PENDING" });
  });
});

describe("AssessmentUseCases.createAssessment", () => {
  const input = {
    candidateId: "c-1",
    jobId: "job-1",
    templateId: "tpl-1",
    type: "TECHNICAL",
    language: "en",
  } as unknown as CreateAssessmentInput;

  it("creates the assessment, builds a magic link, and marks candidate INVITED", async () => {
    const repo = makeAssessmentRepo();
    const candidateRepo = makeCandidateRepo();
    const uc = new AssessmentUseCases(repo, candidateRepo, email);

    const result = await uc.createAssessment(input);

    expect(result.magicLink).toContain("/assess/tok-123");
    expect(candidateRepo.updateStatus).toHaveBeenCalledWith("c-1", "INVITED");
    const [created] = (repo.create as ReturnType<typeof vi.fn>).mock.calls[0];
    expect(created.expiresAt).toBeInstanceOf(Date);
  });

  it("fires an in-app ASSESSMENT_INVITE notification when configured", async () => {
    const notif = makeNotif();
    const uc = new AssessmentUseCases(makeAssessmentRepo(), makeCandidateRepo(), email, notif);

    await uc.createAssessment(input);
    expect(notif.create).toHaveBeenCalledWith(
      expect.objectContaining({ type: "ASSESSMENT_INVITE", candidateId: "c-1" })
    );
  });

  it("swallows notification failures without breaking creation", async () => {
    const errSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    const notif = makeNotif({
      create: vi.fn(async () => {
        throw new Error("down");
      }),
    });
    const uc = new AssessmentUseCases(makeAssessmentRepo(), makeCandidateRepo(), email, notif);

    const result = await uc.createAssessment(input);
    expect(result.assessment).toBeDefined();
    expect(errSpy).toHaveBeenCalled();
    errSpy.mockRestore();
  });
});
