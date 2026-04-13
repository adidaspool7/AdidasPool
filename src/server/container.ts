/**
 * Dependency Injection Container (Composition Root)
 *
 * ONION LAYER: Composition Root (outermost — wires everything together)
 *
 * This is the ONLY place where infrastructure implementations are
 * bound to domain port interfaces. All other layers depend on
 * abstractions (ports), not concrete implementations.
 *
 * Dependency flow:
 *   Presentation (API routes) → Application (use cases) → Domain (ports)
 *                                                              ↑
 *                                              Infrastructure (implements ports)
 */

// Infrastructure implementations
import prisma from "@server/infrastructure/database/prisma-client";
import { PrismaCandidateRepository } from "@server/infrastructure/database/candidate.repository";
import { PrismaJobRepository } from "@server/infrastructure/database/job.repository";
import { PrismaAssessmentRepository } from "@server/infrastructure/database/assessment.repository";
import { PrismaDeduplicationRepository } from "@server/infrastructure/database/dedup.repository";
import { PrismaJobApplicationRepository } from "@server/infrastructure/database/application.repository";
import { PrismaNotificationRepository } from "@server/infrastructure/database/notification.repository";
import { PrismaParsingJobRepository } from "@server/infrastructure/database/parsing-job.repository";
import { PrismaScoringWeightsRepository } from "@server/infrastructure/database/scoring-weights.repository";
import { PrismaScoringPresetRepository } from "@server/infrastructure/database/scoring-preset.repository";
import { PrismaAnalyticsRepository } from "@server/infrastructure/database/analytics.repository";
import { OpenAiCvParserService } from "@server/infrastructure/ai/cv-parser.service";
import { ResendEmailService } from "@server/infrastructure/email/resend.service";
import { AdidasJobScraperService } from "@server/infrastructure/scraping/adidas-job-scraper.service";
import { TextExtractionService } from "@server/infrastructure/extraction/text-extraction.service";
import { VercelBlobStorageService } from "@server/infrastructure/storage/vercel-blob-storage.service";
import { LocalStorageService } from "@server/infrastructure/storage/local-storage.service";

// Domain port types (for type safety)
import type { ICandidateRepository, IJobRepository, IAssessmentRepository, IDeduplicationRepository, IJobApplicationRepository, INotificationRepository, IParsingJobRepository, IScoringWeightsRepository, IScoringPresetRepository, IAnalyticsRepository } from "@server/domain/ports/repositories";
import type { ICvParserService, IEmailService, IJobScraperService, IStorageService, ITextExtractionService } from "@server/domain/ports/services";

// ============================================
// REPOSITORY INSTANCES
// ============================================

export const candidateRepository: ICandidateRepository =
  new PrismaCandidateRepository(prisma);

export const jobRepository: IJobRepository =
  new PrismaJobRepository(prisma);

export const assessmentRepository: IAssessmentRepository =
  new PrismaAssessmentRepository(prisma);

export const deduplicationRepository: IDeduplicationRepository =
  new PrismaDeduplicationRepository(prisma);

export const jobApplicationRepository: IJobApplicationRepository =
  new PrismaJobApplicationRepository(prisma);

export const notificationRepository: INotificationRepository =
  new PrismaNotificationRepository(prisma);

export const parsingJobRepository: IParsingJobRepository =
  new PrismaParsingJobRepository(prisma);

export const scoringWeightsRepository: IScoringWeightsRepository =
  new PrismaScoringWeightsRepository(prisma);

export const scoringPresetRepository: IScoringPresetRepository =
  new PrismaScoringPresetRepository(prisma);

export const analyticsRepository: IAnalyticsRepository =
  new PrismaAnalyticsRepository(prisma);

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
  process.env.BLOB_READ_WRITE_TOKEN
    ? new VercelBlobStorageService()
    : new LocalStorageService();

export const textExtractionService: ITextExtractionService =
  new TextExtractionService();
