/**
 * Profile Use Cases
 *
 * ONION LAYER: Application
 * DEPENDENCIES: Domain ports (inward only)
 *
 * Handles candidate profile retrieval and updates (the /api/me endpoint).
 * Replaces direct Prisma usage in the API route.
 */

import type { ICandidateRepository } from "@server/domain/ports/repositories";
import type { UpdateProfileInput } from "@server/application/dtos";
import { NotFoundError } from "@server/application/use-cases/candidate.use-cases";
import { Prisma } from "@prisma/client";
import type { IStorageService } from "@server/domain/ports/services";

const PROFILE_SELECT: Prisma.CandidateSelect = {
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
    select: {
      name: true,
      category: true,
    },
  },

  experiences: {
    select: {
      startDate: true,
      endDate: true,
      jobTitle: true,
      description: true,
    },
    orderBy: {
      startDate: "desc",
    },
  },
};

export class ProfileUseCases {
  constructor(
    private readonly candidateRepo: ICandidateRepository,
    private readonly storageService: IStorageService
  ) {}

  /**
   * Get the current candidate profile used by candidate-facing pages.
   * Auto-creates a demo PLATFORM profile if none exists.
   */
  async getCurrentProfile() {
    let candidate = await this.resolveCurrentCandidate({
      id: true,
    });

    if (!candidate) {
      candidate = await this.candidateRepo.createDefault(
        {
          firstName: "Demo",
          lastName: "Candidate",
          email: "demo.candidate@example.com",
          status: "NEW",
          sourceType: "PLATFORM",
        },
        {
          id: true,
        }
      );
    }

    return this.candidateRepo.findByIdWithSelect(candidate.id, PROFILE_SELECT);
  }

  /**
   * Update the current candidate's profile fields.
   */
  async updateProfile(input: UpdateProfileInput) {
    const existing = await this.resolveCurrentCandidate({
      id: true,
    });

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
    const existing = await this.resolveCurrentCandidate({
      id: true,
      rawCvUrl: true,
    });

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
      {
        rawCvUrl: null,
        rawCvText: null,
        parsedData: Prisma.JsonNull,
      },
      PROFILE_SELECT
    );
  }

  async deleteCurrentProfile() {
    const existing = await this.resolveCurrentCandidate({
      id: true,
      rawCvUrl: true,
      motivationLetterUrl: true,
      learningAgreementUrl: true,
      applications: {
        select: {
          learningAgreementUrl: true,
        },
      },
    });

    if (!existing) {
      throw new NotFoundError("No candidate profile found");
    }

    const urls = [
      existing.rawCvUrl,
      existing.motivationLetterUrl,
      existing.learningAgreementUrl,
      ...(existing.applications ?? []).map(
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
   * Resolve the current candidate record used by the candidate-facing portal.
   * Prefers a PLATFORM source candidate when one exists, otherwise falls back
   * to the oldest candidate for backwards compatibility with existing data.
   */
  private async resolveCurrentCandidate(select: Prisma.CandidateSelect) {
    const oldest = await this.candidateRepo.findFirstByCreation({
      id: true,
      sourceType: true,
    });

    if (!oldest) return null;
    if (oldest.sourceType === "PLATFORM") {
      return this.candidateRepo.findByIdWithSelect(oldest.id, select);
    }

    const platformCandidates = await this.candidateRepo.findMany({
      sourceType: "PLATFORM",
      page: 1,
      pageSize: 1,
      sortBy: "createdAt",
      sortOrder: "asc",
    });
    if (platformCandidates.data.length === 0) {
      return this.candidateRepo.findByIdWithSelect(oldest.id, select);
    }

    return this.candidateRepo.findByIdWithSelect(
      platformCandidates.data[0].id,
      select
    );
  }
}
