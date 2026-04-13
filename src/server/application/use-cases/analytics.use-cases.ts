/**
 * Analytics Use Cases
 *
 * ONION LAYER: Application
 * DEPENDENCIES: Domain ports (inward only)
 *
 * Orchestrates analytics data retrieval.
 * Replaces direct Prisma usage in the analytics API route.
 */

import type { IAnalyticsRepository } from "@server/domain/ports/repositories";

export class AnalyticsUseCases {
  constructor(private readonly analyticsRepo: IAnalyticsRepository) {}

  /**
   * Get all analytics data for the HR dashboard.
   */
  async getDashboardAnalytics() {
    const [
      overview,
      pipeline,
      candidatesByCountry,
      topSkills,
      topLanguages,
      applicationsPerJob,
      applicationTrend,
      scoreDistribution,
    ] = await Promise.all([
      this.analyticsRepo.getOverviewCounts(),
      this.analyticsRepo.getCandidatesByStatus(),
      this.analyticsRepo.getCandidatesByCountry(10),
      this.analyticsRepo.getTopSkills(15),
      this.analyticsRepo.getTopLanguages(15),
      this.analyticsRepo.getApplicationsPerJob(10),
      this.analyticsRepo.getRecentApplicationTrend(30),
      this.analyticsRepo.getScoreDistribution(),
    ]);

    return {
      overview,
      pipeline,
      candidatesByCountry,
      topSkills,
      topLanguages,
      applicationsPerJob,
      applicationTrend,
      scoreDistribution,
    };
  }
}
