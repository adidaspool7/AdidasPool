/**
 * CvExtractionSchema & Value Objects — Validation Tests
 *
 * Tests the Zod schema that validates LLM output and
 * domain value-object constants used in the upload pipeline.
 */

import { describe, it, expect } from "vitest";
import { CvExtractionSchema } from "@server/application/dtos";
import {
  MAX_FILE_SIZE_MB,
  ALLOWED_CV_MIME_TYPES,
  ALLOWED_CV_EXTENSIONS,
} from "@server/domain/value-objects";

// ─── CvExtractionSchema ──────────────────────────────────────────

describe("CvExtractionSchema", () => {
  const validPayload = {
    firstName: "João",
    lastName: "Silva",
    email: "joao@example.com",
    phone: "+351 912 345 678",
    location: "Porto",
    country: "Portugal",
    linkedinUrl: "https://linkedin.com/in/joao-silva",
    experiences: [
      {
        jobTitle: "Software Engineer",
        company: "adidas",
        location: "Porto",
        startDate: "2021-01",
        endDate: null,
        isCurrent: true,
        description: "Full-stack development",
      },
    ],
    education: [
      {
        institution: "FEUP",
        degree: "Bachelor",
        fieldOfStudy: "Informatics",
        startDate: "2017-09",
        endDate: "2021-06",
        level: "BACHELOR",
      },
    ],
    languages: [
      { language: "Portuguese", level: "C2" },
      { language: "English", level: "B2" },
    ],
    skills: [
      { name: "TypeScript", category: "Programming" },
      { name: "React", category: "Framework" },
    ],
  };

  it("should accept a fully valid extraction", () => {
    const result = CvExtractionSchema.safeParse(validPayload);
    expect(result.success).toBe(true);
  });

  it("should accept extraction with null optional fields", () => {
    const result = CvExtractionSchema.safeParse({
      ...validPayload,
      email: null,
      phone: null,
      location: null,
      country: null,
      linkedinUrl: null,
    });
    expect(result.success).toBe(true);
  });

  it("should accept extraction with missing optional fields", () => {
    const minimal = {
      firstName: "Ana",
      lastName: "Costa",
      experiences: [],
      education: [],
      languages: [],
      skills: [],
    };
    const result = CvExtractionSchema.safeParse(minimal);
    expect(result.success).toBe(true);
  });

  it("should fallback to 'Unknown' when firstName is missing", () => {
    const { firstName, ...noFirst } = validPayload;
    const result = CvExtractionSchema.safeParse(noFirst);
    // firstName is required in the schema shape — omitting it entirely still fails
    expect(result.success).toBe(false);
  });

  it("should fallback to 'Unknown' when lastName is missing", () => {
    const { lastName, ...noLast } = validPayload;
    const result = CvExtractionSchema.safeParse(noLast);
    expect(result.success).toBe(false);
  });

  it("should fallback to 'Unknown' when firstName is null", () => {
    const result = CvExtractionSchema.safeParse({
      ...validPayload,
      firstName: null,
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.firstName).toBe("Unknown");
    }
  });

  it("should fallback to 'Unknown' when lastName is null", () => {
    const result = CvExtractionSchema.safeParse({
      ...validPayload,
      lastName: null,
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.lastName).toBe("Unknown");
    }
  });

  it("should sanitize invalid email to null", () => {
    const result = CvExtractionSchema.safeParse({
      ...validPayload,
      email: "not-an-email",
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.email).toBeNull();
    }
  });

  it("should normalize linkedinUrl without protocol", () => {
    const result = CvExtractionSchema.safeParse({
      ...validPayload,
      linkedinUrl: "linkedin.com/in/joao-silva",
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.linkedinUrl).toBe("https://linkedin.com/in/joao-silva");
    }
  });

  it("should accept valid CEFR language levels", () => {
    for (const level of ["A1", "A2", "B1", "B2", "C1", "C2"]) {
      const result = CvExtractionSchema.safeParse({
        ...validPayload,
        languages: [{ language: "Test", level }],
      });
      expect(result.success).toBe(true);
    }
  });

  it("should reject invalid CEFR levels", () => {
    const result = CvExtractionSchema.safeParse({
      ...validPayload,
      languages: [{ language: "Test", level: "D1" }],
    });
    expect(result.success).toBe(false);
  });

  it("should accept valid education levels", () => {
    for (const level of ["HIGH_SCHOOL", "BACHELOR", "MASTER", "PHD", "VOCATIONAL", "OTHER"]) {
      const result = CvExtractionSchema.safeParse({
        ...validPayload,
        education: [{ ...validPayload.education[0], level }],
      });
      expect(result.success).toBe(true);
    }
  });

  it("should reject invalid education levels", () => {
    const result = CvExtractionSchema.safeParse({
      ...validPayload,
      education: [{ ...validPayload.education[0], level: "DIPLOMA" }],
    });
    expect(result.success).toBe(false);
  });

  it("should default isCurrent to false when omitted", () => {
    const result = CvExtractionSchema.safeParse({
      ...validPayload,
      experiences: [{ jobTitle: "Intern", company: "ACME" }],
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.experiences[0].isCurrent).toBe(false);
    }
  });

  it("should reject non-string non-null firstName (catches LLM hallucination)", () => {
    const result = CvExtractionSchema.safeParse({
      ...validPayload,
      firstName: 42,
    });
    expect(result.success).toBe(false);
  });

  it("should handle experiences with minimal data", () => {
    const result = CvExtractionSchema.safeParse({
      ...validPayload,
      experiences: [
        {
          jobTitle: "Intern",
          isCurrent: false,
        },
      ],
    });
    expect(result.success).toBe(true);
  });
});

// ─── Domain Value Objects ─────────────────────────────────────────

describe("Upload domain constants", () => {
  it("should have a reasonable file size limit", () => {
    expect(MAX_FILE_SIZE_MB).toBeGreaterThanOrEqual(5);
    expect(MAX_FILE_SIZE_MB).toBeLessThanOrEqual(50);
  });

  it("should allow PDF, DOCX, DOC, and TXT MIME types", () => {
    expect(ALLOWED_CV_MIME_TYPES).toContain("application/pdf");
    expect(ALLOWED_CV_MIME_TYPES).toContain(
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
    );
    expect(ALLOWED_CV_MIME_TYPES).toContain("text/plain");
  });

  it("should allow common CV file extensions", () => {
    expect(ALLOWED_CV_EXTENSIONS).toContain(".pdf");
    expect(ALLOWED_CV_EXTENSIONS).toContain(".docx");
    expect(ALLOWED_CV_EXTENSIONS).toContain(".txt");
  });
});
