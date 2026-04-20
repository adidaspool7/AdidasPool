/**
 * Supabase Analytics Repository
 *
 * ONION LAYER: Infrastructure
 * REPLACES: PrismaAnalyticsRepository
 *
 * Note: Supabase JS doesn't support GROUP BY directly. Aggregations
 * are performed in-memory after fetching the relevant columns.
 * Acceptable for an internal HR tool with a bounded talent pool.
 */

import db from "./supabase-client";
import { assertNoError } from "./db-utils";
import type { IAnalyticsRepository, AnalyticsOverview } from "@server/domain/ports/repositories";

const STATUS_ORDER = [
  "NEW", "PARSED", "SCREENED", "BORDERLINE",
  "ON_IMPROVEMENT_TRACK", "OFFER_SENT", "REJECTED", "HIRED",
];

const SCORE_BUCKETS = [
  { range: "0-20", min: 0, max: 20 },
  { range: "21-40", min: 21, max: 40 },
  { range: "41-60", min: 41, max: 60 },
  { range: "61-80", min: 61, max: 80 },
  { range: "81-100", min: 81, max: 100 },
];

function groupCount<T>(items: T[], key: (item: T) => string): Map<string, number> {
  const map = new Map<string, number>();
  for (const item of items) {
    const k = key(item);
    map.set(k, (map.get(k) ?? 0) + 1);
  }
  return map;
}

export class SupabaseAnalyticsRepository implements IAnalyticsRepository {
  async getCandidatesByStatus() {
    const { data, error } = await db
      .from("candidates")
      .select("status");
    assertNoError(error, "analytics.getCandidatesByStatus");

    const countMap = groupCount(data ?? [], (r: any) => r.status as string);
    return STATUS_ORDER.map((status) => ({
      status,
      count: countMap.get(status) ?? 0,
    }));
  }

  async getCandidatesByCountry(limit: number) {
    const { data, error } = await db
      .from("candidates")
      .select("country")
      .not("country", "is", null);
    assertNoError(error, "analytics.getCandidatesByCountry");

    const countMap = groupCount(data ?? [], (r: any) => r.country as string);
    return Array.from(countMap.entries())
      .map(([country, count]) => ({ country, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, limit);
  }

  async getTopSkills(limit: number) {
    const { data, error } = await db.from("skills").select("name");
    assertNoError(error, "analytics.getTopSkills");

    const countMap = groupCount(data ?? [], (r: any) => r.name as string);
    return Array.from(countMap.entries())
      .map(([skill, count]) => ({ skill, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, limit);
  }

  async getTopLanguages(limit: number) {
    const { data, error } = await db
      .from("candidate_languages")
      .select("language");
    assertNoError(error, "analytics.getTopLanguages");

    const countMap = groupCount(data ?? [], (r: any) => r.language as string);
    return Array.from(countMap.entries())
      .map(([language, count]) => ({ language, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, limit);
  }

  async getApplicationsPerJob(limit: number) {
    const { data, error } = await db
      .from("job_applications")
      .select("job_id");
    assertNoError(error, "analytics.getApplicationsPerJob");

    const countMap = groupCount(data ?? [], (r: any) => r.job_id as string);
    const sorted = Array.from(countMap.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, limit);

    const jobIds = sorted.map(([id]) => id);
    if (!jobIds.length) return [];

    const { data: jobs } = await db
      .from("jobs")
      .select("id, title")
      .in("id", jobIds);

    const jobMap = new Map(
      (jobs ?? []).map((j: any) => [j.id as string, j.title as string])
    );

    return sorted.map(([jobId, count]) => ({
      jobTitle: jobMap.get(jobId) ?? "Unknown",
      count,
    }));
  }

  async getOverviewCounts(): Promise<AnalyticsOverview> {
    const [
      { count: totalCandidates },
      { count: openPositions },
      { count: totalApplications },
      { count: shortlisted },
      { count: assessments },
    ] = await Promise.all([
      db.from("candidates").select("*", { count: "exact", head: true }),
      db.from("jobs").select("*", { count: "exact", head: true }).eq("status", "OPEN"),
      db.from("job_applications").select("*", { count: "exact", head: true }),
      db.from("candidates").select("*", { count: "exact", head: true }).eq("shortlisted", true),
      db.from("assessments").select("*", { count: "exact", head: true }),
    ]);

    return {
      totalCandidates: totalCandidates ?? 0,
      openPositions: openPositions ?? 0,
      totalApplications: totalApplications ?? 0,
      shortlisted: shortlisted ?? 0,
      assessments: assessments ?? 0,
    };
  }

  async getRecentApplicationTrend(days: number) {
    const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString();

    const { data, error } = await db
      .from("job_applications")
      .select("created_at")
      .gte("created_at", since)
      .order("created_at", { ascending: true });
    assertNoError(error, "analytics.getRecentApplicationTrend");

    const dailyMap = new Map<string, number>();
    for (const row of data ?? []) {
      const day = new Date((row as any).created_at as string)
        .toISOString()
        .slice(0, 10);
      dailyMap.set(day, (dailyMap.get(day) ?? 0) + 1);
    }

    return Array.from(dailyMap.entries())
      .map(([date, count]) => ({ date, count }))
      .sort((a, b) => a.date.localeCompare(b.date));
  }

  async getScoreDistribution() {
    const { data, error } = await db
      .from("candidates")
      .select("overall_cv_score")
      .not("overall_cv_score", "is", null);
    assertNoError(error, "analytics.getScoreDistribution");

    const scores = (data ?? []).map((r: any) => r.overall_cv_score as number);

    return SCORE_BUCKETS.map((b) => ({
      range: b.range,
      count: scores.filter((s) => s >= b.min && s <= b.max).length,
    }));
  }
}
