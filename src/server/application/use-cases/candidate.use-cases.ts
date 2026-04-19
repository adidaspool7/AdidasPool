/**
 * Candidate Use Cases
 *
 * ONION LAYER: Application
 * DEPENDENCIES: Domain ports (inward only)
 *
 * Orchestrates domain logic and infrastructure via ports.
 * Contains NO direct database or framework calls.
 */

import type { ICandidateRepository, CandidateRelationsInput } from "@server/domain/ports/repositories";
import type { CandidateFilter } from "@server/application/dtos";

export class CandidateUseCases {
  constructor(private readonly candidateRepo: ICandidateRepository) {}

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
      needsReview: filters.needsReview,
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
    return this.candidateRepo.update(id, data);
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
