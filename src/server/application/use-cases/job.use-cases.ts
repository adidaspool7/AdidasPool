/**
 * Job Use Cases
 *
 * ONION LAYER: Application
 * DEPENDENCIES: Domain ports + domain services (inward only)
 *
 * Orchestrates job operations (create, update, scrape). Candidate-to-job
 * scoring was intentionally removed in favor of a job-anchored scoring
 * model — see docs/JOB_ANCHORED_MATCHING_PLAN.md.
 */

import type {
  IJobRepository,
  ICandidateRepository,
  INotificationRepository,
  IJobApplicationRepository,
} from "@server/domain/ports/repositories";
import type { IJobScraperService } from "@server/domain/ports/services";
import type { CreateJobInput } from "@server/application/dtos";
import type { UpdateJobInput } from "@server/application/dtos";
import { NotFoundError } from "./candidate.use-cases";
import {
  JobRequirementsSchema,
  JOB_REQUIREMENTS_SCHEMA_VERSION,
  type JobRequirements,
} from "@server/domain/services/job-requirements.schema";

/**
 * Minimal port for the Phase-1 job requirements extractor.
 * Structural type so the application layer does not import the
 * infrastructure class directly.
 */
export interface IJobRequirementsExtractor {
  extract(jdText: string): Promise<Record<string, unknown>>;
  readonly schemaVersion: number;
}

export class JobUseCases {
  constructor(
    private readonly jobRepo: IJobRepository,
    private readonly candidateRepo: ICandidateRepository,
    private readonly jobScraperService?: IJobScraperService,
    private readonly notificationRepo?: INotificationRepository,
    private readonly applicationRepo?: IJobApplicationRepository,
    private readonly requirementsExtractor?: IJobRequirementsExtractor
  ) {}

  /**
   * List job openings with pagination and optional search.
   */
  async listJobs(options?: {
    page?: number;
    pageSize?: number;
    search?: string;
    type?: string;
    excludeType?: string;
    internshipStatus?: string;
    department?: string;
  }) {
    return this.jobRepo.findMany(options);
  }

  /**
   * Create a new job opening.
   */
  async createJob(data: CreateJobInput) {
    // Convert date strings to Date objects for the repository layer
    const dbData: Record<string, unknown> = { ...data };
    if (data.startDate) dbData.startDate = new Date(data.startDate);
    if (data.endDate) dbData.endDate = new Date(data.endDate);
    // Default internship status for internship types
    if (data.type === "INTERNSHIP" && !data.internshipStatus) {
      dbData.internshipStatus = "DRAFT";
    }

    const job = await this.jobRepo.create(dbData);

    // Notify candidates in-app about new postings (preference-aware).
    try {
      if (this.notificationRepo) {
        const shouldNotifyInternship = job.type === "INTERNSHIP" && job.internshipStatus === "ACTIVE";
        const shouldNotifyJob = job.type !== "INTERNSHIP";

        if (shouldNotifyInternship || shouldNotifyJob) {
          const isInternship = job.type === "INTERNSHIP";
          const notifType = isInternship ? "INTERNSHIP_POSTED" : "JOB_POSTED";
          const message = `${isInternship ? "New internship" : "New job"} posted: ${job.title}`;

          // Load all prefs for targeting
          const candidates = await this.candidateRepo.findForMatching();
          const targetIds: string[] = [];

          for (const c of candidates) {
            const prefs = await this.notificationRepo.getPreferences(c.id);
            if (!prefs) { targetIds.push(c.id); continue; }
            if (isInternship && !prefs.internshipNotifications) continue;
            if (!isInternship && !prefs.jobNotifications) continue;
            if (prefs.onlyMyCountry && c.country && job.country && c.country !== job.country) continue;
            if (prefs.fieldFilters?.length > 0 && job.department) {
              const match = prefs.fieldFilters.some(
                (f: string) => f.toLowerCase() === (job.department as string).toLowerCase()
              );
              if (!match) continue;
            }
            targetIds.push(c.id);
          }

          if (targetIds.length > 0) {
            await this.notificationRepo.createMany(
              targetIds.map((candidateId) => ({
                type: notifType,
                message,
                targetRole: "CANDIDATE",
                jobId: job.id,
                candidateId,
              }))
            );
          }
        }
      }
    } catch (err) {
      console.error("Failed to create job-posted notifications:", err);
    }

    return job;
  }

  /**
   * Update an existing job/internship.
   */
  async updateJob(id: string, data: UpdateJobInput) {
    const job = await this.jobRepo.findById(id);
    if (!job) {
      throw new NotFoundError(`Job ${id} not found`);
    }
    const oldStatus = job.internshipStatus;
    const dbData: Record<string, unknown> = { ...data };
    if (data.startDate !== undefined) {
      dbData.startDate = data.startDate ? new Date(data.startDate) : null;
    }
    if (data.endDate !== undefined) {
      dbData.endDate = data.endDate ? new Date(data.endDate) : null;
    }
    // Clean empty mentorEmail
    if (dbData.mentorEmail === "") dbData.mentorEmail = null;
    const updated = await this.jobRepo.update(id, dbData);

    // Notify on state change (e.g. internship goes ACTIVE)
    try {
      if (this.notificationRepo && data.internshipStatus && data.internshipStatus !== oldStatus) {
        // If internship just became ACTIVE, notify candidates like a new posting
        if (data.internshipStatus === "ACTIVE" && job.type === "INTERNSHIP") {
          const candidates = await this.candidateRepo.findForMatching();
          const targetIds: string[] = [];
          for (const c of candidates) {
            const prefs = await this.notificationRepo.getPreferences(c.id);
            if (!prefs) { targetIds.push(c.id); continue; }
            if (!prefs.internshipNotifications) continue;
            if (prefs.onlyMyCountry && c.country && job.country && c.country !== job.country) continue;
            if (prefs.fieldFilters?.length > 0 && job.department) {
              const match = prefs.fieldFilters.some(
                (f: string) => f.toLowerCase() === (job.department as string).toLowerCase()
              );
              if (!match) continue;
            }
            targetIds.push(c.id);
          }
          if (targetIds.length > 0) {
            await this.notificationRepo.createMany(
              targetIds.map((candidateId) => ({
                type: "INTERNSHIP_POSTED",
                message: `New internship is now active: ${job.title}`,
                targetRole: "CANDIDATE",
                jobId: job.id,
                candidateId,
              }))
            );
          }
        }

        // Notify candidates who applied about the state change
        if (data.internshipStatus !== "ACTIVE") {
          // Notify HR about the state change
          await this.notificationRepo.create({
            type: "JOB_STATE_CHANGED",
            message: `${job.title} status changed from ${oldStatus} to ${data.internshipStatus}.`,
            targetRole: "HR",
            jobId: job.id,
          });
        }
      }
    } catch (err) {
      console.error("Failed to create state-change notifications:", err);
    }

    return updated;
  }

  /**
   * Get a single job by ID.
   */
  async getJob(id: string) {
    const job = await this.jobRepo.findById(id);
    if (!job) {
      throw new NotFoundError(`Job ${id} not found`);
    }
    return job;
  }

  /**
   * Delete a job/internship by ID.
   * Related applications, matches, assessments, and notifications are cascade-deleted by DB.
   */
  async deleteJob(id: string) {
    const job = await this.jobRepo.findById(id);
    if (!job) {
      throw new NotFoundError(`Job ${id} not found`);
    }
    await this.jobRepo.delete(id);
  }


  /**
   * Sync jobs from the external adidas careers portal.
   *
   * Scrapes the career site, compares with existing jobs by externalId,
   * and upserts (create or update) accordingly.
   *
   * @param maxPages - Limit pages to scrape (0 = all). Default: 5 for safety.
   * @returns Summary of sync operation.
   */
  async syncJobsFromCareerSite(maxPages: number = 5) {
    if (!this.jobScraperService) {
      throw new Error("Job scraper service is not configured");
    }

    const startTime = Date.now();
    const scrapedJobs = await this.jobScraperService.scrapeJobs(maxPages);

    const internships = scrapedJobs.filter((j) => j.type === "INTERNSHIP").length;

    // Bulk upsert all scraped jobs in batched HTTP calls instead of 1-by-1.
    // Supabase .upsert() with onConflict:"external_id" handles create/update.
    const { created, updated } = await this.jobRepo.bulkUpsertByExternalId(
      scrapedJobs.map((j) => ({
        externalId: j.externalId,
        title: j.title,
        department: j.department,
        location: j.location,
        country: j.country,
        sourceUrl: j.sourceUrl,
        description: j.description ?? null,
        // Preserve detected employment type (e.g. INTERNSHIP) so scraped
        // internships land on the Internships page and not Job Openings.
        type: j.type ?? "FULL_TIME",
      }))
    );

    const durationMs = Date.now() - startTime;

    return {
      success: true,
      scraped: scrapedJobs.length,
      internships,
      created,
      updated,
      failed: 0,
      errors: [],
      durationMs,
      timestamp: new Date().toISOString(),
    };
  }

  /**
   * Phase-1 worker: find jobs with no parsed_requirements, fetch their JD
   * body from the source_url, pass it through the LLM extractor, and persist
   * the structured result.
   *
   * Bounded by `limit` — each run advances a batch, so repeated runs (manual
   * or scheduled) eventually cover the corpus without blowing up LLM rate
   * limits.
   */
  async parsePendingJobRequirements(
    limit: number = 20,
    delayMs: number = 1000
  ): Promise<{
    attempted: number;
    parsed: number;
    failed: number;
    errors: Array<{ jobId: string; error: string }>;
    durationMs: number;
  }> {
    if (!this.jobScraperService) {
      throw new Error("Job scraper service is not configured");
    }
    if (!this.requirementsExtractor) {
      throw new Error("Job requirements extractor is not configured");
    }

    const startedAt = Date.now();
    const pending = await this.jobRepo.findUnparsedJobs(limit);

    let parsed = 0;
    let failed = 0;
    const errors: Array<{ jobId: string; error: string }> = [];

    for (let i = 0; i < pending.length; i++) {
      const job = pending[i];
      try {
        let jdText = job.description ?? "";
        if (!jdText || jdText.trim().length < 200) {
          // Description not on file — fetch from source page.
          if (!job.sourceUrl) {
            throw new Error("No source_url and no on-file description");
          }
          const fetched = await this.jobScraperService.fetchJobDescription(
            job.sourceUrl
          );
          if (!fetched) throw new Error("Failed to fetch JD body");
          jdText = fetched;
        }

        const extracted = await this.requirementsExtractor.extract(jdText);
        await this.jobRepo.updateParsedRequirements(
          job.id,
          extracted,
          this.requirementsExtractor.schemaVersion
        );
        parsed++;
      } catch (err) {
        failed++;
        errors.push({
          jobId: job.id,
          error: err instanceof Error ? err.message : String(err),
        });
      }

      if (i < pending.length - 1 && delayMs > 0) {
        await new Promise((r) => setTimeout(r, delayMs));
      }
    }

    return {
      attempted: pending.length,
      parsed,
      failed,
      errors,
      durationMs: Date.now() - startedAt,
    };
  }

  /**
   * Phase 3 lazy-parse wrapper.
   *
   * Returns the JD's structured requirements, parsing inline if the cache
   * is missing or stale (older `parsed_requirements_version` than the
   * current schema). The first HR call on a fresh job pays the ~2-4s LLM
   * cost; subsequent calls hit the cache.
   *
   * Throws NotFoundError if the job does not exist.
   * Throws Error if the job has no source_url and no on-file description.
   */
  async getOrParseRequirements(jobId: string): Promise<JobRequirements> {
    const job = await this.jobRepo.findById(jobId);
    if (!job) {
      throw new NotFoundError(`Job ${jobId} not found`);
    }

    const cached = job.parsedRequirements;
    const cachedVersion = job.parsedRequirementsVersion as number | null;
    const isCacheFresh =
      cached !== null &&
      cached !== undefined &&
      cachedVersion === JOB_REQUIREMENTS_SCHEMA_VERSION;

    if (isCacheFresh) {
      // Re-validate via Zod so the rest of the app can trust the shape
      // even if the row was inserted by an older deploy.
      const parsed = JobRequirementsSchema.safeParse(cached);
      if (parsed.success) return parsed.data;
      // Cache shape unexpected — fall through to re-parse.
    }

    if (!this.requirementsExtractor) {
      throw new Error("Job requirements extractor is not configured");
    }

    let jdText = (job.description as string | null) ?? "";
    if (!jdText || jdText.trim().length < 200) {
      if (!this.jobScraperService) {
        throw new Error(
          `Job ${jobId} has no on-file description and the scraper is not configured`
        );
      }
      const sourceUrl = job.sourceUrl as string | null;
      if (!sourceUrl) {
        throw new Error(
          `Job ${jobId} has no source_url and no on-file description`
        );
      }
      const fetched = await this.jobScraperService.fetchJobDescription(sourceUrl);
      if (!fetched) {
        throw new Error(`Failed to fetch JD body for job ${jobId}`);
      }
      jdText = fetched;
    }

    const extracted = await this.requirementsExtractor.extract(jdText);
    await this.jobRepo.updateParsedRequirements(
      jobId,
      extracted,
      this.requirementsExtractor.schemaVersion
    );

    // Final validation before handing back.
    return JobRequirementsSchema.parse(extracted);
  }
}
