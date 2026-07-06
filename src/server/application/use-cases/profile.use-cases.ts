/**
 * Profile Use Cases
 *
 * ONION LAYER: Application
 * DEPENDENCIES: Domain ports (inward only)
 *
 * Handles candidate profile retrieval and updates (the /api/me endpoint).
 * Resolves the current candidate via Supabase Auth user_id.
 */

import type {
  ICandidateRepository,
  INotificationRepository,
} from "@server/domain/ports/repositories";
import type { UpdateProfileInput } from "@server/application/dtos";
import { NotFoundError } from "@server/application/errors";
import type { IStorageService } from "@server/domain/ports/services";

const PROFILE_SELECT = {
  id: true,
  firstName: true,
  lastName: true,
  email: true,
  secondaryEmail: true,
  phone: true,
  location: true,
  country: true,
  linkedinUrl: true,
  dateOfBirth: true,
  nationality: true,
  willingToRelocate: true,
  availability: true,
  workModel: true,
  bio: true,
  sourceType: true,
  createdAt: true,
  activatedAt: true,
  motivationLetterUrl: true,
  motivationLetterText: true,
  learningAgreementUrl: true,
  skills: {
    select: { name: true, category: true },
  },
  experiences: {
    select: {
      startDate: true,
      endDate: true,
      jobTitle: true,
      description: true,
    },
    orderBy: { startDate: "desc" },
  },
};

export class ProfileUseCases {
  constructor(
    private readonly candidateRepo: ICandidateRepository,
    private readonly storageService: IStorageService,
    private readonly notificationRepo?: INotificationRepository
  ) {}

  /**
   * Get the current candidate profile used by candidate-facing pages.
   * Resolves by authenticated user_id. Auto-creates a PLATFORM profile
   * if the user is authenticated but has no candidate record yet.
   */
  async getCurrentProfile() {
    const candidate = await this.resolveCurrentCandidate();
    if (!candidate) return null;
    return this.candidateRepo.findByIdWithSelect(candidate.id, PROFILE_SELECT);
  }

  /**
   * Update the current candidate's profile fields.
   */
  async updateProfile(input: UpdateProfileInput) {
    const existing = await this.resolveCurrentCandidate();

    if (!existing) {
      throw new NotFoundError("No candidate profile found");
    }

    const { dateOfBirth, linkedinUrl, ...rest } = input;
    const updateData: Record<string, unknown> = { ...rest };

    if (dateOfBirth !== undefined) {
      updateData.dateOfBirth = dateOfBirth ? new Date(dateOfBirth) : null;
    }

    if (linkedinUrl !== undefined) {
      updateData.linkedinUrl = linkedinUrl === "" ? null : linkedinUrl;
    }

    const result = await this.candidateRepo.updateWithSelect(
      existing.id,
      updateData,
      PROFILE_SELECT
    );

    // Notify HR — candidate edited their own profile (best-effort).
    // Stamp the field names that changed for context.
    if (this.notificationRepo && Object.keys(updateData).length > 0) {
      try {
        await this.notificationRepo.create({
          type: "HR_PROFILE_UPDATED",
          message: "A candidate updated their profile.",
          targetRole: "HR",
          candidateId: existing.id,
          metadata: { fields: Object.keys(updateData), source: "profile-edit" },
        });
      } catch (err) {
        console.error("Failed to create HR_PROFILE_UPDATED notification:", err);
      }
    }

    return result;
  }

  async deleteCurrentCv() {
    const existing = await this.resolveCurrentCandidate();

    if (!existing) {
      throw new NotFoundError("No candidate profile found");
    }

    if (existing.rawCvUrl) {
      try {
        await this.storageService.deleteFile(existing.rawCvUrl);
      } catch (error) {
        console.warn("Failed to delete CV file from storage:", error);
      }
    }

    return this.candidateRepo.updateWithSelect(
      existing.id,
      { rawCvUrl: null, rawCvText: null, parsedData: null },
      PROFILE_SELECT
    );
  }

  async deleteCurrentProfile() {
    const existing = await this.resolveCurrentCandidate();

    if (!existing) {
      throw new NotFoundError("No candidate profile found");
    }

    // Fetch full record for file URLs
    const full = await this.candidateRepo.findById(existing.id);

    const urls = [
      full?.rawCvUrl,
      full?.motivationLetterUrl,
      full?.learningAgreementUrl,
      ...((full?.applications ?? []) as Array<{ learningAgreementUrl?: string | null }>).map(
        (application) =>
          application.learningAgreementUrl ?? null
      ),
    ].filter(
      (url): url is string =>
        typeof url === "string" && url.trim().length > 0
    );

    await Promise.all(
      urls.map(async (url) => {
        try {
          await this.storageService.deleteFile(url);
        } catch (error) {
          console.warn("Failed to delete file from storage:", error);
        }
      })
    );

    await this.candidateRepo.delete(existing.id);
  }

  /**
   * Resolve the candidate record for the currently authenticated user.
   *
   * Priority:
   *   1. Candidate with matching user_id (authenticated user owns this record)
   *   2. Candidate with matching email but no user_id (HR-uploaded, claim it)
   *   3. Auto-create a new PLATFORM candidate linked to the authenticated user
   *
   * Steps 1 & 2 also ensure activatedAt is set on first login.
   * Returns null if there is no authenticated session.
   */
  private async resolveCurrentCandidate() {
    // Dynamically import to avoid server/client boundary issues
    const { createClient } = await import("@/lib/supabase/server");
    const supabase = await createClient();

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return null;

    // 1. Look up by user_id first (already linked)
    const existing = await this.candidateRepo.findByUserId(user.id);
    if (existing) {
      // Ensure activatedAt is set (first login activation)
      if (!existing.activatedAt) {
        await this.candidateRepo.update(existing.id, { activatedAt: new Date().toISOString() });
        existing.activatedAt = new Date().toISOString();
      }
      return existing;
    }

    // 2. Check for a candidate with the same email (HR-uploaded without user_id,
    //    or an existing record whose user_id wasn't linked / is stale).
    if (user.email) {
      const emailMatch = await this.candidateRepo.findByEmail(user.email);
      if (emailMatch) {
        if (emailMatch.userId !== user.id) {
          // Unlinked, or linked to a stale/different auth account. Because the
          // authenticated email matches this candidate's email, the current user is
          // the rightful owner — (re)claim the record so ownership-gated actions
          // (e.g. launching an interview via /api/interview/session) don't 403.
          const activatedAt = emailMatch.activatedAt ?? new Date().toISOString();
          await this.candidateRepo.update(emailMatch.id, {
            userId: user.id,
            activatedAt,
          });
          emailMatch.userId = user.id;
          emailMatch.activatedAt = activatedAt;
        } else if (!emailMatch.activatedAt) {
          await this.candidateRepo.update(emailMatch.id, { activatedAt: new Date().toISOString() });
          emailMatch.activatedAt = new Date().toISOString();
        }
        return emailMatch;
      }
    }

    // 3. Auto-create a new PLATFORM candidate linked to this auth user
    const name = (user.user_metadata?.full_name as string | undefined)
      ?? (user.user_metadata?.name as string | undefined)
      ?? "";
    const [firstName = "New", ...rest] = name.split(" ");
    const lastName = rest.join(" ") || "Candidate";

    return this.candidateRepo.createDefault({
      firstName,
      lastName,
      email: user.email ?? "",
      status: "NEW",
      sourceType: "PLATFORM",
      userId: user.id,
      activatedAt: new Date().toISOString(),
    });
  }
}
