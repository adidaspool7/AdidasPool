/**
 * External Service Port Interfaces
 *
 * ONION LAYER: Domain (innermost)
 * DEPENDENCIES: None.
 *
 * These interfaces define what the application layer needs from external services.
 * Infrastructure layer provides concrete implementations (e.g., OpenAI, Resend).
 */

// ============================================
// AI CV PARSER SERVICE PORT
// ============================================

export interface CvExtractionResult {
  firstName: string;
  lastName: string;
  email?: string | null;
  phone?: string | null;
  location?: string | null;
  country?: string | null;
  linkedinUrl?: string | null;
  experiences: {
    jobTitle: string;
    company?: string | null;
    location?: string | null;
    startDate?: string | null;
    endDate?: string | null;
    isCurrent: boolean;
    description?: string | null;
  }[];
  education: {
    institution?: string | null;
    degree?: string | null;
    fieldOfStudy?: string | null;
    startDate?: string | null;
    endDate?: string | null;
    level?: string | null;
  }[];
  languages: {
    language: string;
    level?: string | null;
  }[];
  skills: {
    name: string;
    category?: string | null;
  }[];
  // Business area classification (LLM-assigned in single parse)
  businessAreaClassification?: {
    primary: string;
    secondary: string[];
    customArea?: string | null;
    reasoning?: string | null;
  } | null;
  // Total years of experience (LLM-estimated from dates)
  estimatedTotalYears?: number | null;
  // Per-field confidence scores (LLM self-assessment)
  parsingConfidence?: {
    overall: number;
    name?: number;
    location?: number;
    languages?: number;
    experienceDates?: number;
    flags: string[];
  } | null;
}

export interface ExperienceRelevanceResult {
  score: number;
  reason: string;
}

export interface ICvParserService {
  parseCvText(cvText: string): Promise<CvExtractionResult>;
  classifyExperienceRelevance(
    experience: {
      jobTitle: string;
      company?: string | null;
      description?: string | null;
    },
    targetRoleType?: string
  ): Promise<ExperienceRelevanceResult>;
}

// ============================================
// EMAIL SERVICE PORT
// ============================================

export interface IEmailService {
  sendMagicLink(
    to: string,
    candidateName: string,
    magicLink: string,
    expiresAt: Date
  ): Promise<{ success: boolean; error?: string }>;
}

// ============================================
// FILE STORAGE SERVICE PORT
// ============================================

export interface IStorageService {
  uploadFile(
    file: File,
    path: string,
    options?: { access?: "public" | "private" }
  ): Promise<{ url: string; pathname: string }>;
  deleteFile(url: string): Promise<void>;
  getSignedUrl(url: string): Promise<string>;
  getFileContent(
    url: string
  ): Promise<{ stream: ReadableStream<Uint8Array>; contentType: string } | null>;
}

// ============================================
// TEXT EXTRACTION SERVICE PORT
// ============================================

export interface ITextExtractionService {
  /**
   * Extract plaintext from a file buffer based on its MIME type.
   * Supports: application/pdf, application/vnd.openxmlformats-officedocument.wordprocessingml.document, text/plain
   */
  extractText(
    buffer: Buffer,
    mimeType: string
  ): Promise<{ text: string; pageCount?: number }>;
}

// ============================================
// JOB SCRAPER SERVICE PORT
// ============================================

export interface ScrapedJob {
  externalId: string;       // Unique identifier from the source (URL slug or hash)
  title: string;
  department: string | null;
  location: string | null;
  country: string | null;
  sourceUrl: string;        // Direct link to the job posting
  description?: string | null;
}

export interface IJobScraperService {
  /**
   * Scrape job listings from the external careers portal.
   * Returns all available jobs (handles pagination internally).
   * @param maxPages - Maximum pages to scrape (for rate limiting). 0 = all pages.
   */
  scrapeJobs(maxPages?: number): Promise<ScrapedJob[]>;
}
