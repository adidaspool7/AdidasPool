import { describe, it, expect } from "vitest";
import {
  WidgetSpecSchema,
  buildPublicCatalog,
  CATALOG_METRICS,
  dimensionFamily,
} from "../src/server/domain/services/analytics-catalog";

describe("analytics-catalog", () => {
  describe("dimensionFamily", () => {
    it("classifies temporal correctly", () => {
      expect(dimensionFamily("day")).toBe("temporal");
      expect(dimensionFamily("week")).toBe("temporal");
      expect(dimensionFamily("month")).toBe("temporal");
    });
    it("classifies categorical correctly", () => {
      expect(dimensionFamily("status")).toBe("categorical");
      expect(dimensionFamily("country")).toBe("categorical");
    });
    it("classifies none", () => {
      expect(dimensionFamily("none")).toBe("none");
    });
  });

  describe("WidgetSpecSchema", () => {
    it("accepts a valid candidates-by-status bar chart", () => {
      const r = WidgetSpecSchema.safeParse({
        metric: "candidates",
        dimension: "status",
        chartType: "bar",
        limit: 10,
      });
      expect(r.success).toBe(true);
    });

    it("accepts a valid applications time-series", () => {
      const r = WidgetSpecSchema.safeParse({
        metric: "applications",
        dimension: "day",
        chartType: "line",
        lookbackDays: 30,
      });
      expect(r.success).toBe(true);
    });

    it("accepts a stat (single number) widget", () => {
      const r = WidgetSpecSchema.safeParse({
        metric: "candidates",
        dimension: "none",
        chartType: "stat",
      });
      expect(r.success).toBe(true);
    });

    it("rejects unknown metric", () => {
      const r = WidgetSpecSchema.safeParse({
        metric: "snacks",
        dimension: "status",
        chartType: "bar",
      });
      expect(r.success).toBe(false);
    });

    it("rejects dimension not allowed by metric", () => {
      // jobs has no `source` dimension
      const r = WidgetSpecSchema.safeParse({
        metric: "jobs",
        dimension: "source",
        chartType: "bar",
      });
      expect(r.success).toBe(false);
    });

    it("rejects chart type incompatible with dimension family", () => {
      // pie on a temporal dimension: not allowed
      const r = WidgetSpecSchema.safeParse({
        metric: "applications",
        dimension: "day",
        chartType: "pie",
      });
      expect(r.success).toBe(false);
    });

    it("rejects unknown filter keys", () => {
      const r = WidgetSpecSchema.safeParse({
        metric: "candidates",
        dimension: "status",
        chartType: "bar",
        filters: { ssn: "123" },
      });
      expect(r.success).toBe(false);
    });

    it("accepts whitelisted filter keys", () => {
      const r = WidgetSpecSchema.safeParse({
        metric: "candidates",
        dimension: "country",
        chartType: "pie",
        filters: { status: "NEW" },
      });
      expect(r.success).toBe(true);
    });

    it("rejects limit > 50", () => {
      const r = WidgetSpecSchema.safeParse({
        metric: "candidates",
        dimension: "status",
        chartType: "bar",
        limit: 100,
      });
      expect(r.success).toBe(false);
    });

    it("rejects extra unknown top-level keys (strict)", () => {
      const r = WidgetSpecSchema.safeParse({
        metric: "candidates",
        dimension: "status",
        chartType: "bar",
        sql: "DROP TABLE candidates;",
      });
      expect(r.success).toBe(false);
    });
  });

  describe("buildPublicCatalog", () => {
    it("returns all 4 metrics with non-empty dimension lists", () => {
      const cat = buildPublicCatalog();
      expect(cat.metrics).toHaveLength(4);
      for (const m of cat.metrics) {
        expect(m.dimensions.length).toBeGreaterThan(0);
        expect(m.label).toBeTruthy();
      }
    });

    it("dimension family annotations match the definition", () => {
      const cat = buildPublicCatalog();
      const candidates = cat.metrics.find((m) => m.key === "candidates");
      expect(candidates).toBeDefined();
      const statusDim = candidates!.dimensions.find((d) => d.key === "status");
      expect(statusDim?.family).toBe("categorical");
    });
  });

  describe("CATALOG_METRICS surface", () => {
    it("every dimension has at least one allowed chart type", () => {
      for (const m of Object.values(CATALOG_METRICS)) {
        for (const d of m.dimensions) {
          const fam = dimensionFamily(d);
          expect(m.chartTypes[fam].length).toBeGreaterThan(0);
        }
      }
    });
  });
});
