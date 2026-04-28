/**
 * Candidate Use Cases
 *
 * ONION LAYER: Application
 * DEPENDENCIES: Domain ports (inward only)
 *
 * Orchestrates domain logic and infrastructure via ports.
 * Contains NO direct database or framework calls.
 */

import type { ICandidateRepository, CandidateRelationsInput, INotificationRepository } from "@server/domain/ports/repositories";
import type { IStorageService } from "@server/domain/ports/services";
import type { CandidateFilter } from "@server/application/dtos";

// Status messages sent to candidates when HR manually changes their status.
// Only statuses that HR assigns via the candidates table are listed here.
// System-set statuses (NEW, PARSED) are excluded intentionally.
const STATUS_NOTIFICATION_MESSAGE: Record<string, string> = {
  SCREENED:             "Your profile has been reviewed by our recruitment team.",
  BORDERLINE:           "Your application is under further consideration.",
  ON_IMPROVEMENT_TRACK: "You have been placed on an improvement track by our team.",
  OFFER_SENT:           "Great news — an offer has been proposed to you. Please check your email.",
  REJECTED:             "After careful consideration, we will not be moving forward with your application at this time.",
  HIRED:                "Congratulations! You have been selected to join us.",
  INVITED:              "You have been invited to the next stage of our process.",
  SHORTLISTED:          "You have been shortlisted for a position.",
};

export class CandidateUseCases {
  constructor(
    private readonly candidateRepo: ICandidateRepository,
    private readonly storageService?: IStorageService,
    private readonly notificationRepo?: INotificationRepository
  ) {}

  /**
   * List candidates with filtering, search, and pagination.
   */
  async listCandidates(filters: CandidateFilter) {
    return this.candidateRepo.findMany({
      search: filters.search,
      status: filters.status,
      country: filters.country,
      locationSearch: filters.locationSearch,
      minScore: filters.minScore,
      maxScore: filters.maxScore,
      language: filters.language,
      languageLevel: filters.languageLevel,
      sourceType: filters.sourceType,
      businessArea: filters.businessArea,
      shortlisted: filters.shortlisted,
      needsReview: filters.needsReview,
      excludeUnparsed: filters.excludeUnparsed,
      page: filters.page,
      pageSize: filters.pageSize,
      sortBy: filters.sortBy || "createdAt",
      sortOrder: filters.sortOrder,
    });
  }

  /**
   * Get a single candidate with all related data.
   */
  async getCandidateById(id: string) {
    const candidate = await this.candidateRepo.findById(id);
    if (!candidate) {
      throw new NotFoundError(`Candidate ${id} not found`);
    }
    return candidate;
  }

  /**
   * Update candidate data (manual edits by recruiter).
   */
  async updateCandidate(id: string, data: Record<string, unknown>) {
    const updated = await this.candidateRepo.update(id, data);

    // Fire a STATUS_CHANGE notification whenever HR changes the candidate status
    if (data.status && typeof data.status === "string" && this.notificationRepo) {
      const message = STATUS_NOTIFICATION_MESSAGE[data.status];
      if (message) {
        try {
          await this.notificationRepo.create({
            type: "STATUS_CHANGE",
            message,
            targetRole: "CANDIDATE",
            candidateId: id,
          });
        } catch (err) {
          console.error("Failed to create status-change notification:", err);
        }
      }
    }

    return updated;
  }

  /**
   * Update candidate personal data AND replace related records (experiences, education, languages, skills).
   */
  async updateCandidateWithRelations(
    id: string,
    data: Record<string, unknown>,
    relations: Partial<CandidateRelationsInput>
  ) {
    // Ensure the candidate exists
    const candidate = await this.candidateRepo.findById(id);
    if (!candidate) {
      throw new NotFoundError(`Candidate ${id} not found`);
    }

    // Update personal fields if any provided
    if (Object.keys(data).length > 0) {
      await this.candidateRepo.update(id, data);
    }

    // Replace related records if any provided
    const hasRelations =
      relations.experiences || relations.education ||
      relations.languages || relations.skills;
    if (hasRelations) {
      await this.candidateRepo.replaceRelatedRecords(id, {
        experiences: relations.experiences ?? [],
        education: relations.education ?? [],
        languages: relations.languages ?? [],
        skills: relations.skills ?? [],
      });
    }

    // Return the updated candidate
    return this.candidateRepo.findById(id);
  }

  /**
   * Add a collaborative note to a candidate.
   */
  async addNote(candidateId: string, author: string, content: string) {
    if (!author || !content) {
      throw new ValidationError("Author and content are required");
    }
    return this.candidateRepo.addNote(candidateId, author, content);
  }

  /**
   * Delete a candidate and all related data (experiences, education, languages,
   * skills, applications, assessments, etc. cascade via FK). Also removes the
   * stored CV + motivation letter blobs from storage (best-effort).
   */
  async deleteCandidate(id: string) {
    const candidate = await this.candidateRepo.findById(id);
    if (!candidate) {
      throw new NotFoundError(`Candidate ${id} not found`);
    }

    // Best-effort: remove files from storage. Failures here must not block the
    // DB delete — an orphaned blob is preferable to an orphaned DB row.
    if (this.storageService) {
      const urls = [
        candidate.rawCvUrl,
        candidate.motivationLetterUrl,
        candidate.learningAgreementUrl,
      ].filter((u): u is string => typeof u === "string" && u.trim().length > 0);

      await Promise.all(
        urls.map(async (url) => {
          try {
            await this.storageService!.deleteFile(url);
          } catch (err) {
            console.warn(`[deleteCandidate] Failed to delete ${url}:`, err);
          }
        })
      );
    }

    await this.candidateRepo.delete(id);
    return { id, deleted: true };
  }
}

// ============================================
// APPLICATION ERRORS
// ============================================

export class NotFoundError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "NotFoundError";
  }
}

export class ValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ValidationError";
  }
}
