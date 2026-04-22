/**
 * Job Use Cases
 *
 * ONION LAYER: Application
 * DEPENDENCIES: Domain ports + domain services (inward only)
 *
 * Orchestrates job operations including matching.
 */

import type {
  IJobRepository,
  ICandidateRepository,
  INotificationRepository,
  IJobApplicationRepository,
} from "@server/domain/ports/repositories";
import type { IJobScraperService } from "@server/domain/ports/services";
import {
  matchCandidateToJob,
  normalizeCountry,
} from "@server/domain/services/matching.service";
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
   * Run matching engine for a job against all eligible candidates.
   * This is a core orchestration — it coordinates:
   * 1. Loading the job (infrastructure)
   * 2. Loading candidates (infrastructure)
   * 3. Running matching (domain service — pure logic)
   * 4. Storing results (infrastructure)
   */
  async matchCandidatesToJob(jobId: string) {
    const job = await this.jobRepo.findById(jobId);
    if (!job) {
      throw new NotFoundError(`Job ${jobId} not found`);
    }

    const candidates = await this.candidateRepo.findForMatching();

    const results = [];
    for (const candidate of candidates as any[]) {
      // Domain service — pure matching logic, no DB access
      // Use the highest education level, not just the first record
      const eduRank: Record<string, number> = { HIGH_SCHOOL: 1, VOCATIONAL: 2, BACHELOR: 3, MASTER: 4, PHD: 5 };
      const highestEdu = candidate.education?.length
        ? candidate.education.reduce((best: any, e: any) => {
            const bestRank = eduRank[best?.level] ?? 0;
            const curRank = eduRank[e?.level] ?? 0;
            return curRank > bestRank ? e : best;
          }, candidate.education[0])
        : null;
      const matchResult = matchCandidateToJob({
        candidate: {
          location: candidate.location,
          country: candidate.country,
          yearsOfExperience: candidate.yearsOfExperience,
          educationLevel: highestEdu?.level || null,
          languages: candidate.languages.map((l: any) => ({
            language: l.language,
            level: l.selfDeclaredLevel,
          })),
          skills: (candidate.skills ?? []).map((s: any) => s.name),
          experienceScore: candidate.experienceScore,
        },
        job: {
          location: job.location,
          country: job.country,
          requiredLanguage: job.requiredLanguage,
          requiredLanguageLevel: job.requiredLanguageLevel,
          requiredExperienceType: job.requiredExperienceType,
          minYearsExperience: job.minYearsExperience,
          requiredEducationLevel: job.requiredEducationLevel,
          requiredSkills: job.requiredSkills ?? [],
        },
      });

      // Persist match result
      const match = await this.jobRepo.upsertMatch(
        jobId,
        candidate.id,
        matchResult.overallScore,
        matchResult.breakdown
      );

      results.push({
        candidateId: candidate.id,
        candidateName: `${candidate.firstName} ${candidate.lastName}`,
        ...matchResult,
        matchId: match.id,
      });
    }

    // Sort by score descending
    results.sort((a, b) => b.overallScore - a.overallScore);

    return {
      jobId,
      totalCandidates: candidates.length,
      matches: results,
    };
  }

  /**
   * Run matching engine for a single candidate against all currently-open
   * eligible jobs.
   *
   * "Eligible" = OPEN regular jobs + ACTIVE internships (drafts / closed
   * are filtered out so invitations can never target a non-applicable role).
   *
   * Results are persisted to `job_matches` for audit, sorted by score desc,
   * and returned enriched with the job metadata so the UI can render them
   * directly.
   */
  async matchJobsForCandidate(candidateId: string) {
    const candidate = await this.candidateRepo.findByIdForMatching(candidateId);
    if (!candidate) {
      throw new NotFoundError(`Candidate ${candidateId} not found`);
    }

    // All jobs — we filter in app-layer to keep the Supabase query simple
    // (single table scan, small app) and because internship eligibility has
    // two-part logic (type + internship_status).
    const { data: jobs } = await this.jobRepo.findMany({
      page: 1,
      pageSize: 1000,
    });

    const eligible = (jobs as any[]).filter((j) => {
      // Status filter — open jobs and active internships only
      if (j.type === "INTERNSHIP") {
        if (j.internshipStatus !== "ACTIVE") return false;
      } else if (j.status !== "OPEN") {
        return false;
      }

      // Hard country filter — both sides must have a country, and they must
      // match (or the candidate must be willing to relocate). Jobs or
      // candidates without a country are excluded entirely per product
      // requirement ("All jobs and candidates must have a country").
      const candidateCountry = normalizeCountry(
        (candidate as any).country || (candidate as any).location
      );
      const jobCountry = normalizeCountry(j.country || j.location);
      if (!candidateCountry || !jobCountry) return false;
      if (candidateCountry !== jobCountry && !(candidate as any).willingToRelocate) {
        return false;
      }

      return true;
    });

    // Highest education once per candidate (same heuristic as matchCandidatesToJob)
    const eduRank: Record<string, number> = {
      HIGH_SCHOOL: 1,
      VOCATIONAL: 2,
      BACHELOR: 3,
      MASTER: 4,
      PHD: 5,
    };
    const highestEdu = candidate.education?.length
      ? candidate.education.reduce((best: any, e: any) => {
          const bestRank = eduRank[best?.level] ?? 0;
          const curRank = eduRank[e?.level] ?? 0;
          return curRank > bestRank ? e : best;
        }, candidate.education[0])
      : null;

    const candidateMatchInput = {
      location: candidate.location,
      country: candidate.country,
      yearsOfExperience: candidate.yearsOfExperience,
      educationLevel: highestEdu?.level || null,
      languages: (candidate.languages ?? []).map((l: any) => ({
        language: l.language,
        level: l.selfDeclaredLevel,
      })),
      skills: (candidate.skills ?? []).map((s: any) => s.name),
      experienceScore: candidate.experienceScore,
      primaryBusinessArea: (candidate as any).primaryBusinessArea ?? null,
      secondaryBusinessAreas: (candidate as any).secondaryBusinessAreas ?? [],
      candidateCustomArea: (candidate as any).candidateCustomArea ?? null,
      willingToRelocate: (candidate as any).willingToRelocate ?? false,
    };

    const results: any[] = [];
    const upsertPromises: Promise<any>[] = [];
    for (const job of eligible) {
      const matchResult = matchCandidateToJob({
        candidate: candidateMatchInput,
        job: {
          location: job.location,
          country: job.country,
          department: job.department,
          requiredLanguage: job.requiredLanguage,
          requiredLanguageLevel: job.requiredLanguageLevel,
          requiredExperienceType: job.requiredExperienceType,
          minYearsExperience: job.minYearsExperience,
          requiredEducationLevel: job.requiredEducationLevel,
          requiredSkills: job.requiredSkills ?? [],
        },
      });

      // Persist for audit — fire in parallel, don't block per-job
      upsertPromises.push(
        this.jobRepo
          .upsertMatch(
            job.id,
            candidateId,
            matchResult.overallScore,
            matchResult.breakdown
          )
          .catch(() => {
            // Non-fatal — audit row failure shouldn't block the UX
          })
      );

      results.push({
        jobId: job.id,
        title: job.title,
        department: job.department,
        location: job.location,
        country: job.country,
        type: job.type,
        sourceUrl: job.sourceUrl,
        status: job.status,
        internshipStatus: job.internshipStatus,
        ...matchResult,
      });
    }

    // Wait for audit writes (all in parallel) so serverless function can cleanly exit
    await Promise.allSettled(upsertPromises);

    results.sort((a, b) => b.overallScore - a.overallScore);

    return {
      candidateId,
      totalJobs: eligible.length,
      matches: results,
    };
  }

  /**
   * HR invites a candidate (already on the platform) to apply for a job.
   *
   * Emits a single JOB_INVITATION notification to the candidate. Idempotent:
   * a second invite for the same (candidate, job) returns the previous one
   * rather than spamming. If the candidate already applied (non-withdrawn),
   * the invite is skipped and the caller is informed.
   */
  async inviteCandidateToJob(
    candidateId: string,
    jobId: string,
    invitedByName?: string
  ): Promise<{
    status: "created" | "already_invited" | "already_applied";
    notificationId?: string;
  }> {
    if (!this.notificationRepo) {
      throw new Error("Notification repository not configured");
    }

    const job = await this.jobRepo.findById(jobId);
    if (!job) throw new NotFoundError(`Job ${jobId} not found`);

    const candidate = await this.candidateRepo.findById(candidateId);
    if (!candidate) throw new NotFoundError(`Candidate ${candidateId} not found`);

    // Skip if the candidate already has an active (non-withdrawn) application
    if (this.applicationRepo) {
      const existingApp = await this.applicationRepo.findByJobAndCandidate(
        jobId,
        candidateId
      );
      if (existingApp && existingApp.status !== "WITHDRAWN") {
        return { status: "already_applied" };
      }
    }

    // Dedupe: any non-archived prior invitation for this pair?
    const existingInvites = await this.notificationRepo.findForCandidate(
      candidateId,
      { type: "JOB_INVITATION", archived: false, limit: 200 }
    );
    const prior = (existingInvites ?? []).find(
      (n: any) => n.jobId === jobId || n.job?.id === jobId
    );
    if (prior) {
      return { status: "already_invited", notificationId: prior.id };
    }

    const byLabel = invitedByName ? `${invitedByName} from HR` : "Our HR team";
    const message = `${byLabel} thinks you could be a great fit for "${job.title}". Check it out on adidas Careers and apply if you're interested.`;

    const created = await this.notificationRepo.create({
      type: "JOB_INVITATION",
      message,
      targetRole: "CANDIDATE",
      jobId,
      candidateId,
    });

    return { status: "created", notificationId: created.id };
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
