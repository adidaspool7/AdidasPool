/**
 * Job Shortlist Use Cases
 *
 * ONION LAYER: Application
 * DEPENDENCIES: Domain ports (inward only)
 *
 * Orchestrates per-job shortlist operations: HR can star a candidate
 * for a specific job, view the shortlist for that job, and view all
 * jobs a candidate has been shortlisted on.
 */

import type {
  IShortlistRepository,
  ICandidateRepository,
  IJobRepository,
  ShortlistEntry,
  ShortlistEntryWithCandidate,
  ShortlistEntryWithJob,
} from "@server/domain/ports/repositories";
import { NotFoundError } from "@server/application/errors";

export class ShortlistUseCases {
  constructor(
    private readonly shortlistRepo: IShortlistRepository,
    private readonly jobRepo: IJobRepository,
    private readonly candidateRepo: ICandidateRepository
  ) {}

  /**
   * Add a candidate to a job's shortlist. Idempotent: if the candidate
   * is already shortlisted on this job, the existing entry is returned
   * unchanged (`created: false`) instead of erroring on the UNIQUE
   * constraint. Snapshots the cached fit score from job_matches so we
   * can show "score at time of add" later even after re-ranking.
   */
  async add(
    jobId: string,
    candidateId: string,
    addedBy: string | null,
    notes: string | null = null
  ): Promise<{ entry: ShortlistEntry; created: boolean }> {
    const job = await this.jobRepo.findById(jobId);
    if (!job) throw new NotFoundError(`Job not found: ${jobId}`);

    const candidate = await this.candidateRepo.findById(candidateId);
    if (!candidate) throw new NotFoundError(`Candidate not found: ${candidateId}`);

    const fitScoreAtAdd = await this.shortlistRepo.findCachedFitScore(
      jobId,
      candidateId
    );

    return this.shortlistRepo.add({
      jobId,
      candidateId,
      addedBy,
      fitScoreAtAdd,
      notes,
    });
  }

  /**
   * Remove a candidate from a job's shortlist. Returns true if a row
   * was deleted, false if no such entry existed.
   */
  async remove(jobId: string, candidateId: string): Promise<boolean> {
    return this.shortlistRepo.remove(jobId, candidateId);
  }

  /**
   * List the shortlist for a job, enriched with candidate basics and
   * the current cached fit score (so HR can compare snapshot vs current).
   */
  async listByJob(jobId: string): Promise<ShortlistEntryWithCandidate[]> {
    return this.shortlistRepo.findByJob(jobId);
  }

  /**
   * List all jobs a candidate is shortlisted on (for the candidate
   * detail page "Shortlisted for" section).
   */
  async listByCandidate(candidateId: string): Promise<ShortlistEntryWithJob[]> {
    return this.shortlistRepo.findByCandidate(candidateId);
  }

  /**
   * Update the HR-visible note on an existing shortlist entry. Returns
   * null if no entry exists for (jobId, candidateId).
   */
  async updateNote(
    jobId: string,
    candidateId: string,
    notes: string | null
  ): Promise<ShortlistEntry | null> {
    return this.shortlistRepo.updateNote(jobId, candidateId, notes);
  }

  async countByJob(jobId: string): Promise<number> {
    return this.shortlistRepo.countByJob(jobId);
  }
}
