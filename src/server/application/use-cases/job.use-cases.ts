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

export class JobUseCases {
  constructor(
    private readonly jobRepo: IJobRepository,
    private readonly candidateRepo: ICandidateRepository,
    private readonly jobScraperService?: IJobScraperService,
    private readonly notificationRepo?: INotificationRepository,
    private readonly applicationRepo?: IJobApplicationRepository
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
}
