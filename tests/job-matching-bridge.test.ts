/**
 * Job matching "bridge" — application-layer helpers that convert DB rows
 * into the pure matcher's inputs, and synthesize requirements for manual
 * (non-scraped) jobs.
 *
 * These are deterministic and previously had ZERO coverage despite sitting
 * directly between the database and the (well-tested) `computeJobFit` engine.
 * A silent bug lived here (`exp.title` vs `exp.jobTitle`) that emptied the
 * evidence-text signal in production — these tests lock the contract so it
 * cannot regress.
 */
import { describe, it, expect } from "vitest";
import {
  buildCandidateFitInput,
  experienceDurationYears,
  parseLooseDate,
  buildManualRequirements,
} from "../src/server/application/use-cases/job.use-cases";

// ─── parseLooseDate ──────────────────────────────────────────────

describe("parseLooseDate", () => {
  it("returns null for null/empty input", () => {
    expect(parseLooseDate(null)).toBeNull();
    expect(parseLooseDate("")).toBeNull();
    expect(parseLooseDate("   ")).toBeNull();
  });

  it("parses a bare year to Jan 1 of that year", () => {
    const d = parseLooseDate("2020");
    expect(d).not.toBeNull();
    expect(d!.getUTCFullYear()).toBe(2020);
    expect(d!.getUTCMonth()).toBe(0);
  });

  it("parses YYYY-MM to the first of the month", () => {
    const d = parseLooseDate("2021-06");
    expect(d).not.toBeNull();
    expect(d!.getUTCFullYear()).toBe(2021);
    expect(d!.getUTCMonth()).toBe(5); // June = 5
  });

  it("parses a full ISO date", () => {
    const d = parseLooseDate("2019-03-15");
    expect(d).not.toBeNull();
    expect(d!.getUTCFullYear()).toBe(2019);
  });

  it("returns null for unparseable garbage", () => {
    expect(parseLooseDate("not-a-date")).toBeNull();
  });
});

// ─── experienceDurationYears ─────────────────────────────────────

describe("experienceDurationYears", () => {
  it("returns 0 when there is no start date", () => {
    expect(experienceDurationYears(null, "2020-01", false)).toBe(0);
  });

  it("computes a roughly correct multi-year span", () => {
    const years = experienceDurationYears("2018-01", "2020-01", false);
    expect(years).toBeGreaterThan(1.9);
    expect(years).toBeLessThan(2.1);
  });

  it("treats isCurrent=true as running until now (positive duration)", () => {
    const years = experienceDurationYears("2015-01", null, true);
    expect(years).toBeGreaterThan(9); // at least ~9-11 years by 2026
  });

  it("returns 0 when the end precedes the start (bad data)", () => {
    expect(experienceDurationYears("2020-01", "2018-01", false)).toBe(0);
  });

  it("uses bare-year start dates", () => {
    const years = experienceDurationYears("2010", "2012", false);
    expect(years).toBeGreaterThan(1.9);
    expect(years).toBeLessThan(2.1);
  });
});

// ─── buildCandidateFitInput ──────────────────────────────────────

describe("buildCandidateFitInput", () => {
  it("aggregates years per field of work", () => {
    const input = buildCandidateFitInput({
      experiences: [
        { jobTitle: "Sales Rep", startDate: "2018-01", endDate: "2020-01", fieldsOfWork: ["Sales"] },
        { jobTitle: "Store Assistant", startDate: "2020-01", endDate: "2022-01", fieldsOfWork: ["Retail", "Sales"] },
      ],
      languages: [],
      education: [],
      skills: [],
    });
    // Sales appears in both (2 + 2 = 4), Retail in one (2).
    expect(input.experienceByField.Sales).toBeCloseTo(4, 0);
    expect(input.experienceByField.Retail).toBeCloseTo(2, 0);
    expect(input.totalYearsExperience).toBeCloseTo(4, 0);
  });

  it("populates evidenceTexts from jobTitle (regression: NOT exp.title)", () => {
    const input = buildCandidateFitInput({
      experiences: [
        { jobTitle: "Team Lead", startDate: "2019-01", endDate: "2022-01", fieldsOfWork: [] },
        { jobTitle: "Marketing Manager", startDate: "2015-01", endDate: "2018-01", fieldsOfWork: [] },
      ],
      languages: [],
      education: [],
      skills: [],
    });
    // This is the exact bug the suite was added to catch: reading exp.title
    // (which does not exist on the row — the column is job_title → jobTitle)
    // silently produced an empty array in production.
    expect(input.evidenceTexts).toContain("Team Lead");
    expect(input.evidenceTexts).toContain("Marketing Manager");
  });

  it("maps skill names from the skills relation", () => {
    const input = buildCandidateFitInput({
      experiences: [],
      languages: [],
      education: [],
      skills: [{ name: "JavaScript" }, { name: "SQL" }, { name: "" }],
    });
    expect(input.skillNames).toEqual(["JavaScript", "SQL"]);
  });

  it("picks the highest-ranked education level", () => {
    const input = buildCandidateFitInput({
      experiences: [],
      languages: [],
      skills: [],
      education: [
        { level: "BACHELOR" },
        { level: "MASTER" },
        { level: "HIGH_SCHOOL" },
      ],
    });
    expect(input.educationLevel).toBe("MASTER");
  });

  it("prefers assessedLevel over selfDeclaredLevel for languages", () => {
    const input = buildCandidateFitInput({
      experiences: [],
      skills: [],
      education: [],
      languages: [
        { language: "English", assessedLevel: "C1", selfDeclaredLevel: "B2" },
        { language: "Spanish", assessedLevel: null, selfDeclaredLevel: "B1" },
      ],
    });
    expect(input.languages).toEqual([
      { language: "English", cefr: "C1" },
      { language: "Spanish", cefr: "B1" },
    ]);
  });

  it("ignores experiences with non-positive duration", () => {
    const input = buildCandidateFitInput({
      experiences: [
        { jobTitle: "Bad Row", startDate: "2020-01", endDate: "2018-01", fieldsOfWork: ["Sales"] },
      ],
      languages: [],
      education: [],
      skills: [],
    });
    expect(input.totalYearsExperience).toBe(0);
    expect(input.experienceByField.Sales).toBeUndefined();
  });

  it("tolerates missing relations (all empty arrays)", () => {
    const input = buildCandidateFitInput({});
    expect(input.skillNames).toEqual([]);
    expect(input.evidenceTexts).toEqual([]);
    expect(input.languages).toEqual([]);
    expect(input.educationLevel).toBeNull();
    expect(input.totalYearsExperience).toBe(0);
  });
});

// ─── buildManualRequirements ─────────────────────────────────────

describe("buildManualRequirements", () => {
  it("returns null when there is no usable signal", () => {
    expect(buildManualRequirements({})).toBeNull();
    expect(
      buildManualRequirements({ requiredSkills: [], department: null })
    ).toBeNull();
  });

  it("maps a canonical department to fieldsOfWork (case-insensitive)", () => {
    const req = buildManualRequirements({ department: "retail" });
    expect(req).not.toBeNull();
    expect(req!.fieldsOfWork).toEqual(["Retail"]);
  });

  it("drops a non-canonical department, leaving fieldsOfWork empty", () => {
    const req = buildManualRequirements({
      department: "Made-up Dept",
      requiredSkills: ["Excel"],
    });
    expect(req).not.toBeNull();
    expect(req!.fieldsOfWork).toEqual([]);
  });

  it("filters blank/invalid required skills", () => {
    const req = buildManualRequirements({
      requiredSkills: ["Excel", "  ", "", "SQL"],
    });
    expect(req).not.toBeNull();
    expect(req!.requiredSkills).toEqual(["Excel", "SQL"]);
  });

  it("only keeps a valid CEFR level for the required language", () => {
    const ok = buildManualRequirements({
      requiredLanguage: "English",
      requiredLanguageLevel: "B2",
    });
    expect(ok!.requiredLanguages).toEqual([{ language: "English", cefr: "B2" }]);

    const badLevel = buildManualRequirements({
      requiredLanguage: "English",
      requiredLanguageLevel: "fluent",
    });
    expect(badLevel!.requiredLanguages).toEqual([
      { language: "English", cefr: null },
    ]);
  });

  it("only keeps a valid education enum value", () => {
    const ok = buildManualRequirements({ requiredEducationLevel: "MASTER" });
    expect(ok!.requiredEducationLevel).toBe("MASTER");

    const bad = buildManualRequirements({
      requiredEducationLevel: "Some Diploma",
      requiredSkills: ["Excel"],
    });
    expect(bad!.requiredEducationLevel).toBeNull();
  });

  it("carries minYearsExperience through only when numeric", () => {
    const ok = buildManualRequirements({ minYearsExperience: 3 });
    expect(ok!.minYearsInField).toBe(3);

    const bad = buildManualRequirements({
      minYearsExperience: "three",
      requiredSkills: ["Excel"],
    });
    expect(bad!.minYearsInField).toBeNull();
  });

  it("tags the synthesized row as manual origin", () => {
    const req = buildManualRequirements({ department: "Sales" });
    expect(req!.rawExtractionModel).toBe("manual:hr-form");
  });
});
