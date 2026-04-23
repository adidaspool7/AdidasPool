/**
 * Dependency Injection Container (Composition Root)
 *
 * ONION LAYER: Composition Root (outermost — wires everything together)
 *
 * All Prisma repositories have been replaced with Supabase equivalents.
 * The domain ports (interfaces) are unchanged — only the implementations changed.
 */

// Infrastructure implementations
import { SupabaseCandidateRepository } from "@server/infrastructure/database/candidate.repository";
import { SupabaseJobRepository } from "@server/infrastructure/database/job.repository";
import { SupabaseAssessmentRepository } from "@server/infrastructure/database/assessment.repository";
import { SupabaseDeduplicationRepository } from "@server/infrastructure/database/dedup.repository";
import { SupabaseJobApplicationRepository } from "@server/infrastructure/database/application.repository";
import { SupabaseNotificationRepository } from "@server/infrastructure/database/notification.repository";
import { SupabaseParsingJobRepository } from "@server/infrastructure/database/parsing-job.repository";
import { SupabaseScoringWeightsRepository } from "@server/infrastructure/database/scoring-weights.repository";
import { SupabaseScoringPresetRepository } from "@server/infrastructure/database/scoring-preset.repository";
import { SupabaseAnalyticsRepository } from "@server/infrastructure/database/analytics.repository";
import { OpenAiCvParserService } from "@server/infrastructure/ai/cv-parser.service";
import { JobRequirementsExtractorService } from "@server/infrastructure/ai/job-requirements-extractor.service";
import { ResendEmailService } from "@server/infrastructure/email/resend.service";
import { AdidasJobScraperService } from "@server/infrastructure/scraping/adidas-job-scraper.service";
import { TextExtractionService } from "@server/infrastructure/extraction/text-extraction.service";
import { SupabaseStorageService } from "@server/infrastructure/storage/supabase-storage.service";
import { LocalStorageService } from "@server/infrastructure/storage/local-storage.service";

// Domain port types
import type {
  ICandidateRepository,
  IJobRepository,
  IAssessmentRepository,
  IDeduplicationRepository,
  IJobApplicationRepository,
  INotificationRepository,
  IParsingJobRepository,
  IScoringWeightsRepository,
  IScoringPresetRepository,
  IAnalyticsRepository,
} from "@server/domain/ports/repositories";
import type {
  ICvParserService,
  IEmailService,
  IJobScraperService,
  IStorageService,
  ITextExtractionService,
} from "@server/domain/ports/services";

// ============================================
// REPOSITORY INSTANCES
// ============================================

export const candidateRepository: ICandidateRepository =
  new SupabaseCandidateRepository();

export const jobRepository: IJobRepository =
  new SupabaseJobRepository();

export const assessmentRepository: IAssessmentRepository =
  new SupabaseAssessmentRepository();

export const deduplicationRepository: IDeduplicationRepository =
  new SupabaseDeduplicationRepository();

export const jobApplicationRepository: IJobApplicationRepository =
  new SupabaseJobApplicationRepository();

export const notificationRepository: INotificationRepository =
  new SupabaseNotificationRepository();

export const parsingJobRepository: IParsingJobRepository =
  new SupabaseParsingJobRepository();

export const scoringWeightsRepository: IScoringWeightsRepository =
  new SupabaseScoringWeightsRepository();

export const scoringPresetRepository: IScoringPresetRepository =
  new SupabaseScoringPresetRepository();

export const analyticsRepository: IAnalyticsRepository =
  new SupabaseAnalyticsRepository();

// ============================================
// SERVICE INSTANCES
// ============================================

export const cvParserService: ICvParserService =
  new OpenAiCvParserService();

export const emailService: IEmailService =
  new ResendEmailService();

export const jobScraperService: IJobScraperService =
  new AdidasJobScraperService();

export const storageService: IStorageService =
  process.env.NEXT_PUBLIC_SUPABASE_URL
    ? new SupabaseStorageService()
    : new LocalStorageService();

export const textExtractionService: ITextExtractionService =
  new TextExtractionService();

/**
 * Phase 1 — JD requirements extractor. Structural type so the application
 * layer can depend on it without importing the infrastructure class.
 */
export const jobRequirementsExtractor = new JobRequirementsExtractorService();
