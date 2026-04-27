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
  IScoringWeightsRepository,
} from "@server/domain/ports/repositories";
import type { IJobScraperService } from "@server/domain/ports/services";
import type { CreateJobInput } from "@server/application/dtos";
import type { UpdateJobInput } from "@server/application/dtos";
import { NotFoundError } from "./candidate.use-cases";

/**
 * Thrown when a job’s source posting has been taken down by adidas
 * ("application period closed" banner). The job has been marked CLOSED
 * in our DB by the time this is thrown.
 */
export class JobClosedError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "JobClosedError";
  }
}
import {
  JobRequirementsSchema,
  JOB_REQUIREMENTS_SCHEMA_VERSION,
  type JobRequirements,
} from "@server/domain/services/job-requirements.schema";
import {
  computeJobFit,
  DEFAULT_FIT_CONFIG,
  type CandidateFitInput,
  type JobFitResult,
} from "@server/domain/services/job-fit.service";

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
    private readonly requirementsExtractor?: IJobRequirementsExtractor,
    private readonly scoringWeightsRepo?: IScoringWeightsRepository
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
    department?: string | string[];
    country?: string | string[];
  }) {
    return this.jobRepo.findMany(options);
  }

  /**
   * Distinct list of country codes for the country dropdown filter.
   */
  async listDistinctCountries(options?: {
    type?: string;
    excludeType?: string;
    internshipStatus?: string;
  }) {
    return this.jobRepo.findDistinctCountries(options);
  }

  /**
   * Lightweight list of all jobs (id/title/department) for searchable pickers.
   */
  async listJobsForPicker() {
    return this.jobRepo.findAllForPicker();
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
          if (fetched.status === "CLOSED") {
            // Posting was taken down — mark closed and skip the LLM.
            await this.jobRepo.markClosed(job.id);
            continue;
          }
          if (fetched.status !== "OPEN" || !fetched.body) {
            throw new Error(`Failed to fetch JD body (status=${fetched.status})`);
          }
          jdText = fetched.body;
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
      if (fetched.status === "CLOSED") {
        await this.jobRepo.markClosed(jobId);
        throw new JobClosedError(
          `Job ${jobId} is no longer accepting applications (closed by source).`
        );
      }
      if (fetched.status !== "OPEN" || !fetched.body) {
        throw new Error(
          `Failed to fetch JD body for job ${jobId} (status=${fetched.status})`
        );
      }
      jdText = fetched.body;
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

  /**
   * Invalidates the cached `parsed_requirements` for a job and immediately
   * re-extracts from the JD text / source_url. Returns the fresh result.
   *
   * Used by the HR "Force re-parse" button when the cache looks wrong
   * (empty arrays, stale, LLM blip, etc.).
   */
  async forceReparseRequirements(jobId: string): Promise<JobRequirements> {
    const job = await this.jobRepo.findById(jobId);
    if (!job) {
      throw new NotFoundError(`Job ${jobId} not found`);
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
      if (fetched.status === "CLOSED") {
        await this.jobRepo.markClosed(jobId);
        throw new JobClosedError(
          `Job ${jobId} is no longer accepting applications (closed by source).`
        );
      }
      if (fetched.status !== "OPEN" || !fetched.body) {
        throw new Error(
          `Failed to fetch JD body for job ${jobId} (status=${fetched.status})`
        );
      }
      jdText = fetched.body;
    }

    const extracted = await this.requirementsExtractor.extract(jdText);
    await this.jobRepo.updateParsedRequirements(
      jobId,
      extracted,
      this.requirementsExtractor.schemaVersion
    );
    return JobRequirementsSchema.parse(extracted);
  }

  /**
   * Phase 4 orchestrator.
   *
   * Rank candidates against a single job's *parsed* requirements:
   *   1. Resolve `JobRequirements` via the lazy-parse wrapper.
   *   2. Load all matchable candidates with their experiences/languages/
   *      education/skills (existing `findForMatching`).
   *   3. Build the per-candidate `experienceByField` vector from the
   *      tagged experiences (Phase 2).
   *   4. Run the pure `computeJobFit(...)` against each.
   *   5. Persist the top-N to `job_matches` so the UI is fast on reopen.
   *
   * Returns the ranked list (highest fit first) with full breakdowns.
   */
  async matchCandidatesToJob(
    jobId: string,
    options?: { persistTop?: number }
  ): Promise<{
    job: { id: string; title: string; sourceUrl: string | null };
    requirements: JobRequirements;
    matches: Array<{
      candidate: {
        id: string;
        firstName: string;
        lastName: string;
        location: string | null;
        country: string | null;
        primaryBusinessArea: string | null;
        profileScore: number | null;
      };
      fit: JobFitResult;
    }>;
  }> {
    const job = await this.jobRepo.findById(jobId);
    if (!job) throw new NotFoundError(`Job ${jobId} not found`);

    const requirements = await this.getOrParseRequirements(jobId);

    const candidates = await this.candidateRepo.findForMatching();

    const fitConfig = {
      ...DEFAULT_FIT_CONFIG,
      criterionWeights: { ...DEFAULT_FIT_CONFIG.criterionWeights },
    };
    if (this.scoringWeightsRepo) {
      try {
        const w = await this.scoringWeightsRepo.get();
        if (typeof w.requiredSkillThreshold === "number") {
          fitConfig.requiredSkillThreshold = w.requiredSkillThreshold;
        }
        if (w.fitCriterionWeights) {
          // Merge HR overrides onto the defaults so any newly-added
          // criterion still has a sensible weight.
          fitConfig.criterionWeights = {
            ...fitConfig.criterionWeights,
            ...(w.fitCriterionWeights as typeof fitConfig.criterionWeights),
          };
        }
      } catch {
        // Fall back to default if the row is missing or the column hasn't
        // been migrated yet.
      }
    }

    const ranked = candidates
      .map((c: Record<string, any>) => {
        const fit = computeJobFit(requirements, buildCandidateFitInput(c), fitConfig);
        return {
          candidate: {
            id: c.id as string,
            firstName: (c.firstName as string) ?? "",
            lastName: (c.lastName as string) ?? "",
            location: (c.location as string | null) ?? null,
            country: (c.country as string | null) ?? null,
            primaryBusinessArea: (c.primaryBusinessArea as string | null) ?? null,
            profileScore: (c.overallCvScore as number | null) ?? null,
          },
          fit,
        };
      })
      .sort((a, b) => b.fit.overallScore - a.fit.overallScore);

    // Persist the top-N back to job_matches as a cache + audit trail.
    const persistTop = options?.persistTop ?? 100;
    const toPersist = ranked.slice(0, persistTop);
    await Promise.all(
      toPersist.map((r) =>
        this.jobRepo.upsertMatch(
          jobId,
          r.candidate.id,
          r.fit.overallScore,
          r.fit.breakdown
        )
      )
    );

    return {
      job: {
        id: job.id as string,
        title: job.title as string,
        sourceUrl: (job.sourceUrl as string | null) ?? null,
      },
      requirements,
      matches: ranked,
    };
  }
}

// ============================================
// HELPERS
// ============================================

/**
 * Adapt a "matching" candidate row (with experiences, languages, education,
 * skills relations) into the pure `CandidateFitInput` shape consumed by the
 * Phase 3 fit engine. Keeps the use-case readable.
 */
function buildCandidateFitInput(c: Record<string, any>): CandidateFitInput {
  const experiences = Array.isArray(c.experiences) ? c.experiences : [];
  const experienceByField: Record<string, number> = {};
  let totalYears = 0;
  for (const exp of experiences) {
    const years = experienceDurationYears(
      exp.startDate ?? null,
      exp.endDate ?? null,
      Boolean(exp.isCurrent)
    );
    if (years <= 0) continue;
    totalYears += years;
    const fields: string[] = Array.isArray(exp.fieldsOfWork) ? exp.fieldsOfWork : [];
    for (const f of fields) {
      experienceByField[f] = (experienceByField[f] ?? 0) + years;
    }
  }
  // Round to 1 decimal for display + stable scoring
  for (const k of Object.keys(experienceByField)) {
    experienceByField[k] = Math.round(experienceByField[k] * 10) / 10;
  }

  const languages = Array.isArray(c.languages) ? c.languages : [];
  const education = Array.isArray(c.education) ? c.education : [];
  const skills = Array.isArray(c.skills) ? c.skills : [];

  // Highest-ranked education level the candidate holds.
  const eduOrder = ["HIGH_SCHOOL", "VOCATIONAL", "BACHELOR", "MASTER", "PHD", "OTHER"];
  let educationLevel: string | null = null;
  let bestRank = -1;
  for (const e of education) {
    const lvl = e.level as string | null;
    if (!lvl) continue;
    const r = eduOrder.indexOf(lvl);
    if (r > bestRank) {
      bestRank = r;
      educationLevel = lvl;
    }
  }

  return {
    experienceByField,
    totalYearsExperience: Math.round(totalYears * 10) / 10,
    educationLevel,
    languages: languages.map((l: any) => ({
      language: String(l.language ?? ""),
      cefr: (l.assessedLevel as string | null) ?? (l.selfDeclaredLevel as string | null),
    })),
    skillNames: skills
      .map((s: any) => String(s.name ?? ""))
      .filter((s: string) => s.length > 0),
    // Experience job titles count as additional skill evidence — a "Team
    // Lead" title is strong support for "team management", "Marketing
    // Manager" for "marketing", etc. Company names are intentionally
    // excluded (too noisy / not skill-bearing). Descriptions are also
    // excluded in this pass — they often contain filler that would
    // produce false-positive matches.
    evidenceTexts: experiences
      .map((exp: any) => String(exp.title ?? ""))
      .filter((s: string) => s.length > 0),
  };
}

function experienceDurationYears(
  startDate: string | null,
  endDate: string | null,
  isCurrent: boolean
): number {
  const start = parseLooseDate(startDate);
  if (!start) return 0;
  const end = isCurrent || !endDate ? new Date() : parseLooseDate(endDate) ?? new Date();
  const ms = end.getTime() - start.getTime();
  if (ms <= 0) return 0;
  return ms / (1000 * 60 * 60 * 24 * 365.25);
}

function parseLooseDate(s: string | null): Date | null {
  if (!s) return null;
  const trimmed = s.trim();
  if (/^\d{4}$/.test(trimmed)) return new Date(`${trimmed}-01-01`);
  if (/^\d{4}-\d{2}$/.test(trimmed)) return new Date(`${trimmed}-01`);
  const d = new Date(trimmed);
  return isNaN(d.getTime()) ? null : d;
}
