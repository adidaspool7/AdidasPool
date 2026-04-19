/**
 * Job-Candidate Matching Domain Service
 *
 * ONION LAYER: Domain (innermost)
 * DEPENDENCIES: Only domain value objects — no infrastructure.
 *
 * Deterministic matching — no AI, fully transparent scoring.
 */

import { CEFR_LEVELS } from "@server/domain/value-objects";

// ============================================
// INTERFACES (Domain Types)
// ============================================

export interface MatchInput {
  candidate: {
    location?: string | null;
    country?: string | null;
    yearsOfExperience?: number | null;
    educationLevel?: string | null;
    languages: { language: string; level: string | null }[];
    experienceScore?: number | null;
  };
  job: {
    location?: string | null;
    country?: string | null;
    requiredLanguage?: string | null;
    requiredLanguageLevel?: string | null;
    requiredExperienceType?: string | null;
    minYearsExperience?: number | null;
    requiredEducationLevel?: string | null;
  };
}

export interface MatchResult {
  overallScore: number;
  breakdown: {
    criterion: string;
    met: boolean;
    score: number;
    details: string;
  }[];
  isEligible: boolean;
}

// ============================================
// MATCHING ENGINE
// ============================================

/**
 * Match a candidate against a job opening.
 * Returns a score and detailed breakdown.
 */
export function matchCandidateToJob(input: MatchInput): MatchResult {
  const breakdown: MatchResult["breakdown"] = [];
  const { candidate, job } = input;

  breakdown.push(matchLocation(candidate, job));
  breakdown.push(matchLanguage(candidate, job));
  breakdown.push(matchExperience(candidate, job));
  breakdown.push(matchEducation(candidate, job));

  const overallScore = Math.round(
    breakdown.reduce((sum, b) => sum + b.score, 0) / breakdown.length
  );

  const isEligible = breakdown.every((b) => b.met);

  return { overallScore, breakdown, isEligible };
}

// ============================================
// INTERNAL MATCHING FUNCTIONS
// ============================================

function matchLocation(
  candidate: MatchInput["candidate"],
  job: MatchInput["job"]
) {
  if (!job.location && !job.country) {
    return {
      criterion: "Location",
      met: true,
      score: 100,
      details: "No location requirement",
    };
  }

  const candidateLoc = (candidate.location || candidate.country || "")
    .toLowerCase()
    .trim();
  const jobLoc = (job.location || job.country || "").toLowerCase().trim();

  if (!candidateLoc) {
    return {
      criterion: "Location",
      met: false,
      score: 0,
      details: "Candidate location unknown",
    };
  }

  if (candidateLoc.includes(jobLoc) || jobLoc.includes(candidateLoc)) {
    return {
      criterion: "Location",
      met: true,
      score: 100,
      details: `Match: ${candidate.location}`,
    };
  }

  return {
    criterion: "Location",
    met: false,
    score: 0,
    details: `Mismatch: ${candidate.location} vs ${job.location}`,
  };
}

function matchLanguage(
  candidate: MatchInput["candidate"],
  job: MatchInput["job"]
) {
  if (!job.requiredLanguage) {
    return {
      criterion: "Language",
      met: true,
      score: 100,
      details: "No language requirement",
    };
  }

  const candidateLang = candidate.languages.find(
    (l) => l.language.toLowerCase() === job.requiredLanguage!.toLowerCase()
  );

  if (!candidateLang) {
    return {
      criterion: "Language",
      met: false,
      score: 0,
      details: `Missing required language: ${job.requiredLanguage}`,
    };
  }

  if (!job.requiredLanguageLevel || !candidateLang.level) {
    return {
      criterion: "Language",
      met: true,
      score: 70,
      details: `Has ${job.requiredLanguage}, level unverified`,
    };
  }

  const requiredIdx = CEFR_LEVELS.indexOf(
    job.requiredLanguageLevel as (typeof CEFR_LEVELS)[number]
  );
  const candidateIdx = CEFR_LEVELS.indexOf(
    candidateLang.level as (typeof CEFR_LEVELS)[number]
  );

  if (candidateIdx >= requiredIdx) {
    return {
      criterion: "Language",
      met: true,
      score: 100,
      details: `${candidateLang.level} meets ${job.requiredLanguageLevel} requirement`,
    };
  }

  const diff = requiredIdx - candidateIdx;
  return {
    criterion: "Language",
    met: false,
    score: Math.max(0, 100 - diff * 25),
    details: `${candidateLang.level} below ${job.requiredLanguageLevel} requirement`,
  };
}

function matchExperience(
  candidate: MatchInput["candidate"],
  job: MatchInput["job"]
) {
  if (!job.minYearsExperience) {
    return {
      criterion: "Experience",
      met: true,
      score: 100,
      details: "No experience requirement",
    };
  }

  const years = candidate.yearsOfExperience ?? 0;

  if (years >= job.minYearsExperience) {
    return {
      criterion: "Experience",
      met: true,
      score: 100,
      details: `${years} years meets ${job.minYearsExperience} year requirement`,
    };
  }

  const ratio = years / job.minYearsExperience;
  return {
    criterion: "Experience",
    met: false,
    score: Math.round(ratio * 100),
    details: `${years} years below ${job.minYearsExperience} year requirement`,
  };
}

function matchEducation(
  candidate: MatchInput["candidate"],
  job: MatchInput["job"]
) {
  if (!job.requiredEducationLevel) {
    return {
      criterion: "Education",
      met: true,
      score: 100,
      details: "No education requirement",
    };
  }

  const levelOrder = [
    "HIGH_SCHOOL",
    "VOCATIONAL",
    "BACHELOR",
    "MASTER",
    "PHD",
  ];
  const requiredIdx = levelOrder.indexOf(job.requiredEducationLevel);
  const candidateIdx = levelOrder.indexOf(candidate.educationLevel || "OTHER");

  if (candidateIdx >= requiredIdx) {
    return {
      criterion: "Education",
      met: true,
      score: 100,
      details: `${candidate.educationLevel} meets requirement`,
    };
  }

  return {
    criterion: "Education",
    met: false,
    score: Math.max(0, Math.round((candidateIdx / requiredIdx) * 100)),
    details: `${candidate.educationLevel || "Unknown"} below ${job.requiredEducationLevel} requirement`,
  };
}
