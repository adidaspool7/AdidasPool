/**
 * Use Case Factory
 *
 * ONION LAYER: Composition Root
 *
 * Creates pre-wired use case instances using the container's
 * repository and service implementations. API routes import
 * from here — they never touch infrastructure directly.
 */

import {
  candidateRepository,
  jobRepository,
  assessmentRepository,
  deduplicationRepository,
  jobApplicationRepository,
  notificationRepository,
  parsingJobRepository,
  scoringWeightsRepository,
  scoringPresetRepository,
  analyticsRepository,
  cvParserService,
  emailService,
  jobScraperService,
  storageService,
  textExtractionService,
} from "@server/container";

import {
  CandidateUseCases,
  NotFoundError,
  ValidationError,
} from "@server/application/use-cases/candidate.use-cases";
import { JobUseCases } from "@server/application/use-cases/job.use-cases";
import { AssessmentUseCases } from "@server/application/use-cases/assessment.use-cases";
import { UploadUseCases } from "@server/application/use-cases/upload.use-cases";
import { ExportUseCases } from "@server/application/use-cases/export.use-cases";
import { ApplicationUseCases } from "@server/application/use-cases/application.use-cases";
import { NotificationUseCases } from "@server/application/use-cases/notification.use-cases";
import { ProfileUseCases } from "@server/application/use-cases/profile.use-cases";
import { AnalyticsUseCases } from "@server/application/use-cases/analytics.use-cases";

// Re-export error classes so API routes import from barrel, not deep paths
export { NotFoundError, ValidationError };

export const candidateUseCases = new CandidateUseCases(candidateRepository);

export const jobUseCases = new JobUseCases(jobRepository, candidateRepository, jobScraperService, notificationRepository);

export const assessmentUseCases = new AssessmentUseCases(
  assessmentRepository,
  candidateRepository,
  emailService,
  notificationRepository
);

export const uploadUseCases = new UploadUseCases(
  deduplicationRepository,
  cvParserService,
  storageService,
  textExtractionService,
  candidateRepository,
  parsingJobRepository
);

export const exportUseCases = new ExportUseCases(candidateRepository);

export const applicationUseCases = new ApplicationUseCases(jobApplicationRepository, notificationRepository);

export const notificationUseCases = new NotificationUseCases(notificationRepository, candidateRepository);

export const profileUseCases = new ProfileUseCases(candidateRepository, storageService);

export const analyticsUseCases = new AnalyticsUseCases(analyticsRepository);

// Direct repository exports (for simple config endpoints that don't need use-case wrapping)
export { scoringWeightsRepository };
export { scoringPresetRepository };
