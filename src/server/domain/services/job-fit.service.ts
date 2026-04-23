/**
 * Job Fit — Domain Service
 *
 * ONION LAYER: Domain (innermost)
 * DEPENDENCIES: only domain value-objects + JobRequirements schema. No I/O.
 *
 * Pure function `computeJobFit(input)` ranks how well a candidate matches
 * a single job's *parsed* requirements. Inputs are structured upstream
 * (Phase 1 for the JD, Phase 2 for the candidate's per-field experience),
 * so this layer can stay completely free of LLM calls or DB lookups.
 *
 * Design rules (see docs/JOB_ANCHORED_MATCHING_PLAN.md §2):
 *   - Each criterion returns `applicable: false` when the JD has no
 *     requirement on that dimension. Those criteria are dropped from the
 *     average — they are NOT shown as misleading 100s.
 *   - The overall score is the average of *applicable* criteria only.
 *   - A criterion's `met` flag is what HR-side "pass/fail" filters use.
 */

import {
  CEFR_LEVELS,
  EDUCATION_LEVEL_SCORES,
} from "@server/domain/value-objects";
import type {
  JobRequirements,
  CefrLevel,
  EducationLevel,
  SeniorityLevel,
} from "@server/domain/services/job-requirements.schema";

// ============================================
// INPUT / OUTPUT TYPES
// ============================================

export interface CandidateFitInput {
  /** Years of experience grouped by canonical Field of Work. */
  experienceByField: Record<string, number>;
  /** Total years across all experiences (used when no field requirement). */
  totalYearsExperience: number;
  /** Highest education level reached, or null. */
  educationLevel: EducationLevel | string | null;
  /** Languages with self-declared CEFR. */
  languages: Array<{ language: string; cefr: CefrLevel | string | null }>;
  /** Lower-cased skill names (canonical form). */
  skillNames: string[];
  /** Optional pre-computed seniority (Phase 5 will compute this). */
  seniorityLevel?: SeniorityLevel | null;
}

export interface CriterionResult {
  key: string;
  label: string;
  /** 0-100. Meaningless when applicable=false. */
  score: number;
  /** True iff the JD set a requirement on this dimension. */
  applicable: boolean;
  /** True iff the candidate satisfies the requirement (or applicable=false). */
  met: boolean;
  /** Short human-readable explanation. */
  detail: string;
}

export interface JobFitResult {
  /** Average of applicable criteria (0-100). 0 when nothing is applicable. */
  overallScore: number;
  /** True iff every applicable criterion is `met`. */
  isEligible: boolean;
  /** All criteria, including the inapplicable ones (UI may hide them). */
  breakdown: CriterionResult[];
}

// ============================================
// PUBLIC ENTRY POINT
// ============================================

export function computeJobFit(
  job: JobRequirements,
  candidate: CandidateFitInput
): JobFitResult {
  const breakdown: CriterionResult[] = [
    matchField(job, candidate),
    matchExperience(job, candidate),
    matchSeniority(job, candidate),
    matchRequiredSkills(job, candidate),
    matchPreferredSkills(job, candidate),
    matchLanguages(job, candidate),
    matchEducation(job, candidate),
  ];

  const applicable = breakdown.filter((c) => c.applicable);
  const overallScore =
    applicable.length === 0
      ? 0
      : Math.round(
          applicable.reduce((sum, c) => sum + c.score, 0) / applicable.length
        );
  const isEligible = applicable.every((c) => c.met);

  return { overallScore, isEligible, breakdown };
}

// ============================================
// CRITERION FUNCTIONS
// ============================================

/**
 * Field of Work: how many of the JD's required fields does the candidate
 * have *any* tagged experience in?
 */
export function matchField(
  job: JobRequirements,
  candidate: CandidateFitInput
): CriterionResult {
  if (job.fieldsOfWork.length === 0) {
    return {
      key: "field",
      label: "Field of Work",
      score: 0,
      applicable: false,
      met: true,
      detail: "JD does not specify a field of work.",
    };
  }
  const hits = job.fieldsOfWork.filter(
    (f) => (candidate.experienceByField[f] ?? 0) > 0
  );
  const score = Math.round((hits.length / job.fieldsOfWork.length) * 100);
  return {
    key: "field",
    label: "Field of Work",
    score,
    applicable: true,
    met: hits.length > 0,
    detail:
      hits.length === 0
        ? `JD wants ${job.fieldsOfWork.join(", ")}; candidate has no tagged experience in any of them.`
        : `Matches ${hits.length}/${job.fieldsOfWork.length}: ${hits.join(", ")}.`,
  };
}

/**
 * Field-specific experience: does the candidate have at least
 * `min_years_in_field` summed across the JD's required fields?
 * Falls back to total years if no field is specified.
 */
export function matchExperience(
  job: JobRequirements,
  candidate: CandidateFitInput
): CriterionResult {
  if (job.minYearsInField === null) {
    return {
      key: "experience",
      label: "Experience",
      score: 0,
      applicable: false,
      met: true,
      detail: "JD does not specify a minimum years of experience.",
    };
  }
  const required = job.minYearsInField;
  const yearsInScope =
    job.fieldsOfWork.length > 0
      ? job.fieldsOfWork.reduce(
          (sum, f) => sum + (candidate.experienceByField[f] ?? 0),
          0
        )
      : candidate.totalYearsExperience;

  const ratio = required <= 0 ? 1 : yearsInScope / required;
  const score = Math.round(Math.min(1, ratio) * 100);
  const met = yearsInScope >= required;
  const fieldLabel =
    job.fieldsOfWork.length > 0 ? job.fieldsOfWork.join("/") : "any field";
  return {
    key: "experience",
    label: "Experience",
    score,
    applicable: true,
    met,
    detail: met
      ? `${yearsInScope.toFixed(1)}y in ${fieldLabel} (≥ ${required}y required).`
      : `${yearsInScope.toFixed(1)}y in ${fieldLabel}, JD wants ${required}y.`,
  };
}

/**
 * Seniority: ordinal compare against JD's seniority level. The candidate's
 * seniority is taken from `candidate.seniorityLevel` if pre-computed, else
 * inferred from total years (rough heuristic).
 */
export function matchSeniority(
  job: JobRequirements,
  candidate: CandidateFitInput
): CriterionResult {
  if (!job.seniorityLevel) {
    return {
      key: "seniority",
      label: "Seniority",
      score: 0,
      applicable: false,
      met: true,
      detail: "JD does not specify a seniority level.",
    };
  }
  const required = SENIORITY_RANK[job.seniorityLevel];
  const candidateSeniority =
    candidate.seniorityLevel ?? inferSeniorityFromYears(candidate.totalYearsExperience);
  const candidateRank = SENIORITY_RANK[candidateSeniority];
  const met = candidateRank >= required;
  const distance = required - candidateRank; // > 0 means under-seniored
  const score = Math.round(Math.max(0, Math.min(1, 1 - distance / 3)) * 100);
  return {
    key: "seniority",
    label: "Seniority",
    score,
    applicable: true,
    met,
    detail: met
      ? `Candidate ${candidateSeniority} ≥ JD ${job.seniorityLevel}.`
      : `Candidate ${candidateSeniority}, JD wants ${job.seniorityLevel}.`,
  };
}

/**
 * Required (must-have) skills: pass iff every required skill is on the
 * candidate. Score is intersection ratio.
 */
export function matchRequiredSkills(
  job: JobRequirements,
  candidate: CandidateFitInput
): CriterionResult {
  if (job.requiredSkills.length === 0) {
    return {
      key: "requiredSkills",
      label: "Required Skills",
      score: 0,
      applicable: false,
      met: true,
      detail: "JD does not list any required skill.",
    };
  }
  const candidateSet = normalizedSkillSet(candidate.skillNames);
  const hits = job.requiredSkills.filter((s) =>
    candidateSet.has(normalizeSkill(s))
  );
  const score = Math.round((hits.length / job.requiredSkills.length) * 100);
  const missing = job.requiredSkills.filter((s) => !candidateSet.has(normalizeSkill(s)));
  return {
    key: "requiredSkills",
    label: "Required Skills",
    score,
    applicable: true,
    met: missing.length === 0,
    detail:
      missing.length === 0
        ? `All ${job.requiredSkills.length} required skills present.`
        : `Missing: ${missing.join(", ")}.`,
  };
}

/**
 * Preferred (nice-to-have) skills: never blocks eligibility (`met` always
 * true when applicable). Score is intersection ratio.
 */
export function matchPreferredSkills(
  job: JobRequirements,
  candidate: CandidateFitInput
): CriterionResult {
  if (job.preferredSkills.length === 0) {
    return {
      key: "preferredSkills",
      label: "Preferred Skills",
      score: 0,
      applicable: false,
      met: true,
      detail: "JD does not list any preferred skill.",
    };
  }
  const candidateSet = normalizedSkillSet(candidate.skillNames);
  const hits = job.preferredSkills.filter((s) =>
    candidateSet.has(normalizeSkill(s))
  );
  const score = Math.round((hits.length / job.preferredSkills.length) * 100);
  return {
    key: "preferredSkills",
    label: "Preferred Skills",
    score,
    applicable: true,
    met: true, // never blocks eligibility
    detail: `Has ${hits.length}/${job.preferredSkills.length} preferred skills.`,
  };
}

/**
 * Languages: pass iff every required language is spoken at >= the JD CEFR.
 * If JD CEFR is null, presence alone counts as a pass (score 80, no penalty).
 */
export function matchLanguages(
  job: JobRequirements,
  candidate: CandidateFitInput
): CriterionResult {
  if (job.requiredLanguages.length === 0) {
    return {
      key: "languages",
      label: "Languages",
      score: 0,
      applicable: false,
      met: true,
      detail: "JD does not specify required languages.",
    };
  }
  const candidateMap = new Map<string, number>();
  for (const cl of candidate.languages) {
    const idx = cefrIndex(cl.cefr);
    candidateMap.set(cl.language.toLowerCase(), idx);
  }

  const perLanguage = job.requiredLanguages.map((req) => {
    const candidateIdx = candidateMap.get(req.language.toLowerCase()) ?? -1;
    if (candidateIdx === -1) return { req, score: 0, met: false, reason: "missing" };
    if (req.cefr === null) {
      return { req, score: 80, met: true, reason: "level unverified" };
    }
    const requiredIdx = cefrIndex(req.cefr);
    if (candidateIdx >= requiredIdx) return { req, score: 100, met: true, reason: "OK" };
    const gap = requiredIdx - candidateIdx;
    return { req, score: Math.max(0, 100 - gap * 25), met: false, reason: `${gap} CEFR level(s) below` };
  });

  const score = Math.round(
    perLanguage.reduce((s, r) => s + r.score, 0) / perLanguage.length
  );
  const met = perLanguage.every((r) => r.met);
  const detail = perLanguage
    .map((r) => `${r.req.language}${r.req.cefr ? ` ${r.req.cefr}` : ""}: ${r.reason}`)
    .join("; ");
  return {
    key: "languages",
    label: "Languages",
    score,
    applicable: true,
    met,
    detail,
  };
}

/**
 * Education: ordinal compare against the JD's required level.
 */
export function matchEducation(
  job: JobRequirements,
  candidate: CandidateFitInput
): CriterionResult {
  if (!job.requiredEducationLevel) {
    return {
      key: "education",
      label: "Education",
      score: 0,
      applicable: false,
      met: true,
      detail: "JD does not specify an education level.",
    };
  }
  const requiredScore = EDUCATION_LEVEL_SCORES[job.requiredEducationLevel] ?? 0;
  const candidateScore = candidate.educationLevel
    ? EDUCATION_LEVEL_SCORES[candidate.educationLevel] ?? 0
    : 0;
  const met = candidateScore >= requiredScore;
  const score = met
    ? 100
    : requiredScore > 0
      ? Math.round((candidateScore / requiredScore) * 100)
      : 0;
  return {
    key: "education",
    label: "Education",
    score,
    applicable: true,
    met,
    detail: met
      ? `Candidate ${candidate.educationLevel ?? "n/a"} ≥ JD ${job.requiredEducationLevel}.`
      : `Candidate ${candidate.educationLevel ?? "none"}, JD wants ${job.requiredEducationLevel}.`,
  };
}

// ============================================
// HELPERS
// ============================================

const SENIORITY_RANK: Record<SeniorityLevel, number> = {
  INTERN: 0,
  JUNIOR: 1,
  MID: 2,
  SENIOR: 3,
  LEAD: 4,
  DIRECTOR: 5,
};

function inferSeniorityFromYears(years: number): SeniorityLevel {
  if (years < 1) return "INTERN";
  if (years < 3) return "JUNIOR";
  if (years < 6) return "MID";
  if (years < 10) return "SENIOR";
  if (years < 15) return "LEAD";
  return "DIRECTOR";
}

function cefrIndex(level: string | null | undefined): number {
  if (!level) return -1;
  const idx = (CEFR_LEVELS as readonly string[]).indexOf(level.toUpperCase());
  return idx;
}

function normalizeSkill(s: string): string {
  return s.trim().toLowerCase().replace(/\s+/g, " ");
}

function normalizedSkillSet(skills: string[]): Set<string> {
  return new Set(skills.map(normalizeSkill));
}
