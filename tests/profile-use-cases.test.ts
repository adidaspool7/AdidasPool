/**
 * Batch 4 — ProfileUseCases (Application layer).
 *
 * Exercises resolveCurrentCandidate's three-way resolution (by user_id,
 * by email-claim, auto-create) plus the profile update/delete flows.
 * The Supabase server client is mocked; a mutable auth state drives the
 * "who is logged in" branch per test.
 */
import { describe, it, expect, vi, beforeEach } from "vitest";

const authState = vi.hoisted(() => ({
  user: null as null | { id: string; email?: string; user_metadata?: Record<string, unknown> },
}));

vi.mock("@/lib/supabase/server", () => ({
  createClient: async () => ({
    auth: { getUser: async () => ({ data: { user: authState.user } }) },
  }),
}));

import { ProfileUseCases } from "@server/application/use-cases/profile.use-cases";
import { NotFoundError } from "@server/application/errors";
import type {
  ICandidateRepository,
  INotificationRepository,
  CandidateRow,
} from "@server/domain/ports/repositories";
import type { IStorageService } from "@server/domain/ports/services";
import type { UpdateProfileInput } from "@server/application/dtos";

function makeCandidateRepo(
  overrides: Partial<ICandidateRepository> = {}
): ICandidateRepository {
  const base: Partial<ICandidateRepository> = {
    findByUserId: vi.fn(async () => null),
    findByEmail: vi.fn(async () => null),
    findById: vi.fn(async (id: string) => ({ id }) as CandidateRow),
    findByIdWithSelect: vi.fn(async (id: string) => ({ id, firstName: "Ana" }) as CandidateRow),
    update: vi.fn(async (id, data) => ({ id, ...data })),
    updateWithSelect: vi.fn(async (id, data) => ({ id, ...data }) as CandidateRow),
    createDefault: vi.fn(async (data) => ({ id: "new-1", ...data }) as CandidateRow),
    delete: vi.fn(async () => undefined),
    ...overrides,
  };
  return base as ICandidateRepository;
}

function makeStorage(overrides: Partial<IStorageService> = {}): IStorageService {
  return { deleteFile: vi.fn(async () => undefined), ...overrides } as unknown as IStorageService;
}

function makeNotif(overrides: Partial<INotificationRepository> = {}): INotificationRepository {
  return { create: vi.fn(async (d) => ({ id: "n-1", ...d })), ...overrides } as unknown as INotificationRepository;
}

beforeEach(() => {
  authState.user = null;
  vi.clearAllMocks();
});

// ─── resolveCurrentCandidate (via getCurrentProfile) ──────────────

describe("ProfileUseCases.getCurrentProfile", () => {
  it("returns null when there is no authenticated session", async () => {
    const uc = new ProfileUseCases(makeCandidateRepo(), makeStorage());
    expect(await uc.getCurrentProfile()).toBeNull();
  });

  it("resolves by user_id and sets activatedAt on first login", async () => {
    authState.user = { id: "u-1" };
    const repo = makeCandidateRepo({
      findByUserId: vi.fn(async () => ({ id: "c-1", activatedAt: null }) as CandidateRow),
    });
    const uc = new ProfileUseCases(repo, makeStorage());

    await uc.getCurrentProfile();

    expect(repo.update).toHaveBeenCalledWith(
      "c-1",
      expect.objectContaining({ activatedAt: expect.any(String) })
    );
    expect(repo.findByIdWithSelect).toHaveBeenCalledWith("c-1", expect.any(Object));
  });

  it("does not re-activate an already-activated linked candidate", async () => {
    authState.user = { id: "u-1" };
    const repo = makeCandidateRepo({
      findByUserId: vi.fn(async () => ({ id: "c-1", activatedAt: "2026-01-01" }) as CandidateRow),
    });
    const uc = new ProfileUseCases(repo, makeStorage());

    await uc.getCurrentProfile();

    expect(repo.update).not.toHaveBeenCalled();
  });

  it("claims an unlinked email-matched candidate (sets user_id + activatedAt)", async () => {
    authState.user = { id: "u-1", email: "match@x.com" };
    const repo = makeCandidateRepo({
      findByUserId: vi.fn(async () => null),
      findByEmail: vi.fn(async () => ({ id: "c-2", userId: null, activatedAt: null }) as CandidateRow),
    });
    const uc = new ProfileUseCases(repo, makeStorage());

    await uc.getCurrentProfile();

    expect(repo.update).toHaveBeenCalledWith(
      "c-2",
      expect.objectContaining({ userId: "u-1", activatedAt: expect.any(String) })
    );
  });

  it("auto-creates a PLATFORM candidate, parsing the display name", async () => {
    authState.user = {
      id: "u-9",
      email: "new@x.com",
      user_metadata: { full_name: "Jane Marie Doe" },
    };
    const repo = makeCandidateRepo({
      findByUserId: vi.fn(async () => null),
      findByEmail: vi.fn(async () => null),
    });
    const uc = new ProfileUseCases(repo, makeStorage());

    await uc.getCurrentProfile();

    expect(repo.createDefault).toHaveBeenCalledWith(
      expect.objectContaining({
        firstName: "Jane",
        lastName: "Marie Doe",
        email: "new@x.com",
        sourceType: "PLATFORM",
        userId: "u-9",
      })
    );
  });
});

// ─── updateProfile ────────────────────────────────────────────────

describe("ProfileUseCases.updateProfile", () => {
  it("throws NotFoundError when no candidate is resolved", async () => {
    authState.user = null;
    const uc = new ProfileUseCases(makeCandidateRepo(), makeStorage());
    await expect(
      uc.updateProfile({ firstName: "X" } as UpdateProfileInput)
    ).rejects.toBeInstanceOf(NotFoundError);
  });

  it("normalises dateOfBirth and blank linkedinUrl, then persists", async () => {
    authState.user = { id: "u-1" };
    const repo = makeCandidateRepo({
      findByUserId: vi.fn(async () => ({ id: "c-1", activatedAt: "2026-01-01" }) as CandidateRow),
    });
    const uc = new ProfileUseCases(repo, makeStorage());

    await uc.updateProfile({
      dateOfBirth: "1998-05-10",
      linkedinUrl: "",
      firstName: "Ana",
    } as UpdateProfileInput);

    const [, data] = (repo.updateWithSelect as ReturnType<typeof vi.fn>).mock.calls[0];
    expect(data.dateOfBirth).toBeInstanceOf(Date);
    expect(data.linkedinUrl).toBeNull();
    expect(data.firstName).toBe("Ana");
  });

  it("fires an HR_PROFILE_UPDATED notification listing changed fields", async () => {
    authState.user = { id: "u-1" };
    const repo = makeCandidateRepo({
      findByUserId: vi.fn(async () => ({ id: "c-1", activatedAt: "2026-01-01" }) as CandidateRow),
    });
    const notif = makeNotif();
    const uc = new ProfileUseCases(repo, makeStorage(), notif);

    await uc.updateProfile({ bio: "hello" } as UpdateProfileInput);

    expect(notif.create).toHaveBeenCalledWith(
      expect.objectContaining({
        type: "HR_PROFILE_UPDATED",
        targetRole: "HR",
        candidateId: "c-1",
      })
    );
  });

  it("swallows notification failures and still returns the update result", async () => {
    const errSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    authState.user = { id: "u-1" };
    const repo = makeCandidateRepo({
      findByUserId: vi.fn(async () => ({ id: "c-1", activatedAt: "2026-01-01" }) as CandidateRow),
    });
    const notif = makeNotif({
      create: vi.fn(async () => {
        throw new Error("down");
      }),
    });
    const uc = new ProfileUseCases(repo, makeStorage(), notif);

    const result = await uc.updateProfile({ bio: "hi" } as UpdateProfileInput);

    expect(result).toMatchObject({ id: "c-1" });
    expect(errSpy).toHaveBeenCalled();
    errSpy.mockRestore();
  });
});

// ─── deleteCurrentCv / deleteCurrentProfile ───────────────────────

describe("ProfileUseCases.deleteCurrentCv", () => {
  it("throws NotFoundError when no candidate is resolved", async () => {
    authState.user = null;
    const uc = new ProfileUseCases(makeCandidateRepo(), makeStorage());
    await expect(uc.deleteCurrentCv()).rejects.toBeInstanceOf(NotFoundError);
  });

  it("best-effort deletes the CV blob then clears the columns", async () => {
    authState.user = { id: "u-1" };
    const repo = makeCandidateRepo({
      findByUserId: vi.fn(async () => ({ id: "c-1", activatedAt: "x", rawCvUrl: "https://blob/cv.pdf" }) as CandidateRow),
    });
    const storage = makeStorage();
    const uc = new ProfileUseCases(repo, storage);

    await uc.deleteCurrentCv();

    expect(storage.deleteFile).toHaveBeenCalledWith("https://blob/cv.pdf");
    expect(repo.updateWithSelect).toHaveBeenCalledWith(
      "c-1",
      expect.objectContaining({ rawCvUrl: null, rawCvText: null, parsedData: null }),
      expect.any(Object)
    );
  });
});

describe("ProfileUseCases.deleteCurrentProfile", () => {
  it("removes all associated blobs then deletes the candidate", async () => {
    authState.user = { id: "u-1" };
    const repo = makeCandidateRepo({
      findByUserId: vi.fn(async () => ({ id: "c-1", activatedAt: "x" }) as CandidateRow),
      findById: vi.fn(async () => ({
        id: "c-1",
        rawCvUrl: "https://blob/cv.pdf",
        motivationLetterUrl: "https://blob/mot.pdf",
        learningAgreementUrl: null,
        applications: [{ learningAgreementUrl: "https://blob/la.pdf" }],
      }) as CandidateRow),
    });
    const storage = makeStorage();
    const uc = new ProfileUseCases(repo, storage);

    await uc.deleteCurrentProfile();

    expect(storage.deleteFile).toHaveBeenCalledTimes(3);
    expect(repo.delete).toHaveBeenCalledWith("c-1");
  });
});
