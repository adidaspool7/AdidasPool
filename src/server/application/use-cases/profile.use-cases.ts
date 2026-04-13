/**
 * Profile Use Cases
 *
 * ONION LAYER: Application
 * DEPENDENCIES: Domain ports (inward only)
 *
 * Handles candidate profile retrieval and updates (the /api/me endpoint).
 * Resolves the current candidate via Supabase Auth user_id.
 */

import type { ICandidateRepository } from "@server/domain/ports/repositories";
import type { UpdateProfileInput } from "@server/application/dtos";
import { NotFoundError } from "@server/application/use-cases/candidate.use-cases";
import type { IStorageService } from "@server/domain/ports/services";

const PROFILE_SELECT = {
  id: true,
  firstName: true,
  lastName: true,
  email: true,
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
    private readonly storageService: IStorageService
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

    return this.candidateRepo.updateWithSelect(
      existing.id,
      updateData,
      PROFILE_SELECT
    );
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
      ...(full?.applications ?? []).map(
        (application: { learningAgreementUrl?: string | null }) =>
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
   *   2. Auto-create a new PLATFORM candidate linked to the authenticated user
   *
   * Returns null if there is no authenticated session.
   */
  private async resolveCurrentCandidate() {
    // Dynamically import to avoid server/client boundary issues
    const { createClient } = await import("@/lib/supabase/server");
    const supabase = await createClient();

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return null;

    // Look up by user_id first
    const existing = await this.candidateRepo.findByUserId(user.id);
    if (existing) return existing;

    // Auto-create a PLATFORM candidate linked to this auth user
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
    });
  }
}
