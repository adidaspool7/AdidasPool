/**
 * Matching Engine — Unit Tests
 */

import { describe, it, expect } from "vitest";
import { matchCandidateToJob } from "@server/domain/services/matching.service";

describe("matchCandidateToJob", () => {
  it("should return 100% match for a perfect candidate", () => {
    const result = matchCandidateToJob({
      candidate: {
        location: "Berlin",
        country: "Germany",
        yearsOfExperience: 5,
        educationLevel: "BACHELOR",
        languages: [{ language: "German", level: "C1" }],
        experienceScore: 90,
      },
      job: {
        location: "Berlin",
        country: "Germany",
        requiredLanguage: "German",
        requiredLanguageLevel: "B2",
        requiredExperienceType: "customer service",
        minYearsExperience: 3,
        requiredEducationLevel: "BACHELOR",
      },
    });

    expect(result.overallScore).toBe(100);
    expect(result.isEligible).toBe(true);
    expect(result.breakdown).toHaveLength(4);
  });

  it("should return low score for a poor match", () => {
    const result = matchCandidateToJob({
      candidate: {
        location: "Tokyo",
        country: "Japan",
        yearsOfExperience: 0,
        educationLevel: "HIGH_SCHOOL",
        languages: [{ language: "Japanese", level: "C2" }],
        experienceScore: 10,
      },
      job: {
        location: "Berlin",
        country: "Germany",
        requiredLanguage: "German",
        requiredLanguageLevel: "B2",
        requiredExperienceType: "customer service",
        minYearsExperience: 5,
        requiredEducationLevel: "MASTER",
      },
    });

    expect(result.overallScore).toBeLessThan(30);
    expect(result.isEligible).toBe(false);
  });

  it("should handle jobs with no requirements gracefully", () => {
    const result = matchCandidateToJob({
      candidate: {
        location: "Anywhere",
        languages: [],
      },
      job: {},
    });

    expect(result.overallScore).toBe(100);
    expect(result.isEligible).toBe(true);
  });

  it("should partially match when language level is close", () => {
    const result = matchCandidateToJob({
      candidate: {
        location: "Berlin",
        languages: [{ language: "German", level: "B1" }],
      },
      job: {
        location: "Berlin",
        requiredLanguage: "German",
        requiredLanguageLevel: "B2",
      },
    });

    // Language not met, but close → partial score
    expect(result.isEligible).toBe(false);
    const langBreakdown = result.breakdown.find(
      (b) => b.criterion === "Language"
    );
    expect(langBreakdown?.score).toBeGreaterThan(0);
    expect(langBreakdown?.score).toBeLessThan(100);
  });
});
