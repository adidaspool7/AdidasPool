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
  businessArea?: string;
  shortlisted?: boolean;
  needsReview?: boolean | null;
  page: number;
  pageSize: number;
  sortBy: string;
  sortOrder: "asc" | "desc";
}

// ============================================
// CANDIDATE REPOSITORY PORT
// ============================================

export interface ICandidateRepository {
  findMany(filters: CandidateFilters): Promise<PaginatedResult<any>>;
  findById(id: string): Promise<any | null>;
  findByIdWithSelect(id: string, select: Record<string, unknown>): Promise<any | null>;
  findByUserId(userId: string): Promise<any | null>;
  findByEmail(email: string): Promise<any | null>;

  findFirstByCreation(select?: Record<string, unknown>): Promise<any | null>;

  createDefault(
    data: Record<string, unknown>,
    select?: Record<string, unknown>
  ): Promise<any>;

  update(id: string, data: Record<string, unknown>): Promise<any>;

  updateWithSelect(
    id: string,
    data: Record<string, unknown>,
    select: Record<string, unknown>
  ): Promise<any>;

  addNote(candidateId: string, author: string, content: string): Promise<any>;
  updateStatus(candidateId: string, status: string): Promise<void>;
  findForMatching(): Promise<any[]>;
  findByIdForMatching(candidateId: string): Promise<any | null>;
  findForNotifications(): Promise<any[]>;
  findInternshipCandidateIds(): Promise<Set<string>>;
  findForExport(): Promise<any[]>;
  findForRescore(): Promise<any[]>;

  /** Create a new candidate with all related records in a single transaction */
  createWithRelations(
    data: Record<string, unknown>,
    relations: CandidateRelationsInput
  ): Promise<any>;

  /** Delete and re-create all related records for a candidate (used when re-parsing a CV) */
  replaceRelatedRecords(
    candidateId: string,
    relations: CandidateRelationsInput
  ): Promise<void>;

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
    department?: string;
  }): Promise<PaginatedResult<any>>;
  findById(id: string): Promise<any | null>;
  findByExternalId(externalId: string): Promise<any | null>;
  create(data: Record<string, unknown>): Promise<any>;
  update(id: string, data: Record<string, unknown>): Promise<any>;
  upsertByExternalId(
    externalId: string,
    data: Record<string, unknown>
  ): Promise<{ job: any; created: boolean }>;
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
    }[]
  ): Promise<{ created: number; updated: number }>;
  upsertMatch(
    jobId: string,
    candidateId: string,
    matchScore: number,
    breakdown: any
  ): Promise<any>;
  delete(id: string): Promise<void>;
}

// ============================================
// ASSESSMENT REPOSITORY PORT
// ============================================

export interface IAssessmentRepository {
  findMany(filters: { status?: string; candidateId?: string }): Promise<any[]>;
  create(data: Record<string, unknown>): Promise<any>;
  findByToken(token: string): Promise<any | null>;
}

// ============================================
// JOB APPLICATION REPOSITORY PORT
// ============================================

export interface IJobApplicationRepository {
  findByCandidateId(candidateId: string): Promise<any[]>;
  findByJobAndCandidate(jobId: string, candidateId: string): Promise<any | null>;
  findAll(): Promise<any[]>;
  create(data: { jobId: string; candidateId: string }): Promise<any>;
  updateStatus(id: string, status: string): Promise<any>;
  update(id: string, data: Record<string, unknown>): Promise<any>;
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
}

export interface INotificationRepository {
  findForCandidate(candidateId: string, filters?: NotificationFilters): Promise<any[]>;
  findForHR(filters?: NotificationFilters): Promise<any[]>;
  countUnread(candidateId?: string, targetRole?: string): Promise<number>;

  findAll(): Promise<any[]>;
  findUnread(): Promise<any[]>;

  create(data: CreateNotificationData): Promise<any>;
  createMany(data: CreateNotificationData[]): Promise<number>;
  markAsRead(id: string): Promise<any>;
  markAllAsRead(candidateId?: string, targetRole?: string): Promise<void>;
  archiveNotification(id: string): Promise<any>;
  archiveMany(ids: string[]): Promise<number>;
  deleteNotification(id: string): Promise<void>;

  getPreferences(candidateId: string): Promise<any | null>;
  upsertPreferences(candidateId: string, prefs: {
    jobNotifications?: boolean;
    internshipNotifications?: boolean;
    onlyMyCountry?: boolean;
    fieldFilters?: string[];
    promotionalNotifications?: boolean;
  }): Promise<any>;

  createCampaign(data: any): Promise<any>;
  findCampaigns(): Promise<any[]>;
  findCampaignById(id: string): Promise<any | null>;
  updateCampaign(id: string, data: any): Promise<any>;
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
  }): Promise<any>;
  findById(id: string): Promise<any | null>;
  findRecent(limit?: number): Promise<any[]>;
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
