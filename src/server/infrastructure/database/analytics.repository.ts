/**
 * Prisma Analytics Repository
 *
 * ONION LAYER: Infrastructure
 * DEPENDENCIES: Prisma (external), domain ports (inward)
 *
 * Implements IAnalyticsRepository with aggregate/group-by queries.
 */

import { PrismaClient } from "@prisma/client";
import type { IAnalyticsRepository, AnalyticsOverview } from "@server/domain/ports/repositories";

const STATUS_ORDER = [
  "NEW", "PARSED", "SCREENED", "INVITED", "ASSESSED",
  "SHORTLISTED", "BORDERLINE", "ON_IMPROVEMENT_TRACK", "REJECTED", "HIRED",
];

const SCORE_BUCKETS = [
  { range: "0-20", min: 0, max: 20 },
  { range: "21-40", min: 21, max: 40 },
  { range: "41-60", min: 41, max: 60 },
  { range: "61-80", min: 61, max: 80 },
  { range: "81-100", min: 81, max: 100 },
];

export class PrismaAnalyticsRepository implements IAnalyticsRepository {
  constructor(private readonly prisma: PrismaClient) {}

  async getCandidatesByStatus() {
    const raw = await this.prisma.candidate.groupBy({
      by: ["status"],
      _count: { id: true },
      orderBy: { _count: { id: "desc" } },
    });

    const countMap = new Map<string, number>(
      raw.map((s) => [s.status as string, s._count.id])
    );

    return STATUS_ORDER.map((status) => ({
      status,
      count: countMap.get(status) || 0,
    }));
  }

  async getCandidatesByCountry(limit: number) {
    const raw = await this.prisma.candidate.groupBy({
      by: ["country"],
      _count: { id: true },
      where: { country: { not: null } },
      orderBy: { _count: { id: "desc" } },
      take: limit,
    });

    return raw.map((c) => ({
      country: c.country || "Unknown",
      count: c._count.id,
    }));
  }

  async getTopSkills(limit: number) {
    const raw = await this.prisma.skill.groupBy({
      by: ["name"],
      _count: { id: true },
      orderBy: { _count: { id: "desc" } },
      take: limit,
    });

    return raw.map((s) => ({ skill: s.name, count: s._count.id }));
  }

  async getTopLanguages(limit: number) {
    const raw = await this.prisma.candidateLanguage.groupBy({
      by: ["language"],
      _count: { id: true },
      orderBy: { _count: { id: "desc" } },
      take: limit,
    });

    return raw.map((l) => ({ language: l.language, count: l._count.id }));
  }

  async getApplicationsPerJob(limit: number) {
    const raw = await this.prisma.jobApplication.groupBy({
      by: ["jobId"],
      _count: { id: true },
      orderBy: { _count: { id: "desc" } },
      take: limit,
    });

    const jobIds = raw.map((a) => a.jobId);
    const jobs = jobIds.length > 0
      ? await this.prisma.job.findMany({
          where: { id: { in: jobIds } },
          select: { id: true, title: true },
        })
      : [];
    const jobMap = new Map(jobs.map((j) => [j.id, j.title]));

    return raw.map((a) => ({
      jobTitle: jobMap.get(a.jobId) || "Unknown",
      count: a._count.id,
    }));
  }

  async getOverviewCounts(): Promise<AnalyticsOverview> {
    const [
      totalCandidates,
      openPositions,
      totalApplications,
      shortlisted,
      assessments,
    ] = await Promise.all([
      this.prisma.candidate.count(),
      this.prisma.job.count({ where: { status: "OPEN" } }),
      this.prisma.jobApplication.count(),
      this.prisma.candidate.count({ where: { status: "SHORTLISTED" } }),
      this.prisma.assessment.count(),
    ]);

    return { totalCandidates, openPositions, totalApplications, shortlisted, assessments };
  }

  async getRecentApplicationTrend(days: number) {
    const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

    const raw = await this.prisma.jobApplication.groupBy({
      by: ["createdAt"],
      _count: { id: true },
      where: { createdAt: { gte: since } },
      orderBy: { createdAt: "asc" },
    });

    const dailyMap = new Map<string, number>();
    for (const row of raw) {
      const day = new Date(row.createdAt).toISOString().slice(0, 10);
      dailyMap.set(day, (dailyMap.get(day) || 0) + row._count.id);
    }

    return Array.from(dailyMap.entries())
      .map(([date, count]) => ({ date, count }))
      .sort((a, b) => a.date.localeCompare(b.date));
  }

  async getScoreDistribution() {
    const raw = await this.prisma.candidate.groupBy({
      by: ["overallCvScore"],
      _count: { id: true },
      where: { overallCvScore: { not: null } },
    });

    return SCORE_BUCKETS.map((b) => ({
      range: b.range,
      count: raw
        .filter(
          (s) =>
            s.overallCvScore !== null &&
            s.overallCvScore >= b.min &&
            s.overallCvScore <= b.max
        )
        .reduce((sum, s) => sum + s._count.id, 0),
    }));
  }
}
