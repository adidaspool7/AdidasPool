/**
 * Ambassador Use Cases
 *
 * ONION LAYER: Application
 * DEPENDENCIES: Domain ports only — no infrastructure imports.
 *
 * Covers:
 *  - HR program management (CRUD on ambassador_programs)
 *  - HR application management (list, status updates)
 *  - Public application submission (links candidate to program)
 */

import type {
  IAmbassadorProgramRepository,
  IAmbassadorApplicationRepository,
  ICandidateRepository,
  AmbassadorProgramRow,
  AmbassadorApplicationRow,
} from "@server/domain/ports/repositories";

export class NotFoundError extends Error {
  constructor(msg: string) {
    super(msg);
    this.name = "NotFoundError";
  }
}

export class ValidationError extends Error {
  constructor(msg: string) {
    super(msg);
    this.name = "ValidationError";
  }
}

export class AmbassadorUseCases {
  constructor(
    private readonly programRepo: IAmbassadorProgramRepository,
    private readonly applicationRepo: IAmbassadorApplicationRepository,
    private readonly candidateRepo: ICandidateRepository
  ) {}

  // ── Program management ──────────────────────────────────────────

  async listPrograms(opts?: {
    status?: string;
  }): Promise<AmbassadorProgramRow[]> {
    return this.programRepo.findAll(opts);
  }

  async getProgramById(id: string): Promise<AmbassadorProgramRow> {
    const program = await this.programRepo.findById(id);
    if (!program) throw new NotFoundError(`Ambassador program not found: ${id}`);
    return program;
  }

  async createProgram(data: {
    title: string;
    description?: string | null;
    cohort?: string | null;
    applicationDeadline?: string | null;
    location?: string | null;
    country?: string | null;
    requirements?: string | null;
    perks?: string | null;
    status?: string;
    maxApplicants?: number | null;
  }): Promise<AmbassadorProgramRow> {
    if (!data.title?.trim()) {
      throw new ValidationError("Program title is required");
    }
    return this.programRepo.create({
      title: data.title.trim(),
      description: data.description ?? null,
      cohort: data.cohort ?? null,
      applicationDeadline: data.applicationDeadline ?? null,
      location: data.location ?? null,
      country: data.country ?? null,
      requirements: data.requirements ?? null,
      perks: data.perks ?? null,
      status: data.status ?? "DRAFT",
      maxApplicants: data.maxApplicants ?? null,
    });
  }

  async updateProgram(
    id: string,
    data: Record<string, unknown>
  ): Promise<AmbassadorProgramRow> {
    await this.getProgramById(id); // throws NotFoundError if missing
    return this.programRepo.update(id, data);
  }

  async deleteProgram(id: string): Promise<void> {
    await this.getProgramById(id);
    await this.programRepo.delete(id);
  }

  // ── Application management (HR) ──────────────────────────────────

  async listApplications(
    programId: string
  ): Promise<AmbassadorApplicationRow[]> {
    await this.getProgramById(programId);
    return this.applicationRepo.findByProgram(programId);
  }

  async listApplicationsByCandidate(
    candidateId: string
  ): Promise<AmbassadorApplicationRow[]> {
    return this.applicationRepo.findByCandidate(candidateId);
  }

  async updateApplicationStatus(
    applicationId: string,
    status: string
  ): Promise<AmbassadorApplicationRow> {
    const VALID = [
      "SUBMITTED",
      "UNDER_REVIEW",
      "INVITED",
      "ASSESSED",
      "SHORTLISTED",
      "REJECTED",
      "WITHDRAWN",
    ];
    if (!VALID.includes(status)) {
      throw new ValidationError(`Invalid application status: ${status}`);
    }
    return this.applicationRepo.updateStatus(applicationId, status);
  }

  // ── Public application submission ─────────────────────────────────

  /**
   * Links an already-created candidate (from CV upload) to an ambassador
   * program. Also marks the candidate as source_type = 'AMBASSADOR' so they
   * are filtered out of the main talent pool.
   *
   * Called by the public apply API route AFTER uploadUseCases.uploadCandidateCv
   * has created/updated the candidate record.
   */
  async submitApplication(opts: {
    programId: string;
    candidateId: string;
    motivation?: string | null;
    university?: string | null;
    yearOfStudy?: string | null;
    previousExperience?: string | null;
    pitchVideoUrl?: string | null;
  }): Promise<AmbassadorApplicationRow> {
    // Verify program exists and is open
    const program = await this.programRepo.findById(opts.programId);
    if (!program) {
      throw new NotFoundError(`Ambassador program not found: ${opts.programId}`);
    }
    if (program.status !== "OPEN") {
      throw new ValidationError("This program is not currently accepting applications");
    }

    // Check for duplicate application
    const existing = await this.applicationRepo.findOne(
      opts.programId,
      opts.candidateId
    );
    if (existing) {
      throw new ValidationError(
        "An application for this program already exists from this email address"
      );
    }

    // Mark candidate as AMBASSADOR source so they are hidden from the main pool
    await this.candidateRepo.update(opts.candidateId, {
      sourceType: "AMBASSADOR",
    });

    // Tag the candidate so they can be targeted via bulk outreach
    await this.candidateRepo.addTag(opts.candidateId, "brand-ambassador");

    return this.applicationRepo.create({
      programId: opts.programId,
      candidateId: opts.candidateId,
      motivation: opts.motivation ?? null,
      university: opts.university ?? null,
      yearOfStudy: opts.yearOfStudy ?? null,
      previousExperience: opts.previousExperience ?? null,
      pitchVideoUrl: opts.pitchVideoUrl ?? null,
    });
  }
}
