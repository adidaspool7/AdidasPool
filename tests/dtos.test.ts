/**
 * Application DTO Schemas — Unit Tests
 *
 * Complements cv-validation.test.ts by covering the transform-heavy and
 * request-boundary schemas that were previously untested:
 *   - CvExtractionSchema: free-text language mapping, business-area
 *     normalization, estimatedTotalYears clamp, fieldsOfWork tolerance
 *   - CreateJobSchema / UpdateJobSchema: email-or-empty, required title
 *   - CandidateFilterSchema: defaults + numeric bounds
 *   - CreateAssessmentSchema: defaults + bounds
 *   - WidgetSpecValidationError shape
 */
import { describe, it, expect } from "vitest";
import {
  CvExtractionSchema,
  CreateJobSchema,
  UpdateJobSchema,
  CandidateFilterSchema,
  CreateAssessmentSchema,
} from "@server/application/dtos";
import { WidgetSpecValidationError } from "@server/application/errors";
import { DuplicateSkipError } from "@server/application/errors";

const baseCv = {
  firstName: "Ana",
  lastName: "Costa",
  experiences: [],
  education: [],
  languages: [],
  skills: [],
};

// ─── CvExtractionSchema: free-text language descriptor mapping ─────

describe("CvExtractionSchema — language level mapping", () => {
  const cases: Array<[string, string | null]> = [
    ["Native", "C2"],
    ["Fluent", "C2"],
    ["Bilingual", "C2"],
    ["Advanced", "C1"],
    ["Professional", "C1"],
    ["Upper Intermediate", "B2"],
    ["Intermediate", "B1"],
    ["Conversational", "B1"],
    ["Elementary", "A2"],
    ["Basic", "A1"],
    ["Beginner", "A1"],
    ["Gibberish", null],
  ];

  it.each(cases)("maps free-text level %s → %s", (input, expected) => {
    const result = CvExtractionSchema.safeParse({
      ...baseCv,
      languages: [{ language: "English", level: input }],
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.languages[0].level).toBe(expected);
    }
  });
});

// ─── CvExtractionSchema: business-area classification ─────────────

describe("CvExtractionSchema — businessAreaClassification", () => {
  it("normalizes a primary that matches an official field and drops customArea", () => {
    const result = CvExtractionSchema.safeParse({
      ...baseCv,
      businessAreaClassification: {
        primary: "technology", // lowercase official field
        secondary: [],
      },
    });
    expect(result.success).toBe(true);
    if (result.success) {
      const cls = result.data.businessAreaClassification!;
      expect(cls.customArea).toBeNull();
      expect(cls.primary).toBe("Technology");
    }
  });

  it("stores an unknown primary as customArea", () => {
    const result = CvExtractionSchema.safeParse({
      ...baseCv,
      businessAreaClassification: {
        primary: "Underwater Basket Weaving",
        secondary: [],
      },
    });
    expect(result.success).toBe(true);
    if (result.success) {
      const cls = result.data.businessAreaClassification!;
      expect(cls.customArea).toBe("Underwater Basket Weaving");
      expect(cls.primary).toBe("Underwater Basket Weaving");
    }
  });

  it("coerces a null classification to null", () => {
    const result = CvExtractionSchema.safeParse({ ...baseCv, businessAreaClassification: null });
    expect(result.success).toBe(true);
    if (result.success) expect(result.data.businessAreaClassification).toBeNull();
  });
});

// ─── CvExtractionSchema: numeric + array transforms ───────────────

describe("CvExtractionSchema — numeric and field transforms", () => {
  it("clamps a negative estimatedTotalYears to 0 and rounds", () => {
    const neg = CvExtractionSchema.safeParse({ ...baseCv, estimatedTotalYears: -5 });
    expect(neg.success && neg.data.estimatedTotalYears).toBe(0);

    const round = CvExtractionSchema.safeParse({ ...baseCv, estimatedTotalYears: 3.267 });
    expect(round.success && round.data.estimatedTotalYears).toBe(3.3);
  });

  it("drops LLM-invented fieldsOfWork values, keeping canonical ones (case-insensitive)", () => {
    const result = CvExtractionSchema.safeParse({
      ...baseCv,
      experiences: [
        {
          jobTitle: "Engineer",
          fieldsOfWork: ["technology", "Totally Made Up Field"],
        },
      ],
    });
    expect(result.success).toBe(true);
    if (result.success) {
      const fields = result.data.experiences[0].fieldsOfWork;
      expect(fields.length).toBe(1);
      expect(fields[0]).toBe("Technology");
    }
  });
});

// ─── Request DTOs ─────────────────────────────────────────────────

describe("CreateJobSchema", () => {
  it("requires a non-empty title", () => {
    expect(CreateJobSchema.safeParse({ title: "" }).success).toBe(false);
    expect(CreateJobSchema.safeParse({ title: "Engineer" }).success).toBe(true);
  });

  it("accepts an empty string OR a valid email for mentorEmail", () => {
    expect(CreateJobSchema.safeParse({ title: "X", mentorEmail: "" }).success).toBe(true);
    expect(CreateJobSchema.safeParse({ title: "X", mentorEmail: "m@x.com" }).success).toBe(true);
    expect(CreateJobSchema.safeParse({ title: "X", mentorEmail: "not-an-email" }).success).toBe(false);
  });

  it("rejects an unknown job type", () => {
    expect(CreateJobSchema.safeParse({ title: "X", type: "GHOST" }).success).toBe(false);
  });

  it("rejects a negative minYearsExperience", () => {
    expect(CreateJobSchema.safeParse({ title: "X", minYearsExperience: -1 }).success).toBe(false);
  });
});

describe("UpdateJobSchema", () => {
  it("allows nullable fields and an empty-string mentorEmail", () => {
    const result = UpdateJobSchema.safeParse({ description: null, mentorEmail: "" });
    expect(result.success).toBe(true);
  });

  it("rejects an invalid status enum", () => {
    expect(UpdateJobSchema.safeParse({ status: "PENDING" }).success).toBe(false);
  });
});

describe("CandidateFilterSchema", () => {
  it("applies defaults for page, pageSize and sortOrder", () => {
    const result = CandidateFilterSchema.parse({});
    expect(result.page).toBe(1);
    expect(result.pageSize).toBe(20);
    expect(result.sortOrder).toBe("desc");
  });

  it("enforces score bounds (0-100)", () => {
    expect(CandidateFilterSchema.safeParse({ minScore: 150 }).success).toBe(false);
    expect(CandidateFilterSchema.safeParse({ minScore: 50 }).success).toBe(true);
  });

  it("caps pageSize at 100", () => {
    expect(CandidateFilterSchema.safeParse({ pageSize: 500 }).success).toBe(false);
  });

  it("rejects an unknown sortBy column", () => {
    expect(CandidateFilterSchema.safeParse({ sortBy: "ssn" }).success).toBe(false);
  });
});

describe("CreateAssessmentSchema", () => {
  it("requires candidateId and a valid type, defaulting expiry to 48h", () => {
    const result = CreateAssessmentSchema.parse({
      candidateId: "c-1",
      type: "SPEAKING",
      language: "en",
    });
    expect(result.expiresInHours).toBe(48);
  });

  it("rejects an out-of-range expiry", () => {
    expect(
      CreateAssessmentSchema.safeParse({
        candidateId: "c-1",
        type: "SPEAKING",
        language: "en",
        expiresInHours: 999,
      }).success
    ).toBe(false);
  });
});

// ─── WidgetSpecValidationError ────────────────────────────────────

describe("WidgetSpecValidationError", () => {
  it("carries the issues payload and a stable name/message", () => {
    const err = new WidgetSpecValidationError([{ path: "metric" }]);
    expect(err.name).toBe("WidgetSpecValidationError");
    expect(err.message).toBe("Invalid widget spec");
    expect(err.issues).toEqual([{ path: "metric" }]);
    expect(err).toBeInstanceOf(Error);
  });
});

describe("DuplicateSkipError", () => {
  it("has a stable name and preserves its message", () => {
    const err = new DuplicateSkipError("already known candidate");
    expect(err.name).toBe("DuplicateSkipError");
    expect(err.message).toBe("already known candidate");
    expect(err).toBeInstanceOf(Error);
  });
});
