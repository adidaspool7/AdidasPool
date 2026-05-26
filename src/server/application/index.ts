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
  shortlistRepository,
  dashboardWidgetRepository,
  segmentRepository,
  ambassadorProgramRepository,
  ambassadorApplicationRepository,
  hrProfileRepository,
  cvParserService,
  emailService,
  jobScraperService,
  jobRequirementsExtractor,
  storageService,
  textExtractionService,
} from "@server/container";

import { CandidateUseCases } from "@server/application/use-cases/candidate.use-cases";
import { NotFoundError, ValidationError } from "@server/application/errors";
import { JobUseCases, JobClosedError } from "@server/application/use-cases/job.use-cases";
import { AssessmentUseCases } from "@server/application/use-cases/assessment.use-cases";
import { UploadUseCases } from "@server/application/use-cases/upload.use-cases";
import { ExportUseCases } from "@server/application/use-cases/export.use-cases";
import { ApplicationUseCases } from "@server/application/use-cases/application.use-cases";
import { NotificationUseCases } from "@server/application/use-cases/notification.use-cases";
import { ProfileUseCases } from "@server/application/use-cases/profile.use-cases";
import { AnalyticsUseCases } from "@server/application/use-cases/analytics.use-cases";
import { ShortlistUseCases } from "@server/application/use-cases/shortlist.use-cases";
import { DashboardWidgetUseCases } from "@server/application/use-cases/dashboard-widget.use-cases";
import { SegmentUseCases } from "@server/application/use-cases/segment.use-cases";
import { AmbassadorUseCases } from "@server/application/use-cases/ambassador.use-cases";
import { HrProfileUseCases } from "@server/application/use-cases/hr-profile.use-cases";
import { runWidgetQuery } from "@server/infrastructure/database/widget-query.service";

// Re-export error classes so API routes import from barrel, not deep paths
export { NotFoundError, ValidationError, JobClosedError };

export const candidateUseCases = new CandidateUseCases(candidateRepository, storageService, notificationRepository);

export const jobUseCases = new JobUseCases(jobRepository, candidateRepository, jobScraperService, notificationRepository, jobApplicationRepository, jobRequirementsExtractor, scoringWeightsRepository);

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

export const applicationUseCases = new ApplicationUseCases(jobApplicationRepository, notificationRepository, jobRepository);

export const notificationUseCases = new NotificationUseCases(notificationRepository, candidateRepository, segmentRepository);

export const profileUseCases = new ProfileUseCases(candidateRepository, storageService, notificationRepository);

export const analyticsUseCases = new AnalyticsUseCases(analyticsRepository);

export const shortlistUseCases = new ShortlistUseCases(
  shortlistRepository,
  jobRepository,
  candidateRepository
);

export const dashboardWidgetUseCases = new DashboardWidgetUseCases(
  dashboardWidgetRepository,
  runWidgetQuery
);

export const segmentUseCases = new SegmentUseCases(segmentRepository);

export const ambassadorUseCases = new AmbassadorUseCases(
  ambassadorProgramRepository,
  ambassadorApplicationRepository,
  candidateRepository
);

export const hrProfileUseCases = new HrProfileUseCases(
  hrProfileRepository,
  notificationRepository
);

// Direct repository exports (for simple config endpoints that don't need use-case wrapping)
export { scoringWeightsRepository };
export { scoringPresetRepository };
