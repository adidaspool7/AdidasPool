/**
 * JobRequirementsSchema — unit tests
 *
 * Focus: the domain invariants. The LLM prompt alone is not trusted — every
 * extraction must round-trip through this schema before touching the DB.
 */

import { describe, it, expect } from "vitest";
import { JobRequirementsSchema } from "../src/server/domain/services/job-requirements.schema";

const minimalValid = {
  rawExtractionModel: "groq:llama-3.3-70b-versatile",
  rawExtractionTimestamp: new Date().toISOString(),
};

describe("JobRequirementsSchema", () => {
  it("accepts a fully-populated valid payload", () => {
    const result = JobRequirementsSchema.safeParse({
      fieldsOfWork: ["Retail", "Sales"],
      seniorityLevel: "SENIOR",
      minYearsInField: 5,
      requiredSkills: ["customer service", "POS systems"],
      preferredSkills: ["German language"],
      requiredLanguages: [
        { language: "English", cefr: "B2" },
        { language: "German", cefr: null },
      ],
      requiredEducationLevel: "BACHELOR",
      responsibilitiesSummary: "Lead a retail store team.",
      ...minimalValid,
    });
    expect(result.success).toBe(true);
  });

  it("accepts a minimal payload (all nullable fields absent → defaults applied)", () => {
    const result = JobRequirementsSchema.safeParse(minimalValid);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.fieldsOfWork).toEqual([]);
      expect(result.data.seniorityLevel).toBe(null);
      expect(result.data.minYearsInField).toBe(null);
      expect(result.data.requiredSkills).toEqual([]);
      expect(result.data.preferredSkills).toEqual([]);
      expect(result.data.requiredLanguages).toEqual([]);
      expect(result.data.requiredEducationLevel).toBe(null);
      expect(result.data.responsibilitiesSummary).toBe(null);
    }
  });

  it("silently drops fieldsOfWork values outside the canonical 16 (tolerant to LLM invention)", () => {
    const result = JobRequirementsSchema.safeParse({
      fieldsOfWork: ["Not A Real Field", "Retail", "Also Not Real", "Sales"],
      ...minimalValid,
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.fieldsOfWork).toEqual(["Retail", "Sales"]);
    }
  });

  it("rejects non-integer minYearsInField", () => {
    const result = JobRequirementsSchema.safeParse({
      minYearsInField: 3.5,
      ...minimalValid,
    });
    expect(result.success).toBe(false);
  });

  it("rejects seniorityLevel values outside the enum", () => {
    const result = JobRequirementsSchema.safeParse({
      seniorityLevel: "ARCHMAGE",
      ...minimalValid,
    });
    expect(result.success).toBe(false);
  });

  it("rejects invalid CEFR levels in requiredLanguages", () => {
    const result = JobRequirementsSchema.safeParse({
      requiredLanguages: [{ language: "English", cefr: "D1" }],
      ...minimalValid,
    });
    expect(result.success).toBe(false);
  });

  it("accepts cefr: null (fluent/native without explicit level)", () => {
    const result = JobRequirementsSchema.safeParse({
      requiredLanguages: [{ language: "English", cefr: null }],
      ...minimalValid,
    });
    expect(result.success).toBe(true);
  });

  it("rejects minYearsInField above the sanity cap (40)", () => {
    const result = JobRequirementsSchema.safeParse({
      minYearsInField: 100,
      ...minimalValid,
    });
    expect(result.success).toBe(false);
  });

  it("requires rawExtractionModel (provenance)", () => {
    const result = JobRequirementsSchema.safeParse({
      rawExtractionTimestamp: new Date().toISOString(),
    });
    expect(result.success).toBe(false);
  });
});
