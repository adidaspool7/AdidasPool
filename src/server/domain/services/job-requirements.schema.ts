/**
 * Job Requirements — Domain Schema
 *
 * ONION LAYER: Domain
 * DEPENDENCIES: zod (cross-cutting), FIELDS_OF_WORK constant (client constants shared via path alias)
 *
 * Structured representation of hiring requirements extracted from a raw JD by
 * the LLM. This is the *input contract* for the Phase-3 job-anchored matcher.
 *
 * Invariants (enforced here, not in the LLM prompt alone):
 *   - Every numeric field is either a number or null — never invented.
 *   - fieldsOfWork values must be a subset of the canonical 16.
 *   - cefr values are restricted to the CEFR scale (or null).
 *
 * See docs/JOB_ANCHORED_MATCHING_PLAN.md — Phase 1.
 */

import { z } from "zod";
import { FIELDS_OF_WORK } from "@/client/lib/constants";

/**
 * Current schema version. Bump when the shape changes incompatibly OR when
 * the extraction prompt changes in a way that produces materially different
 * output (so cached rows become stale and lazy-parse re-runs).
 *
 * v2 (2026-04-27): multilingual prompt — LLM now reads PT/ES/FR/DE/IT
 * job descriptions and writes the *output* strings in English, normalizes
 * education terms (Licenciatura/Diplom/Diplôme → BACHELOR), maps
 * "B2 inglés"-style language requirements, infers requirements from
 * sectionless prose, and uses title-based seniority hints.
 */
export const JOB_REQUIREMENTS_SCHEMA_VERSION = 2;

export const SeniorityLevelSchema = z.enum([
  "INTERN",
  "JUNIOR",
  "MID",
  "SENIOR",
  "LEAD",
  "DIRECTOR",
]);
export type SeniorityLevel = z.infer<typeof SeniorityLevelSchema>;

export const CefrLevelSchema = z.enum(["A1", "A2", "B1", "B2", "C1", "C2"]);
export type CefrLevel = z.infer<typeof CefrLevelSchema>;

export const EducationLevelSchema = z.enum([
  "HIGH_SCHOOL",
  "VOCATIONAL",
  "BACHELOR",
  "MASTER",
  "PHD",
  "OTHER",
]);
export type EducationLevel = z.infer<typeof EducationLevelSchema>;

const FieldOfWorkSchema = z.enum(
  FIELDS_OF_WORK as unknown as readonly [string, ...string[]]
);

/**
 * Tolerant fieldsOfWork: LLM occasionally invents a department name that
 * isn't in the canonical 16. Rather than rejecting the whole extraction,
 * silently drop unknown values. This is safe because downstream code only
 * uses canonical values for matching anyway.
 */
const FieldsOfWorkArraySchema = z.preprocess(
  (v) => {
    if (!Array.isArray(v)) return v;
    const allowed = new Set(FIELDS_OF_WORK as readonly string[]);
    return v.filter((x) => typeof x === "string" && allowed.has(x));
  },
  z.array(FieldOfWorkSchema).default([])
);

/**
 * JD requirements as extracted by the LLM.
 * All numeric fields default to null — the extractor is forbidden from
 * inventing them.
 */
export const JobRequirementsSchema = z.object({
  fieldsOfWork: FieldsOfWorkArraySchema,
  seniorityLevel: SeniorityLevelSchema.nullable().default(null),
  minYearsInField: z.number().int().min(0).max(40).nullable().default(null),
  requiredSkills: z.array(z.string().min(1)).default([]),
  preferredSkills: z.array(z.string().min(1)).default([]),
  requiredLanguages: z
    .array(
      z.object({
        language: z.string().min(1),
        cefr: CefrLevelSchema.nullable().default(null),
      })
    )
    .default([]),
  requiredEducationLevel: EducationLevelSchema.nullable().default(null),
  responsibilitiesSummary: z.string().nullable().default(null),
  rawExtractionModel: z.string(),
  rawExtractionTimestamp: z.string(),
});

export type JobRequirements = z.infer<typeof JobRequirementsSchema>;
