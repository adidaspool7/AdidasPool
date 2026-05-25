/**
 * Repository Port Interfaces
 *
 * ONION LAYER: Domain (innermost)
 * DEPENDENCIES: None.
 *
 * These interfaces define what the application layer needs from persistence.
 * Infrastructure layer provides concrete implementations (Supabase).
 * This is the Dependency Inversion Principle in action.
 */

// ============================================
// SHARED TYPES
// ============================================

export interface PaginatedResult<T> {
  data: T[];
  pagination: {
    page: number;
    pageSize: number;
    total: number;
    totalPages: number;
  };
}

/**
 * Camelized DB row interfaces.
 *
 * Rows come from the Supabase JS client + `camelizeKeys()`. Each interface
 * declares the columns the application layer actually consumes today (and
 * widens to `[key: string]: unknown` for everything else, since the
 * underlying SELECT often pulls `*` plus joins). New columns SHOULD be
 * declared here when their first typed consumer is added — that keeps the
 * audit-M1/M6 pressure on `any` from creeping back.
 *
 * Optional fields use `?` (may be missing on a partial SELECT). Fields are
 * loosely typed (`string | null` etc.) because the runtime shape of
 * camelized rows is intentionally loose.
 */
export interface CandidateRow {
  id: string;
  userId?: string | null;
  email?: string | null;
  secondaryEmail?: string | null;
  firstName?: string;
  lastName?: string;
  status?: string;
  shortlisted?: boolean;
  needsReview?: boolean | null;
  activatedAt?: string | null;
  overallCvScore?: number | null;
  country?: string | null;
  location?: string | null;
  primaryBusinessArea?: string | null;
  sourceType?: string | null;
  rawCvUrl?: string | null;
  motivationLetterUrl?: string | null;
  learningAgreementUrl?: string | null;
  parsedData?: unknown;
  experiences?: unknown[];
  education?: unknown[];
  languages?: unknown[];
  skills?: unknown[];
  notes?: unknown[];
  tags?: unknown[];
  applications?: unknown[];
  assessments?: unknown[];
  interviews?: unknown[];
  jobMatches?: unknown[];
  improvementTracks?: unknown[];
  [key: string]: unknown;
}

export interface JobRow {
  id: string;
  title?: string;
  department?: string | null;
  location?: string | null;
  country?: string | null;
  sourceUrl?: string | null;
  description?: string | null;
  status?: string | null;
  type?: string | null;
  internshipStatus?: string | null;
  externalId?: string | null;
  postedAt?: string | null;
  parsedRequirements?: unknown;
  parsedRequirementsVersion?: number | null;
  requiredSkills?: unknown;
  requiredLanguage?: string | null;
  requiredLanguageLevel?: string | null;
  requiredEducationLevel?: string | null;
  minYearsExperience?: number | null;
  [key: string]: unknown;
}

export interface NotificationRow {
  id: string;
  type?: string;
  message?: string;
  candidateId?: string | null;
  targetRole?: string | null;
  jobId?: string | null;
  applicationId?: string | null;
  campaignId?: string | null;
  read?: boolean;
  readAt?: string | null;
  archived?: boolean;
  createdAt?: string;
  createdBy?: string | null;
  metadata?: unknown;
  [key: string]: unknown;
}

export interface JobApplicationRow {
  id: string;
  jobId?: string;
  candidateId?: string;
  status?: string;
  createdAt?: string;
  [key: string]: unknown;
}

export interface AssessmentRow {
  id: string;
  candidateId?: string;
  status?: string;
  type?: string;
  token?: string | null;
  [key: string]: unknown;
}

export interface ParsingJobRow {
  id: string;
  status?: string;
  totalFiles?: number;
  parsedFiles?: number;
  failedFiles?: number;
  uploadedBy?: string | null;
  fileName?: string | null;
  errorLog?: unknown;
  createdAt?: string;
  [key: string]: unknown;
}

export interface CampaignRow {
  id: string;
  title?: string;
  body?: string;
  status?: string;
  isPinned?: boolean;
  targetAll?: boolean;
  targetInternshipsOnly?: boolean;
  targetCountries?: string[];
  targetFields?: string[];
  targetEmails?: string[];
  segmentId?: string | null;
  [key: string]: unknown;
}

export interface NotificationPreferencesRow {
  id?: string;
  candidateId?: string;
  jobNotifications?: boolean;
  internshipNotifications?: boolean;
  onlyMyCountry?: boolean;
  fieldFilters?: string[];
  promotionalNotifications?: boolean;
  [key: string]: unknown;
}

export interface JobMatchRow {
  id?: string;
  jobId: string;
  candidateId: string;
  matchScore: number;
  breakdown?: unknown;
  [key: string]: unknown;
}

export interface CandidateFilters {
  search?: string;
  status?: string;
  country?: string;
  locationSearch?: string;
  minScore?: number;
  maxScore?: number;
  language?: string;
  languageLevel?: string;
  sourceType?: string;
  excludeSourceTypes?: string[];
  businessArea?: string;
  shortlisted?: boolean;
  needsReview?: boolean | null;
  excludeUnparsed?: boolean;
  page: number;
  pageSize: number;
  sortBy: string;
  sortOrder: "asc" | "desc";
}

// ============================================
// CANDIDATE REPOSITORY PORT
// ============================================

export interface ICandidateRepository {
  findMany(filters: CandidateFilters): Promise<PaginatedResult<CandidateRow>>;
  findById(id: string): Promise<CandidateRow | null>;
  findByIdWithSelect(id: string, select: Record<string, unknown>): Promise<CandidateRow | null>;
  findByUserId(userId: string): Promise<CandidateRow | null>;
  findByEmail(email: string): Promise<CandidateRow | null>;

  findFirstByCreation(select?: Record<string, unknown>): Promise<CandidateRow | null>;

  createDefault(
    data: Record<string, unknown>,
    select?: Record<string, unknown>
  ): Promise<CandidateRow>;

  update(id: string, data: Record<string, unknown>): Promise<CandidateRow>;

  updateWithSelect(
    id: string,
    data: Record<string, unknown>,
    select: Record<string, unknown>
  ): Promise<CandidateRow>;

  addNote(candidateId: string, author: string, content: string): Promise<{ id: string; [key: string]: unknown }>;
  updateStatus(candidateId: string, status: string): Promise<void>;
  findForMatching(opts?: { fieldsOfWork?: string[] }): Promise<CandidateRow[]>;
  findByIdForMatching(candidateId: string): Promise<CandidateRow | null>;
  findForNotifications(): Promise<CandidateRow[]>;
  findInternshipCandidateIds(): Promise<Set<string>>;
  findForExport(): Promise<CandidateRow[]>;
  findForRescore(): Promise<CandidateRow[]>;

  /** Create a new candidate with all related records in a single transaction */
  createWithRelations(
    data: Record<string, unknown>,
    relations: CandidateRelationsInput
  ): Promise<CandidateRow>;

  /** Delete and re-create all related records for a candidate (used when re-parsing a CV) */
  replaceRelatedRecords(
    candidateId: string,
    relations: CandidateRelationsInput
  ): Promise<void>;

  /**
   * Phase 2: compute a candidate's years-of-experience vector, keyed by
   * canonical Field of Work. Each experience contributes its duration to
   * every field it is tagged with. Experiences with empty `fields_of_work`
   * are ignored.
   */
  findExperienceVectorByField(candidateId: string): Promise<Record<string, number>>;

  delete(id: string): Promise<void>;
}

export interface CandidateRelationsInput {
  experiences: {
    jobTitle: string;
    company: string | null;
    location: string | null;
    startDate: string | null;
    endDate: string | null;
    isCurrent: boolean;
    description: string | null;
    fieldsOfWork?: string[];
  }[];
  education: {
    institution: string | null;
    degree: string | null;
    fieldOfStudy: string | null;
    startDate: string | null;
    endDate: string | null;
    level: string | null;
  }[];
  languages: {
    language: string;
    selfDeclaredLevel: string | null;
  }[];
  skills: {
    name: string;
    category: string | null;
  }[];
}

// ============================================
// JOB REPOSITORY PORT
// ============================================

export interface IJobRepository {
  findMany(options?: {
    page?: number;
    pageSize?: number;
    search?: string;
    type?: string;
    excludeType?: string;
    internshipStatus?: string;
    department?: string | string[];
    country?: string | string[];
    /** Filter by job_status. Use 'ALL' to skip filtering. Defaults to no filter (all statuses). */
    status?: string;
  }): Promise<PaginatedResult<JobRow>>;
  findById(id: string): Promise<JobRow | null>;
  findByExternalId(externalId: string): Promise<JobRow | null>;
  create(data: Record<string, unknown>): Promise<JobRow>;
  update(id: string, data: Record<string, unknown>): Promise<JobRow>;
  upsertByExternalId(
    externalId: string,
    data: Record<string, unknown>
  ): Promise<{ job: JobRow; created: boolean }>;
  bulkUpsertByExternalId(
    jobs: {
      externalId: string;
      title: string;
      department: string | null;
      location: string | null;
      country: string | null;
      sourceUrl: string;
      description?: string | null;
      type?: string | null;
      postedAt?: string | null;
    }[]
  ): Promise<{ created: number; updated: number }>;
  /**
   * Return jobs that have a source_url but no parsed_requirements yet
   * (i.e. candidates for Phase-1 LLM extraction). Used by the backfill
   * script and the post-sync extractor worker.
   */
  findUnparsedJobs(limit: number): Promise<
    Array<{ id: string; title: string; sourceUrl: string | null; description: string | null }>
  >;
  /**
   * Lightweight list of all jobs for searchable pickers/dropdowns.
   * Returns only id, title, department, country — no joins, no pagination.
   */
  findAllForPicker(): Promise<
    Array<{ id: string; title: string; department: string | null; country: string | null }>
  >;
  /**
   * Distinct country codes (2-letter where available) across the jobs
   * table, optionally narrowed by type / excludeType / internshipStatus
   * so the dropdown matches the listing context (e.g. only countries
   * that actually have internships).
   */
  findDistinctCountries(options?: {
    type?: string;
    excludeType?: string;
    internshipStatus?: string;
    status?: string;
  }): Promise<string[]>;
  /** Persist the LLM-extracted structured requirements for a job. */
  updateParsedRequirements(
    id: string,
    parsedRequirements: unknown,
    version: number
  ): Promise<void>;
  /** Mark a job as no longer accepting applications (detected by scraper). */
  markClosed(id: string): Promise<void>;
  /**
   * After a full scrape, mark all OPEN scraper-sourced jobs whose externalId
   * is NOT in `seenExternalIds` as CLOSED. Returns count of closed jobs.
   */
  closeStaleScrapedJobs(seenExternalIds: string[]): Promise<number>;
  upsertMatch(
    jobId: string,
    candidateId: string,
    matchScore: number,
    breakdown: unknown
  ): Promise<JobMatchRow>;
  delete(id: string): Promise<void>;
}

// ============================================
// ASSESSMENT REPOSITORY PORT
// ============================================

export interface IAssessmentRepository {
  findMany(filters: { status?: string; candidateId?: string }): Promise<AssessmentRow[]>;
  create(data: Record<string, unknown>): Promise<AssessmentRow>;
  findByToken(token: string): Promise<AssessmentRow | null>;
}

// ============================================
// JOB APPLICATION REPOSITORY PORT
// ============================================

export interface IJobApplicationRepository {
  findByCandidateId(candidateId: string): Promise<JobApplicationRow[]>;
  findByJobAndCandidate(jobId: string, candidateId: string): Promise<JobApplicationRow | null>;
  findAll(): Promise<JobApplicationRow[]>;
  create(data: { jobId: string; candidateId: string }): Promise<JobApplicationRow>;
  updateStatus(id: string, status: string): Promise<JobApplicationRow>;
  update(id: string, data: Record<string, unknown>): Promise<JobApplicationRow>;
  delete(id: string): Promise<void>;
}

// ============================================
// NOTIFICATION REPOSITORY PORT
// ============================================

export interface NotificationFilters {
  unread?: boolean;
  archived?: boolean;
  type?: string;
  limit?: number;
  offset?: number;
}

export interface CreateNotificationData {
  type: string;
  message: string;
  targetRole?: string;
  jobId?: string;
  candidateId?: string;
  applicationId?: string;
  campaignId?: string;
  /** HR user email / display name who triggered this notification */
  createdBy?: string;
  /** Arbitrary JSON payload — e.g. { subject, body } for CONTACT_EMAIL_SENT */
  metadata?: Record<string, unknown>;
}

export interface INotificationRepository {
  findForCandidate(candidateId: string, filters?: NotificationFilters): Promise<NotificationRow[]>;
  findForHR(filters?: NotificationFilters): Promise<NotificationRow[]>;
  countUnread(candidateId?: string, targetRole?: string): Promise<number>;
  /** Returns full interaction history for a candidate, all types + archived, newest first. */
  findInteractionHistory(candidateId: string): Promise<NotificationRow[]>;
  /** Returns all notifications triggered BY a specific HR user (via created_by), newest first. */
  findHrActivity(createdBy: string): Promise<NotificationRow[]>;
  /** Single notification by id (used for ownership checks before mutations). */
  findById(id: string): Promise<NotificationRow | null>;

  findAll(): Promise<NotificationRow[]>;
  findUnread(): Promise<NotificationRow[]>;

  create(data: CreateNotificationData): Promise<NotificationRow>;
  createMany(data: CreateNotificationData[]): Promise<number>;
  markAsRead(id: string): Promise<NotificationRow>;
  markAllAsRead(candidateId?: string, targetRole?: string): Promise<void>;
  archiveNotification(id: string): Promise<NotificationRow>;
  archiveMany(ids: string[]): Promise<number>;
  deleteNotification(id: string): Promise<void>;

  getPreferences(candidateId: string): Promise<NotificationPreferencesRow | null>;
  upsertPreferences(candidateId: string, prefs: {
    jobNotifications?: boolean;
    internshipNotifications?: boolean;
    onlyMyCountry?: boolean;
    fieldFilters?: string[];
    promotionalNotifications?: boolean;
  }): Promise<NotificationPreferencesRow>;

  createCampaign(data: Record<string, unknown>): Promise<CampaignRow>;
  findCampaigns(): Promise<CampaignRow[]>;
  findCampaignById(id: string): Promise<CampaignRow | null>;
  updateCampaign(id: string, data: Record<string, unknown>): Promise<CampaignRow>;
  deleteCampaign(id: string): Promise<void>;
  getCampaignReadStats(campaignId: string): Promise<{ total: number; read: number }>;
}

// ============================================
// PARSING JOB REPOSITORY PORT
// ============================================

export interface ParsingJobErrorEntry {
  file: string;
  error: string;
  type?: "error" | "skipped";
  timestamp: string;
}

export interface IParsingJobRepository {
  create(data: {
    totalFiles: number;
    uploadedBy?: string;
    fileName?: string;
  }): Promise<ParsingJobRow>;
  findById(id: string): Promise<ParsingJobRow | null>;
  findRecent(limit?: number): Promise<ParsingJobRow[]>;
  updateStatus(id: string, status: string): Promise<void>;
  incrementParsed(id: string): Promise<void>;
  incrementFailed(id: string): Promise<void>;
  appendError(id: string, entry: ParsingJobErrorEntry): Promise<void>;
  recoverStaleJobs(staleMinutes?: number): Promise<number>;
  delete(id: string): Promise<void>;
}

// ============================================
// DEDUPLICATION REPOSITORY PORT
// ============================================

export interface DeduplicationResult {
  isDuplicate: boolean;
  duplicateOf: string | null;
  matchType: "email" | "name_location" | null;
  confidence: number;
}

export interface IDeduplicationRepository {
  checkForDuplicate(candidate: {
    email?: string | null;
    firstName: string;
    lastName: string;
    location?: string | null;
    /** Candidate ID to exclude from the search (used on re-parse to avoid self-match). */
    excludeId?: string | null;
  }): Promise<DeduplicationResult>;
}

// ============================================
// SCORING WEIGHTS REPOSITORY PORT
// ============================================

export interface ScoringWeightsData {
  experience: number;
  yearsOfExperience: number;
  educationLevel: number;
  locationMatch: number;
  language: number;
  /** 0..1 — fraction of a JD's required skills a candidate must cover to be "eligible". */
  requiredSkillThreshold: number;
  /**
   * Per-criterion importance weights for the job-fit engine.
   * Keys: field | experience | seniority | requiredSkills |
   * preferredSkills | languages | education. Values 0..3.
   * 0 = HR explicitly ignores the dimension (drops it from score AND eligibility).
   */
  fitCriterionWeights: Record<string, number>;
  presetName: string | null;
  updatedBy: string | null;
  updatedAt: Date;
}

export interface IScoringWeightsRepository {
  get(): Promise<ScoringWeightsData>;
  upsert(
    weights: {
      experience: number;
      yearsOfExperience: number;
      educationLevel: number;
      locationMatch: number;
      language: number;
      requiredSkillThreshold?: number;
      fitCriterionWeights?: Record<string, number>;
      presetName?: string | null;
      updatedBy?: string | null;
    }
  ): Promise<ScoringWeightsData>;
}

// ============================================
// SCORING PRESET REPOSITORY PORT
// ============================================

export interface ScoringPresetData {
  id: string;
  name: string;
  experience: number;
  yearsOfExperience: number;
  educationLevel: number;
  locationMatch: number;
  language: number;
  createdAt: Date;
}

// ============================================
// ANALYTICS REPOSITORY PORT
// ============================================

export interface AnalyticsOverview {
  totalCandidates: number;
  openPositions: number;
  totalApplications: number;
  shortlisted: number;
  assessments: number;
}

export interface IAnalyticsRepository {
  getCandidatesByStatus(): Promise<{ status: string; count: number }[]>;
  getCandidatesByCountry(limit: number): Promise<{ country: string; count: number }[]>;
  getTopSkills(limit: number): Promise<{ skill: string; count: number }[]>;
  getTopLanguages(limit: number): Promise<{ language: string; count: number }[]>;
  getApplicationsPerJob(limit: number): Promise<{ jobTitle: string; count: number }[]>;
  getOverviewCounts(): Promise<AnalyticsOverview>;
  getRecentApplicationTrend(days: number): Promise<{ date: string; count: number }[]>;
  getScoreDistribution(): Promise<{ range: string; count: number }[]>;
}

export interface IScoringPresetRepository {
  findAll(): Promise<ScoringPresetData[]>;
  create(data: {
    name: string;
    experience: number;
    yearsOfExperience: number;
    educationLevel: number;
    locationMatch: number;
    language: number;
  }): Promise<ScoringPresetData>;
  delete(id: string): Promise<void>;
}

// ============================================
// JOB SHORTLIST REPOSITORY PORT
// ============================================

export interface ShortlistEntry {
  id: string;
  jobId: string;
  candidateId: string;
  addedBy: string | null;
  addedAt: Date;
  fitScoreAtAdd: number | null;
  notes: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface ShortlistEntryWithCandidate extends ShortlistEntry {
  candidate: {
    id: string;
    firstName: string;
    lastName: string;
    email: string | null;
    location: string | null;
    country: string | null;
    overallCvScore: number | null;
  };
  /** Current fit score from the cache (job_matches), if present. May differ from fitScoreAtAdd. */
  currentFitScore: number | null;
}

export interface ShortlistEntryWithJob extends ShortlistEntry {
  job: {
    id: string;
    title: string;
    department: string | null;
    location: string | null;
    country: string | null;
    status: string | null;
  };
}

export interface IShortlistRepository {
  /** Idempotent insert. Returns the existing row on UNIQUE conflict. */
  add(data: {
    jobId: string;
    candidateId: string;
    addedBy: string | null;
    fitScoreAtAdd: number | null;
    notes: string | null;
  }): Promise<{ entry: ShortlistEntry; created: boolean }>;
  remove(jobId: string, candidateId: string): Promise<boolean>;
  findByJob(jobId: string): Promise<ShortlistEntryWithCandidate[]>;
  findByCandidate(candidateId: string): Promise<ShortlistEntryWithJob[]>;
  findOne(jobId: string, candidateId: string): Promise<ShortlistEntry | null>;
  updateNote(jobId: string, candidateId: string, notes: string | null): Promise<ShortlistEntry | null>;
  countByJob(jobId: string): Promise<number>;
  /** Lookup the cached fit score for snapshot at add-time. */
  findCachedFitScore(jobId: string, candidateId: string): Promise<number | null>;
}

// ============================================
// HR DASHBOARD WIDGET REPOSITORY PORT
// ============================================

export interface DashboardWidget {
  id: string;
  userId: string;
  title: string;
  spec: Record<string, unknown>;
  position: number;
  createdAt: string;
  updatedAt: string;
}

export interface IDashboardWidgetRepository {
  listForUser(userId: string): Promise<DashboardWidget[]>;
  findById(id: string): Promise<DashboardWidget | null>;
  create(data: {
    userId: string;
    title: string;
    spec: Record<string, unknown>;
    position?: number;
  }): Promise<DashboardWidget>;
  update(
    id: string,
    userId: string,
    data: Partial<{ title: string; spec: Record<string, unknown>; position: number }>
  ): Promise<DashboardWidget | null>;
  delete(id: string, userId: string): Promise<boolean>;
  /** Returns highest existing position for the user (or -1 if none). */
  maxPositionForUser(userId: string): Promise<number>;
}

// ============================================
// CANDIDATE SEGMENT REPOSITORY PORT
// ============================================

export interface SegmentRow {
  id: string;
  name: string;
  description: string | null;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
  memberCount?: number;
}

export interface SegmentMemberRow {
  segmentId: string;
  candidateId: string;
  addedAt: string;
  candidate?: {
    id: string;
    firstName: string;
    lastName: string;
    email: string | null;
    overallCvScore: number | null;
    status: string | null;
    country: string | null;
  };
}

export interface ISegmentRepository {
  findAll(): Promise<SegmentRow[]>;
  findById(id: string): Promise<SegmentRow | null>;
  create(data: { name: string; description: string | null; createdBy: string }): Promise<SegmentRow>;
  update(id: string, data: { name?: string; description?: string | null }): Promise<SegmentRow | null>;
  delete(id: string): Promise<boolean>;
  /** List all members of a segment, enriched with candidate basics. */
  findMembers(segmentId: string): Promise<SegmentMemberRow[]>;
  /** IDs of all candidates in the segment. Fast — no join. */
  findMemberIds(segmentId: string): Promise<string[]>;
  /** Add candidates. Idempotent — ignores duplicates. */
  addMembers(segmentId: string, candidateIds: string[]): Promise<number>;
  /** Remove one candidate from a segment. */
  removeMember(segmentId: string, candidateId: string): Promise<boolean>;
  /** Return the segment IDs this candidate belongs to. */
  findSegmentsForCandidate(candidateId: string): Promise<string[]>;
}

// ============================================
// AMBASSADOR PROGRAM ROW TYPES
// ============================================

export interface AmbassadorProgramRow {
  id: string;
  title: string;
  description?: string | null;
  cohort?: string | null;
  applicationDeadline?: string | Date | null;
  location?: string | null;
  country?: string | null;
  requirements?: string | null;
  perks?: string | null;
  status?: string | null;
  maxApplicants?: number | null;
  createdAt?: string | Date;
  updatedAt?: string | Date;
  /** Aggregated count from PostgREST join */
  applicationCount?: number;
  [key: string]: unknown;
}

export interface AmbassadorApplicationRow {
  id: string;
  programId: string;
  candidateId: string;
  status: string;
  motivation?: string | null;
  university?: string | null;
  yearOfStudy?: string | null;
  previousExperience?: string | null;
  pitchVideoUrl?: string | null;
  appliedAt?: string | Date;
  updatedAt?: string | Date;
  candidate?: {
    id: string;
    firstName: string | null;
    lastName: string | null;
    email: string | null;
    location: string | null;
    overallCvScore: number | null;
    status: string | null;
    rawCvUrl: string | null;
  };
  [key: string]: unknown;
}

// ============================================
// AMBASSADOR PROGRAM REPOSITORY PORT
// ============================================

export interface IAmbassadorProgramRepository {
  findAll(opts?: { status?: string }): Promise<AmbassadorProgramRow[]>;
  findById(id: string): Promise<AmbassadorProgramRow | null>;
  create(data: Record<string, unknown>): Promise<AmbassadorProgramRow>;
  update(id: string, data: Record<string, unknown>): Promise<AmbassadorProgramRow>;
  delete(id: string): Promise<boolean>;
}

// ============================================
// AMBASSADOR APPLICATION REPOSITORY PORT
// ============================================

export interface IAmbassadorApplicationRepository {
  findByProgram(programId: string): Promise<AmbassadorApplicationRow[]>;
  findByCandidate(candidateId: string): Promise<AmbassadorApplicationRow[]>;
  findOne(programId: string, candidateId: string): Promise<AmbassadorApplicationRow | null>;
  create(data: {
    programId: string;
    candidateId: string;
    motivation?: string | null;
    university?: string | null;
    yearOfStudy?: string | null;
    previousExperience?: string | null;
    pitchVideoUrl?: string | null;
  }): Promise<AmbassadorApplicationRow>;
  updateStatus(id: string, status: string): Promise<AmbassadorApplicationRow>;
  update(id: string, data: Record<string, unknown>): Promise<AmbassadorApplicationRow>;
  delete(id: string): Promise<boolean>;
}

// ============================================
// HR PROFILE REPOSITORY PORT
// ============================================

export interface HrProfileRow {
  id: string;
  userId: string;
  firstName: string;
  lastName: string;
  secondaryEmail?: string | null;
  phoneDialCode?: string | null;
  phone?: string | null;
  location?: string | null;
  createdAt?: string | Date;
  updatedAt?: string | Date;
  [key: string]: unknown;
}

export interface IHrProfileRepository {
  /** Returns null if the HR user has never saved a profile. */
  findByUserId(userId: string): Promise<HrProfileRow | null>;
  /** Upsert: creates if missing, updates if present. Returns final row. */
  upsert(
    userId: string,
    data: Partial<Omit<HrProfileRow, "id" | "userId" | "createdAt" | "updatedAt">>
  ): Promise<HrProfileRow>;
}

