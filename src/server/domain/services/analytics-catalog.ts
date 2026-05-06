/**
 * Analytics Catalog — the constrained surface that HR can plot.
 *
 * ONION LAYER: Domain
 * DEPENDENCIES: Zod only.
 *
 * This is the single source of truth for what custom analytics widgets
 * are allowed to do. The client builds chart specs against this catalog;
 * the server validates every incoming spec against it before running
 * any DB query. Clients NEVER name a database column directly.
 *
 * To extend the surface (new metric, new dimension, new filter), edit
 * this file AND add the matching runner in
 * `src/server/infrastructure/database/widget-query.service.ts`.
 */

import { z } from "zod";

// ============================================
// PRIMITIVE TYPES
// ============================================

export const CHART_TYPES = ["bar", "hbar", "pie", "line", "area", "stat"] as const;
export type ChartType = (typeof CHART_TYPES)[number];

export const METRICS = ["candidates", "applications", "jobs", "assessments"] as const;
export type MetricKey = (typeof METRICS)[number];

export const DIMENSIONS = [
  // categorical
  "status",
  "country",
  "source",
  "score_bucket",
  "type",
  "department",
  "kind",
  "job",
  // temporal
  "day",
  "week",
  "month",
  // single-value
  "none",
] as const;
export type DimensionKey = (typeof DIMENSIONS)[number];

// ============================================
// CATALOG ENTRIES
// ============================================

export interface CatalogMetric {
  key: MetricKey;
  label: string;
  description: string;
  /** Dimensions this metric supports. */
  dimensions: DimensionKey[];
  /** Filter keys this metric supports (subset of allowed filters below). */
  filters: string[];
  /** Chart types compatible per dimension family. */
  chartTypes: {
    categorical: ChartType[];
    temporal: ChartType[];
    none: ChartType[];
  };
}

export const CATALOG_METRICS: Record<MetricKey, CatalogMetric> = {
  candidates: {
    key: "candidates",
    label: "Candidates",
    description: "Count of candidates in the talent pool.",
    dimensions: ["status", "country", "source", "score_bucket", "none"],
    filters: ["status", "country", "source"],
    chartTypes: {
      categorical: ["bar", "hbar", "pie"],
      temporal: ["line", "area"],
      none: ["stat"],
    },
  },
  applications: {
    key: "applications",
    label: "Applications",
    description: "Count of job applications submitted.",
    dimensions: ["status", "job", "day", "week", "month", "none"],
    filters: ["status", "jobId"],
    chartTypes: {
      categorical: ["bar", "hbar", "pie"],
      temporal: ["line", "area"],
      none: ["stat"],
    },
  },
  jobs: {
    key: "jobs",
    label: "Jobs",
    description: "Count of jobs in the pipeline.",
    dimensions: ["status", "type", "department", "country", "none"],
    filters: ["status", "type"],
    chartTypes: {
      categorical: ["bar", "hbar", "pie"],
      temporal: ["line", "area"],
      none: ["stat"],
    },
  },
  assessments: {
    key: "assessments",
    label: "Assessments",
    description: "Count of assessments issued or completed.",
    dimensions: ["status", "kind", "day", "month", "none"],
    filters: ["status", "kind"],
    chartTypes: {
      categorical: ["bar", "hbar", "pie"],
      temporal: ["line", "area"],
      none: ["stat"],
    },
  },
};

const TEMPORAL_DIMENSIONS = new Set<DimensionKey>(["day", "week", "month"]);
const NONE_DIMENSION = new Set<DimensionKey>(["none"]);

export function dimensionFamily(d: DimensionKey): "categorical" | "temporal" | "none" {
  if (TEMPORAL_DIMENSIONS.has(d)) return "temporal";
  if (NONE_DIMENSION.has(d)) return "none";
  return "categorical";
}

// ============================================
// SPEC SCHEMA (the JSON HR sends to plot a chart)
// ============================================

const FilterValueSchema = z.union([
  z.string().max(200),
  z.number(),
  z.boolean(),
  z.null(),
]);

export const WidgetSpecSchema = z
  .object({
    metric: z.enum(METRICS),
    dimension: z.enum(DIMENSIONS),
    chartType: z.enum(CHART_TYPES),
    /** Top-N for categorical dimensions; ignored for temporal/none. 1..50. */
    limit: z.number().int().min(1).max(50).optional(),
    /** Days look-back for temporal dimensions. 1..365. */
    lookbackDays: z.number().int().min(1).max(365).optional(),
    /**
     * Whitelisted filters. Keys must be in the metric's `filters` list;
     * values are scalars only. No arbitrary objects.
     */
    filters: z.record(z.string(), FilterValueSchema).optional(),
  })
  .strict()
  .superRefine((spec, ctx) => {
    const metric = CATALOG_METRICS[spec.metric];
    if (!metric.dimensions.includes(spec.dimension)) {
      ctx.addIssue({
        code: "custom",
        path: ["dimension"],
        message: `Dimension "${spec.dimension}" is not allowed for metric "${spec.metric}".`,
      });
    }
    const family = dimensionFamily(spec.dimension);
    if (!metric.chartTypes[family].includes(spec.chartType)) {
      ctx.addIssue({
        code: "custom",
        path: ["chartType"],
        message: `Chart type "${spec.chartType}" is not valid for "${spec.metric}" by ${spec.dimension}.`,
      });
    }
    if (spec.filters) {
      for (const k of Object.keys(spec.filters)) {
        if (!metric.filters.includes(k)) {
          ctx.addIssue({
            code: "custom",
            path: ["filters", k],
            message: `Filter "${k}" is not allowed for metric "${spec.metric}".`,
          });
        }
      }
    }
  });

export type WidgetSpec = z.infer<typeof WidgetSpecSchema>;

// ============================================
// QUERY RESULT SHAPE
// ============================================

/** Universal { label, value } result shape so any chart type can render any query. */
export interface WidgetDatum {
  label: string;
  value: number;
}

export interface WidgetQueryResult {
  spec: WidgetSpec;
  data: WidgetDatum[];
  /** True when the result is a single number (chartType=stat / dimension=none). */
  scalar: boolean;
}

// ============================================
// PUBLIC CATALOG (what the UI consumes)
// ============================================

export interface PublicCatalog {
  metrics: Array<{
    key: MetricKey;
    label: string;
    description: string;
    dimensions: Array<{ key: DimensionKey; label: string; family: "categorical" | "temporal" | "none" }>;
    filters: string[];
    chartTypesByFamily: CatalogMetric["chartTypes"];
  }>;
  chartTypes: ChartType[];
}

const DIMENSION_LABELS: Record<DimensionKey, string> = {
  status: "Status",
  country: "Country",
  source: "Source",
  score_bucket: "CV Score Bucket",
  type: "Type",
  department: "Department",
  kind: "Kind",
  job: "Job",
  day: "Day",
  week: "Week",
  month: "Month",
  none: "(none — single number)",
};

export function buildPublicCatalog(): PublicCatalog {
  return {
    chartTypes: [...CHART_TYPES],
    metrics: METRICS.map((k) => {
      const m = CATALOG_METRICS[k];
      return {
        key: m.key,
        label: m.label,
        description: m.description,
        filters: m.filters,
        chartTypesByFamily: m.chartTypes,
        dimensions: m.dimensions.map((d) => ({
          key: d,
          label: DIMENSION_LABELS[d],
          family: dimensionFamily(d),
        })),
      };
    }),
  };
}
