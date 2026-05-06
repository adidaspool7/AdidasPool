/**
 * Shared client-side constants and helpers for the per-job Fit scoring UI.
 *
 * Mirrors the server's `CRITERION_KEYS` in
 * `src/server/domain/services/job-fit.service.ts`. Keep these two in sync.
 */

export const CRITERION_KEYS = [
  "field",
  "experience",
  "seniority",
  "requiredSkills",
  "preferredSkills",
  "languages",
  "education",
] as const;

export type CriterionKey = (typeof CRITERION_KEYS)[number];

export const CRITERION_LABELS: Record<CriterionKey, string> = {
  field: "Field of Work",
  experience: "Experience (years)",
  seniority: "Seniority",
  requiredSkills: "Required Skills",
  preferredSkills: "Preferred Skills",
  languages: "Languages",
  education: "Education",
};

export const BALANCED_PRESET: Record<CriterionKey, number> = {
  field: 2,
  experience: 2,
  seniority: 1,
  requiredSkills: 3,
  preferredSkills: 1,
  languages: 1,
  education: 1,
};

export const SKILLS_FIRST_PRESET: Record<CriterionKey, number> = {
  field: 2,
  experience: 1,
  seniority: 1,
  requiredSkills: 3,
  preferredSkills: 2,
  languages: 1,
  education: 1,
};

export const EXPERIENCE_FIRST_PRESET: Record<CriterionKey, number> = {
  field: 3,
  experience: 3,
  seniority: 2,
  requiredSkills: 1,
  preferredSkills: 1,
  languages: 1,
  education: 1,
};

export const PRESETS: { label: string; weights: Record<CriterionKey, number> }[] = [
  { label: "Balanced", weights: BALANCED_PRESET },
  { label: "Skills-first", weights: SKILLS_FIRST_PRESET },
  { label: "Experience-first", weights: EXPERIENCE_FIRST_PRESET },
];

export function mergeWeights(
  raw: Record<string, number> | undefined
): Record<CriterionKey, number> {
  const out: Record<CriterionKey, number> = { ...BALANCED_PRESET };
  if (raw) {
    for (const k of CRITERION_KEYS) {
      const v = raw[k];
      if (typeof v === "number" && Number.isFinite(v)) {
        out[k] = Math.max(0, Math.min(3, v));
      }
    }
  }
  return out;
}

export function weightsEqual(
  a: Record<CriterionKey, number>,
  b: Record<CriterionKey, number>
): boolean {
  return CRITERION_KEYS.every((k) => a[k] === b[k]);
}
