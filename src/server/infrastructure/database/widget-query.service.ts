/**
 * Widget Query Service
 *
 * ONION LAYER: Infrastructure
 *
 * Translates a validated `WidgetSpec` into a Supabase query and returns
 * a uniform `{ label, value }[]` result. This is the ONLY place that
 * touches the DB based on a spec — clients never name columns.
 *
 * Aggregation is in-memory (Supabase JS doesn't support GROUP BY),
 * mirroring the existing `analytics.repository.ts` pattern. Acceptable
 * for the bounded HR talent-pool dataset.
 */

import db from "./supabase-client";
import { assertNoError } from "./db-utils";
import type {
  WidgetSpec,
  WidgetDatum,
  WidgetQueryResult,
  DimensionKey,
} from "@server/domain/services/analytics-catalog";
import { dimensionFamily } from "@server/domain/services/analytics-catalog";

const DEFAULT_LIMIT = 10;
const DEFAULT_LOOKBACK_DAYS = 30;

const SCORE_BUCKETS = [
  { range: "0-20", min: 0, max: 20 },
  { range: "21-40", min: 21, max: 40 },
  { range: "41-60", min: 41, max: 60 },
  { range: "61-80", min: 61, max: 80 },
  { range: "81-100", min: 81, max: 100 },
];

// ----------------------------------------------------------------
// Helpers
// ----------------------------------------------------------------

function groupCount<T>(items: T[], key: (item: T) => string | null | undefined) {
  const map = new Map<string, number>();
  for (const item of items) {
    const k = key(item);
    if (k == null || k === "") continue;
    map.set(k, (map.get(k) ?? 0) + 1);
  }
  return map;
}

function topN(map: Map<string, number>, limit: number): WidgetDatum[] {
  return Array.from(map.entries())
    .map(([label, value]) => ({ label, value }))
    .sort((a, b) => b.value - a.value)
    .slice(0, limit);
}

function bucketDate(iso: string, granularity: "day" | "week" | "month"): string {
  const d = new Date(iso);
  if (granularity === "day") return d.toISOString().slice(0, 10);
  if (granularity === "month") return d.toISOString().slice(0, 7);
  // week → ISO YYYY-Www (Monday-based)
  const tmp = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
  const dayNum = tmp.getUTCDay() || 7;
  tmp.setUTCDate(tmp.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(tmp.getUTCFullYear(), 0, 1));
  const weekNo = Math.ceil(((tmp.getTime() - yearStart.getTime()) / 86400000 + 1) / 7);
  return `${tmp.getUTCFullYear()}-W${String(weekNo).padStart(2, "0")}`;
}

function temporalSeries(
  rows: Array<{ created_at: string }>,
  granularity: "day" | "week" | "month",
  lookbackDays: number
): WidgetDatum[] {
  const sinceMs = Date.now() - lookbackDays * 86400000;
  const map = new Map<string, number>();
  for (const r of rows) {
    const t = new Date(r.created_at).getTime();
    if (Number.isNaN(t) || t < sinceMs) continue;
    const bucket = bucketDate(r.created_at, granularity);
    map.set(bucket, (map.get(bucket) ?? 0) + 1);
  }
  return Array.from(map.entries())
    .map(([label, value]) => ({ label, value }))
    .sort((a, b) => a.label.localeCompare(b.label));
}

function applyFilter<T extends { eq: (col: string, val: unknown) => T }>(
  query: T,
  filterKey: string,
  column: string,
  filters: Record<string, unknown> | undefined
): T {
  if (!filters) return query;
  const v = filters[filterKey];
  if (v === undefined || v === null || v === "") return query;
  return query.eq(column, v);
}

// ----------------------------------------------------------------
// Metric runners
// ----------------------------------------------------------------

async function runCandidates(spec: WidgetSpec): Promise<WidgetDatum[]> {
  const family = dimensionFamily(spec.dimension);
  const lookback = spec.lookbackDays ?? DEFAULT_LOOKBACK_DAYS;
  const limit = spec.limit ?? DEFAULT_LIMIT;

  // Decide which columns to fetch based on dimension
  let select = "id";
  if (spec.dimension === "status") select = "status";
  else if (spec.dimension === "country") select = "country";
  else if (spec.dimension === "source") select = "source";
  else if (spec.dimension === "score_bucket") select = "overall_cv_score";
  else if (family === "temporal") select = "created_at";

  let query = db.from("candidates").select(select);
  query = applyFilter(query, "status", "status", spec.filters);
  query = applyFilter(query, "country", "country", spec.filters);
  query = applyFilter(query, "source", "source", spec.filters);

  const { data, error } = await query;
  assertNoError(error, "widget.candidates");
  const rows = (data ?? []) as unknown as Record<string, unknown>[];

  if (family === "none") return [{ label: "Candidates", value: rows.length }];
  if (family === "temporal") {
    return temporalSeries(
      rows.map((r) => ({ created_at: r.created_at as string })),
      spec.dimension as "day" | "week" | "month",
      lookback
    );
  }
  if (spec.dimension === "score_bucket") {
    const scores = rows
      .map((r) => r.overall_cv_score as number | null)
      .filter((s): s is number => typeof s === "number");
    return SCORE_BUCKETS.map((b) => ({
      label: b.range,
      value: scores.filter((s) => s >= b.min && s <= b.max).length,
    }));
  }
  const map = groupCount(rows, (r) => r[spec.dimension] as string | null);
  return topN(map, limit);
}

async function runApplications(spec: WidgetSpec): Promise<WidgetDatum[]> {
  const family = dimensionFamily(spec.dimension);
  const lookback = spec.lookbackDays ?? DEFAULT_LOOKBACK_DAYS;
  const limit = spec.limit ?? DEFAULT_LIMIT;

  let select = "id";
  if (spec.dimension === "status") select = "status";
  else if (spec.dimension === "job") select = "job_id";
  else if (family === "temporal") select = "created_at";

  let query = db.from("job_applications").select(select);
  query = applyFilter(query, "status", "status", spec.filters);
  query = applyFilter(query, "jobId", "job_id", spec.filters);

  const { data, error } = await query;
  assertNoError(error, "widget.applications");
  const rows = (data ?? []) as unknown as Record<string, unknown>[];

  if (family === "none") return [{ label: "Applications", value: rows.length }];
  if (family === "temporal") {
    return temporalSeries(
      rows.map((r) => ({ created_at: r.created_at as string })),
      spec.dimension as "day" | "week" | "month",
      lookback
    );
  }
  if (spec.dimension === "job") {
    const map = groupCount(rows, (r) => r.job_id as string | null);
    const sorted = Array.from(map.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, limit);
    const ids = sorted.map(([id]) => id);
    if (!ids.length) return [];
    const { data: jobs } = await db.from("jobs").select("id, title").in("id", ids);
    const titleMap = new Map(
      (jobs ?? []).map((j) => [
        (j as { id: string }).id,
        (j as { title: string }).title,
      ])
    );
    return sorted.map(([id, value]) => ({
      label: titleMap.get(id) ?? "Unknown",
      value,
    }));
  }
  const map = groupCount(rows, (r) => r.status as string | null);
  return topN(map, limit);
}

async function runJobs(spec: WidgetSpec): Promise<WidgetDatum[]> {
  const family = dimensionFamily(spec.dimension);
  const lookback = spec.lookbackDays ?? DEFAULT_LOOKBACK_DAYS;
  const limit = spec.limit ?? DEFAULT_LIMIT;

  let select = "id";
  if (spec.dimension === "status") select = "status";
  else if (spec.dimension === "type") select = "type";
  else if (spec.dimension === "department") select = "department";
  else if (spec.dimension === "country") select = "country";
  else if (family === "temporal") select = "created_at";

  let query = db.from("jobs").select(select);
  query = applyFilter(query, "status", "status", spec.filters);
  query = applyFilter(query, "type", "type", spec.filters);

  const { data, error } = await query;
  assertNoError(error, "widget.jobs");
  const rows = (data ?? []) as unknown as Record<string, unknown>[];

  if (family === "none") return [{ label: "Jobs", value: rows.length }];
  if (family === "temporal") {
    return temporalSeries(
      rows.map((r) => ({ created_at: r.created_at as string })),
      spec.dimension as "day" | "week" | "month",
      lookback
    );
  }
  const map = groupCount(rows, (r) => r[spec.dimension] as string | null);
  return topN(map, limit);
}

async function runAssessments(spec: WidgetSpec): Promise<WidgetDatum[]> {
  const family = dimensionFamily(spec.dimension);
  const lookback = spec.lookbackDays ?? DEFAULT_LOOKBACK_DAYS;
  const limit = spec.limit ?? DEFAULT_LIMIT;

  let select = "id";
  if (spec.dimension === "status") select = "status";
  else if (spec.dimension === "kind") select = "kind";
  else if (family === "temporal") select = "created_at";

  let query = db.from("assessments").select(select);
  query = applyFilter(query, "status", "status", spec.filters);
  query = applyFilter(query, "kind", "kind", spec.filters);

  const { data, error } = await query;
  assertNoError(error, "widget.assessments");
  const rows = (data ?? []) as unknown as Record<string, unknown>[];

  if (family === "none") return [{ label: "Assessments", value: rows.length }];
  if (family === "temporal") {
    return temporalSeries(
      rows.map((r) => ({ created_at: r.created_at as string })),
      spec.dimension as "day" | "week" | "month",
      lookback
    );
  }
  const map = groupCount(rows, (r) => r[spec.dimension] as string | null);
  return topN(map, limit);
}

// ----------------------------------------------------------------
// Public entrypoint
// ----------------------------------------------------------------

export async function runWidgetQuery(spec: WidgetSpec): Promise<WidgetQueryResult> {
  let data: WidgetDatum[];
  switch (spec.metric) {
    case "candidates":
      data = await runCandidates(spec);
      break;
    case "applications":
      data = await runApplications(spec);
      break;
    case "jobs":
      data = await runJobs(spec);
      break;
    case "assessments":
      data = await runAssessments(spec);
      break;
    default: {
      // Exhaustiveness guard
      const _exhaustive: never = spec.metric;
      throw new Error(`Unsupported metric: ${_exhaustive as string}`);
    }
  }
  return {
    spec,
    data,
    scalar: (spec.dimension as DimensionKey) === "none",
  };
}
