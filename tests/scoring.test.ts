/**
 * CV Scoring Engine — Unit Tests
 */

import { describe, it, expect } from "vitest";
import {
  calculateCvScore,
  calculateAssessmentScore,
  estimateCefrLevel,
  isBorderline,
} from "@server/domain/services/scoring.service";

describe("calculateCvScore", () => {
  it("should return 0-100 score for valid input", () => {
    const result = calculateCvScore({
      yearsOfExperience: 5,
      educationLevel: "BACHELOR",
      candidateLocation: "Porto, Portugal",
      candidateCountry: "Portugal",
      languages: [
        { language: "English", level: "C1" },
        { language: "Portuguese", level: "C2" },
      ],
    });

    expect(result.overallScore).toBeGreaterThanOrEqual(0);
    expect(result.overallScore).toBeLessThanOrEqual(100);
    expect(result.breakdown).toHaveLength(5);
    expect(result.languageScore).toBeGreaterThan(0);
  });

  it("should give higher score for more relevant experience", () => {
    const highRelevance = calculateCvScore({
      yearsOfExperience: 8,
      educationLevel: "MASTER",
      candidateLocation: "Porto, Portugal",
      candidateCountry: "Portugal",
      languages: [
        { language: "English", level: "C2" },
        { language: "Portuguese", level: "C2" },
      ],
    });

    const lowRelevance = calculateCvScore({
      yearsOfExperience: 1,
      educationLevel: "HIGH_SCHOOL",
      candidateLocation: "Tokyo",
      candidateCountry: "Japan",
      languages: [{ language: "Japanese", level: "C2" }],
    });

    expect(highRelevance.overallScore).toBeGreaterThan(
      lowRelevance.overallScore
    );
  });

  it("should handle null/missing values gracefully", () => {
    const result = calculateCvScore({
      yearsOfExperience: 0,
      educationLevel: null,
      candidateLocation: null,
      candidateCountry: null,
      languages: [],
    });

    expect(result.overallScore).toBeGreaterThanOrEqual(0);
  });

  it("should cap scores at boundaries", () => {
    const result = calculateCvScore({
      yearsOfExperience: 20,
      educationLevel: "PHD",
      candidateLocation: "Porto, Portugal",
      candidateCountry: "Portugal",
      languages: [
        { language: "English", level: "C2" },
        { language: "Portuguese", level: "C2" },
        { language: "German", level: "C1" },
        { language: "French", level: "B2" },
        { language: "Spanish", level: "B2" },
      ],
    });

    expect(result.experienceScore).toBeLessThanOrEqual(100);
    expect(result.languageScore).toBeLessThanOrEqual(100);
  });

  it("should flag foreign candidates without English", () => {
    const result = calculateCvScore({
      yearsOfExperience: 3,
      educationLevel: "BACHELOR",
      candidateLocation: "Berlin",
      candidateCountry: "Germany",
      languages: [{ language: "German", level: "C2" }],
    });

    expect(result.languageFlags).toContain("no_english");
    expect(result.languageFlags).toContain("foreign_no_english");
  });

  it("should give high language score for bilingual English+Portuguese", () => {
    const result = calculateCvScore({
      yearsOfExperience: 3,
      educationLevel: "BACHELOR",
      candidateLocation: "Porto",
      candidateCountry: "Portugal",
      languages: [
        { language: "English", level: "C1" },
        { language: "Portuguese", level: "C2" },
      ],
    });

    // English C1 = 30 + Portuguese C2 = 25 = 55
    expect(result.languageScore).toBe(55);
  });
});

describe("calculateAssessmentScore", () => {
  it("should return weighted average of sub-scores", () => {
    const score = calculateAssessmentScore({
      grammar: 80,
      vocabulary: 70,
      clarity: 90,
      fluency: 60,
      customerHandling: 75,
    });

    expect(score).toBe(75); // Equal weights: (80+70+90+60+75)/5
  });

  it("should respect custom weights", () => {
    const score = calculateAssessmentScore(
      {
        grammar: 100,
        vocabulary: 0,
        clarity: 0,
        fluency: 0,
        customerHandling: 0,
      },
      {
        grammar: 100,
        vocabulary: 0,
        clarity: 0,
        fluency: 0,
        customerHandling: 0,
      }
    );

    expect(score).toBe(100);
  });
});

describe("estimateCefrLevel", () => {
  it("should return C2 for scores >= 90", () => {
    expect(estimateCefrLevel(95)).toBe("C2");
  });

  it("should return B1 for scores around 50-64", () => {
    expect(estimateCefrLevel(55)).toBe("B1");
  });

  it("should return A1 for very low scores", () => {
    expect(estimateCefrLevel(10)).toBe("A1");
  });
});

describe("isBorderline", () => {
  it("should identify borderline candidates", () => {
    expect(isBorderline(50)).toBe(true);
    expect(isBorderline(55)).toBe(true);
  });

  it("should not flag non-borderline candidates", () => {
    expect(isBorderline(80)).toBe(false);
    expect(isBorderline(20)).toBe(false);
  });
});
