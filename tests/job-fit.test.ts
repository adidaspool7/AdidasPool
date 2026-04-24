/**
 * Phase 3 — Job Fit domain service.
 *
 * Pure-function tests against the canonical 16-field, CEFR, and education
 * scales. No I/O.
 */
import { describe, it, expect } from "vitest";
import { computeJobFit, matchField, matchExperience, matchSeniority } from "../src/server/domain/services/job-fit.service";
import type { JobRequirements } from "../src/server/domain/services/job-requirements.schema";

const baseJob: JobRequirements = {
  fieldsOfWork: [],
  seniorityLevel: null,
  minYearsInField: null,
  requiredSkills: [],
  preferredSkills: [],
  requiredLanguages: [],
  requiredEducationLevel: null,
  responsibilitiesSummary: null,
  rawExtractionModel: "test",
  rawExtractionTimestamp: "2026-04-23T00:00:00Z",
};

const baseCandidate = {
  experienceByField: {} as Record<string, number>,
  totalYearsExperience: 0,
  educationLevel: null,
  languages: [],
  skillNames: [],
};

describe("computeJobFit — overall behavior", () => {
  it("returns overallScore=0 and isEligible=true when nothing is applicable", () => {
    const result = computeJobFit(baseJob, baseCandidate);
    expect(result.overallScore).toBe(0);
    expect(result.isEligible).toBe(true);
    // All 7 criteria present in breakdown but every one inapplicable
    expect(result.breakdown).toHaveLength(7);
    expect(result.breakdown.every((c) => !c.applicable)).toBe(true);
  });

  it("averages only applicable criteria", () => {
    const result = computeJobFit(
      { ...baseJob, fieldsOfWork: ["Retail"], minYearsInField: 2 },
      { ...baseCandidate, experienceByField: { Retail: 4 }, totalYearsExperience: 4 }
    );
    // field=100, experience=100. Other 5 inapplicable.
    expect(result.overallScore).toBe(100);
    expect(result.isEligible).toBe(true);
  });

  it("flags as ineligible when required-skill coverage is below the 50% threshold", () => {
    const result = computeJobFit(
      { ...baseJob, requiredSkills: ["SAP IBP", "Excel", "Python"] },
      { ...baseCandidate, skillNames: ["excel"] }
    );
    // 1/3 covered ≈ 33% < 50% default threshold → ineligible.
    expect(result.isEligible).toBe(false);
  });

  it("passes eligibility when ≥50% of required skills are covered (default threshold)", () => {
    const result = computeJobFit(
      { ...baseJob, requiredSkills: ["SAP IBP", "Excel"] },
      { ...baseCandidate, skillNames: ["excel"] }
    );
    // 1/2 covered = 50% ≥ threshold → met.
    expect(result.isEligible).toBe(true);
  });

  it("fuzzy-matches skills across phrasing differences", () => {
    const result = computeJobFit(
      { ...baseJob, requiredSkills: ["Excel", "English communication skills"] },
      {
        ...baseCandidate,
        skillNames: ["Microsoft Excel", "strong communication"],
      }
    );
    // "excel" ⊂ "microsoft excel" AND token overlap "communication" ≥ 0.5 → both met.
    expect(result.isEligible).toBe(true);
    const req = result.breakdown.find((c) => c.key === "requiredSkills")!;
    expect(req.score).toBe(100);
  });

  it("honours a strict threshold (1.0) to restore all-required behaviour", () => {
    const result = computeJobFit(
      { ...baseJob, requiredSkills: ["SAP IBP", "Excel"] },
      { ...baseCandidate, skillNames: ["excel"] },
      { requiredSkillThreshold: 1 }
    );
    expect(result.isEligible).toBe(false);
  });

  it("preferred skills never block eligibility", () => {
    const result = computeJobFit(
      { ...baseJob, preferredSkills: ["SAP IBP", "Excel"] },
      { ...baseCandidate, skillNames: [] }
    );
    expect(result.isEligible).toBe(true); // preferred missing ≠ ineligible
    const pref = result.breakdown.find((c) => c.key === "preferredSkills")!;
    expect(pref.applicable).toBe(true);
    expect(pref.met).toBe(true);
    expect(pref.score).toBe(0);
  });
});

describe("matchField", () => {
  it("is inapplicable when JD has no fieldsOfWork", () => {
    const r = matchField(baseJob, baseCandidate);
    expect(r.applicable).toBe(false);
    expect(r.met).toBe(true);
  });

  it("scores intersection ratio against the candidate vector", () => {
    const r = matchField(
      { ...baseJob, fieldsOfWork: ["Retail", "Sales", "Finance"] },
      { ...baseCandidate, experienceByField: { Retail: 3, Sales: 1 } }
    );
    expect(r.score).toBe(67); // 2/3 → round(66.66)
    expect(r.met).toBe(true);
  });

  it("met=false when no overlap", () => {
    const r = matchField(
      { ...baseJob, fieldsOfWork: ["Finance"] },
      { ...baseCandidate, experienceByField: { Retail: 5 } }
    );
    expect(r.score).toBe(0);
    expect(r.met).toBe(false);
  });
});

describe("matchExperience", () => {
  it("falls back to totalYears when JD has no fields", () => {
    const r = matchExperience(
      { ...baseJob, minYearsInField: 5 },
      { ...baseCandidate, totalYearsExperience: 7 }
    );
    expect(r.met).toBe(true);
    expect(r.score).toBe(100);
  });

  it("sums field-scoped years when JD has fields", () => {
    const r = matchExperience(
      { ...baseJob, fieldsOfWork: ["Retail", "Sales"], minYearsInField: 4 },
      {
        ...baseCandidate,
        experienceByField: { Retail: 2, Sales: 1, Finance: 10 },
        totalYearsExperience: 13,
      }
    );
    // 2+1=3 years in scope, need 4 → score 75, met=false
    expect(r.score).toBe(75);
    expect(r.met).toBe(false);
  });

  it("caps score at 100 when over-qualified", () => {
    const r = matchExperience(
      { ...baseJob, fieldsOfWork: ["Retail"], minYearsInField: 2 },
      { ...baseCandidate, experienceByField: { Retail: 20 } }
    );
    expect(r.score).toBe(100);
  });
});

describe("matchSeniority", () => {
  it("infers seniority from totalYears when not provided", () => {
    const r = matchSeniority(
      { ...baseJob, seniorityLevel: "MID" },
      { ...baseCandidate, totalYearsExperience: 4 }
    );
    expect(r.met).toBe(true); // 4y → MID
  });

  it("flags under-seniority when candidate is below required", () => {
    const r = matchSeniority(
      { ...baseJob, seniorityLevel: "SENIOR" },
      { ...baseCandidate, totalYearsExperience: 1 } // → JUNIOR (rank 1), need 3
    );
    expect(r.met).toBe(false);
    // distance = 2 → score = round(max(0, 1-2/3)*100) = 33
    expect(r.score).toBe(33);
  });
});

describe("matchLanguages", () => {
  it("scores 75 when candidate is one CEFR level below", () => {
    const result = computeJobFit(
      { ...baseJob, requiredLanguages: [{ language: "German", cefr: "B2" }] },
      { ...baseCandidate, languages: [{ language: "German", cefr: "B1" }] }
    );
    const lang = result.breakdown.find((c) => c.key === "languages")!;
    expect(lang.met).toBe(false);
    expect(lang.score).toBe(75);
  });

  it("scores 80 when JD CEFR is null and candidate has the language", () => {
    const result = computeJobFit(
      { ...baseJob, requiredLanguages: [{ language: "Portuguese", cefr: null }] },
      { ...baseCandidate, languages: [{ language: "Portuguese", cefr: "A2" }] }
    );
    const lang = result.breakdown.find((c) => c.key === "languages")!;
    expect(lang.met).toBe(true);
    expect(lang.score).toBe(80);
  });
});

describe("matchEducation", () => {
  it("met when candidate >= JD requirement", () => {
    const result = computeJobFit(
      { ...baseJob, requiredEducationLevel: "BACHELOR" },
      { ...baseCandidate, educationLevel: "MASTER" }
    );
    const edu = result.breakdown.find((c) => c.key === "education")!;
    expect(edu.met).toBe(true);
    expect(edu.score).toBe(100);
  });
});
