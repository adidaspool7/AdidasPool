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
  /**
   * Optional free-text evidence that can back a skill match — typically
   * experience job titles (e.g. "Team Lead", "Marketing Manager"). These
   * are tokenised with the same pipeline as `skillNames` and treated as
   * additional "skill" sets when deciding whether the candidate covers a
   * required skill. Never contributes to score *weight* — only to
   * coverage. Descriptions/bullets are intentionally NOT included (too
   * noisy to be a deterministic signal).
   */
  evidenceTexts?: string[];
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

/**
 * Tunable knobs for the fit engine. Defaults are hard-coded here so that
 * the pure function stays deterministic in tests; HR can override via the
 * use-case layer (read from `scoring_weights` or a settings table).
 */
export interface JobFitConfig {
  /**
   * Fraction (0..1) of the JD's required skills that a candidate must
   * cover before `Required Skills` is considered *met*. Default 0.5 —
   * "at least half of the musts". Set to 1 to restore strict behaviour.
   */
  requiredSkillThreshold: number;
}

export const DEFAULT_FIT_CONFIG: JobFitConfig = {
  requiredSkillThreshold: 0.5,
};

// ============================================
// PUBLIC ENTRY POINT
// ============================================

export function computeJobFit(
  job: JobRequirements,
  candidate: CandidateFitInput,
  config: JobFitConfig = DEFAULT_FIT_CONFIG
): JobFitResult {
  const breakdown: CriterionResult[] = [
    matchField(job, candidate),
    matchExperience(job, candidate),
    matchSeniority(job, candidate),
    matchRequiredSkills(job, candidate, config),
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
 * Required (must-have) skills.
 *
 * Eligibility is now *thresholded*: the criterion is "met" when the
 * candidate covers at least `config.requiredSkillThreshold` (default
 * 50 %) of the JD's required skills. Strict-all-required behaviour is
 * restored by setting the threshold to 1.
 *
 * Matching is token-based (Jaccard ≥ 0.5 OR substring after stop-word
 * removal), not verbatim — see `skillsMatch()` for details.
 */
export function matchRequiredSkills(
  job: JobRequirements,
  candidate: CandidateFitInput,
  config: JobFitConfig = DEFAULT_FIT_CONFIG
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
  const candidateTokenSets = buildCandidateSkillPool(candidate);
  const hits = job.requiredSkills.filter((s) =>
    candidateHasSkill(s, candidateTokenSets)
  );
  const score = Math.round((hits.length / job.requiredSkills.length) * 100);
  const missing = job.requiredSkills.filter(
    (s) => !candidateHasSkill(s, candidateTokenSets)
  );
  const coverage = hits.length / job.requiredSkills.length;
  const met = coverage >= config.requiredSkillThreshold;
  const thresholdPct = Math.round(config.requiredSkillThreshold * 100);
  return {
    key: "requiredSkills",
    label: "Required Skills",
    score,
    applicable: true,
    met,
    detail:
      missing.length === 0
        ? `All ${job.requiredSkills.length} required skills present.`
        : `Covers ${hits.length}/${job.requiredSkills.length} (threshold ${thresholdPct}%). Missing: ${missing.join(", ")}.`,
  };
}

/**
 * Preferred (nice-to-have) skills: never blocks eligibility (`met` always
 * true when applicable). Score is intersection ratio, using the same
 * token-based matcher as required skills.
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
  const candidateTokenSets = buildCandidateSkillPool(candidate);
  const hits = job.preferredSkills.filter((s) =>
    candidateHasSkill(s, candidateTokenSets)
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

// ============================================
// FUZZY SKILL MATCHING
// ============================================
//
// JDs and CVs rarely write skills the same way. "Microsoft Excel" in a CV
// vs. "Excel" in a JD, or "English communication skills" vs "Communication".
// We tokenize, drop filler words, apply bidirectional synonym groups to
// canonicalise token forms, then accept a match if either:
//   - one token set is a (non-trivial) subset of the other, or
//   - Jaccard similarity ≥ 0.5.
// This keeps the matcher deterministic and dependency-free.

const SKILL_STOPWORDS = new Set<string>([
  "skills",
  "skill",
  "experience",
  "knowledge",
  "proficiency",
  "proficient",
  "understanding",
  "familiarity",
  "fluent",
  "native",
  "with",
  "in",
  "of",
  "and",
  "or",
  "the",
  "a",
  "an",
  "for",
  "on",
  "to",
  "strong",
  "excellent",
  "good",
  "basic",
  "advanced",
]);

/**
 * Bidirectional synonym groups. Every token in a group is canonicalised
 * to the first entry (the "canonical form"). Both the JD side and the
 * candidate side run through the same canonicalisation, so matching
 * becomes an equivalence check rather than a free-text similarity.
 *
 * Rules for adding a group:
 *   - Tokens must be single words (no spaces).
 *   - Only include tokens that are *unambiguously* interchangeable in
 *     an HR-skill context. When in doubt, leave it out.
 */
const SKILL_SYNONYM_GROUPS: string[][] = [
  // Microsoft Office suite — JD often says "Microsoft Office", CVs list
  // individual apps. Canonical = "office".
  ["office", "excel", "word", "powerpoint", "outlook", "access", "onenote", "o365"],
  // People-management family.
  ["leadership", "lead", "manager", "management", "managing", "head", "supervisor", "supervising"],
  // Coaching/mentoring.
  ["coaching", "coach", "mentor", "mentoring", "mentorship"],
  // Training/teaching.
  ["training", "train", "teaching", "teacher", "instructor", "instruction", "facilitator", "facilitation"],
  // Analytical thinking / data analysis.
  ["analytical", "analysis", "analytics", "analyst", "analyze", "analysing", "analyzing"],
  // Communication.
  ["communication", "communications", "communicating", "presentation", "presenting", "presenter"],
  // Problem solving / troubleshooting.
  ["problem", "problem-solving", "troubleshooting", "troubleshoot", "debugging", "debug"],
  // Motivation / engagement.
  ["motivation", "motivating", "motivational", "engagement", "inspiring"],
  // Appraisal / performance review.
  ["appraisal", "appraisals", "review", "reviews", "evaluation", "evaluations", "feedback"],
];

const SKILL_TOKEN_CANONICAL = (() => {
  const map = new Map<string, string>();
  for (const group of SKILL_SYNONYM_GROUPS) {
    const canonical = group[0];
    for (const t of group) map.set(t, canonical);
  }
  return map;
})();

function canonicalToken(t: string): string {
  return SKILL_TOKEN_CANONICAL.get(t) ?? t;
}

function skillTokenSet(raw: string): Set<string> {
  const tokens = normalizeSkill(raw)
    .replace(/[^a-z0-9\s+.#-]/g, " ")
    .split(/\s+/)
    .filter((t) => t.length > 0 && !SKILL_STOPWORDS.has(t))
    .map(canonicalToken);
  return new Set(tokens);
}

function jaccard(a: Set<string>, b: Set<string>): number {
  if (a.size === 0 || b.size === 0) return 0;
  let inter = 0;
  for (const t of a) if (b.has(t)) inter++;
  const union = a.size + b.size - inter;
  return union === 0 ? 0 : inter / union;
}

function isMeaningfulSubset(small: Set<string>, large: Set<string>): boolean {
  if (small.size === 0 || small.size > large.size) return false;
  for (const t of small) if (!large.has(t)) return false;
  return true;
}

/**
 * Returns true if the required skill is "close enough" to any of the
 * candidate's skill token sets.
 */
function candidateHasSkill(
  required: string,
  candidateTokenSets: Set<string>[]
): boolean {
  const req = skillTokenSet(required);
  if (req.size === 0) return false;
  for (const c of candidateTokenSets) {
    if (c.size === 0) continue;
    if (isMeaningfulSubset(req, c)) return true; // "excel" ⊂ "microsoft excel"
    if (isMeaningfulSubset(c, req)) return true; // "excel" in JD ⊂ "microsoft excel"
    if (jaccard(req, c) >= 0.5) return true;
  }
  return false;
}

/**
 * Pool of tokenised skill-evidence sets for a candidate. Combines the
 * explicit `skillNames` with `evidenceTexts` (experience titles, etc.).
 * Empty sets are filtered out.
 */
function buildCandidateSkillPool(candidate: CandidateFitInput): Set<string>[] {
  const sources = [
    ...candidate.skillNames,
    ...(candidate.evidenceTexts ?? []),
  ];
  return sources.map(skillTokenSet).filter((s) => s.size > 0);
}
