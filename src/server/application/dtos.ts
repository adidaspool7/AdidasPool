/**
 * Data Transfer Object Schemas
 *
 * ONION LAYER: Application
 * DEPENDENCIES: zod (validation library), domain value objects
 *
 * Zod schemas for validating API request/response data.
 * These sit at the application boundary — validating input
 * before it reaches domain logic.
 */

import { z } from "zod";
import { FIELDS_OF_WORK } from "@client/lib/constants";

// ============================================
// CV EXTRACTION DTO
// Enforced on LLM output to ensure structured data
// ============================================

export const CvExtractionSchema = z.object({
  firstName: z.string().nullable().transform((v) => v?.trim() || "Unknown"),
  lastName: z.string().nullable().transform((v) => v?.trim() || "Unknown"),
  email: z
    .string()
    .optional()
    .nullable()
    .transform((val) => {
      if (!val) return null;
      // Trim whitespace the LLM may include
      const trimmed = val.trim();
      if (!trimmed) return null;
      // Basic email regex — lenient enough for LLM output
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      return emailRegex.test(trimmed) ? trimmed.toLowerCase() : null;
    }),
  phone: z.string().optional().nullable(),
  location: z.string().optional().nullable(),
  country: z.string().optional().nullable(),
  linkedinUrl: z
    .string()
    .optional()
    .nullable()
    .transform((val) => {
      if (!val) return val;
      // LLMs often return URLs without protocol — normalize
      if (val.startsWith("http://") || val.startsWith("https://")) return val;
      return `https://${val}`;
    }),

  experiences: z.array(
    z.object({
      jobTitle: z.string().nullable().transform(v => v ?? "Unknown Role"),
      company: z.string().optional().nullable(),
      location: z.string().optional().nullable(),
      startDate: z.string().optional().nullable(),
      endDate: z.string().optional().nullable(),
      isCurrent: z.boolean().default(false),
      description: z.string().optional().nullable(),
      /**
       * Phase 2: per-experience Field of Work tags (subset of the 16).
       * Tolerant to LLM invention — unknown values are dropped.
       */
      fieldsOfWork: z.preprocess(
        (v) => {
          if (!Array.isArray(v)) return [];
          const allowed = new Set(FIELDS_OF_WORK as readonly string[]);
          return (v as unknown[])
            .filter((x): x is string => typeof x === "string")
            .map((x) => {
              // Tolerant match: case-insensitive
              const hit = (FIELDS_OF_WORK as readonly string[]).find(
                (f) => f.toLowerCase() === x.toLowerCase()
              );
              return hit ?? null;
            })
            .filter((x): x is string => x !== null && allowed.has(x));
        },
        z.array(z.string()).default([])
      ),
    })
  ),

  education: z.array(
    z.object({
      institution: z.string().optional().nullable(),
      degree: z.string().optional().nullable(),
      fieldOfStudy: z.string().optional().nullable(),
      startDate: z.string().optional().nullable(),
      endDate: z.string().optional().nullable(),
      level: z
        .enum(["HIGH_SCHOOL", "BACHELOR", "MASTER", "PHD", "VOCATIONAL", "OTHER"])
        .optional()
        .nullable(),
    })
  ),

  languages: z.array(
    z.object({
      language: z.string(),
      level: z
        .union([z.string(), z.null()])
        .optional()
        .transform((val) => {
          if (!val) return null;
          const v = String(val).trim().toUpperCase();
          // Already a CEFR code
          if (["A1", "A2", "B1", "B2", "C1", "C2"].includes(v)) {
            return v as "A1" | "A2" | "B1" | "B2" | "C1" | "C2";
          }
          // Map common free-text descriptors the LLM sometimes returns verbatim
          if (["NATIVE", "MOTHER TONGUE", "MOTHERTONGUE", "BILINGUAL", "FLUENT", "PROFICIENT", "FULL PROFESSIONAL"].includes(v)) {
            return "C2" as const;
          }
          if (["ADVANCED", "PROFESSIONAL", "PROFESSIONAL WORKING"].includes(v)) {
            return "C1" as const;
          }
          if (["UPPER INTERMEDIATE", "UPPER-INTERMEDIATE"].includes(v)) {
            return "B2" as const;
          }
          if (["INTERMEDIATE", "CONVERSATIONAL", "LIMITED WORKING"].includes(v)) {
            return "B1" as const;
          }
          if (["PRE-INTERMEDIATE", "ELEMENTARY"].includes(v)) {
            return "A2" as const;
          }
          if (["BASIC", "BEGINNER", "NOVICE"].includes(v)) {
            return "A1" as const;
          }
          return null;
        }),
    })
  ),

  skills: z.array(
    z.object({
      name: z.string(),
      category: z.string().optional().nullable(),
    })
  ),

  // Business area classification (LLM-assigned)
  businessAreaClassification: z
    .object({
      primary: z.string(),
      secondary: z.array(z.string()).default([]),
      customArea: z.string().optional().nullable(),
      reasoning: z.string().optional().nullable(),
    })
    .optional()
    .nullable()
    .transform((val) => {
      if (!val) return null;
      // Normalize primary to closest official field if possible
      const officialFields = FIELDS_OF_WORK as readonly string[];
      const normalizedPrimary = officialFields.find(
        (f) => f.toLowerCase() === val.primary.toLowerCase()
      );
      const normalizedSecondary = val.secondary
        .map((s) => officialFields.find((f) => f.toLowerCase() === s.toLowerCase()) ?? s)
        .filter((s) => s !== (normalizedPrimary ?? val.primary))
        .slice(0, 3);
      return {
        primary: normalizedPrimary ?? val.primary,
        secondary: normalizedSecondary,
        customArea: normalizedPrimary ? null : val.primary, // If primary not in official list, store as custom
        reasoning: val.reasoning,
      };
    }),

  // Estimated total years of experience (LLM-calculated from dates)
  estimatedTotalYears: z.number().optional().nullable().transform((val) => {
    if (val == null) return null;
    return Math.max(0, Math.round(val * 10) / 10); // Clamp ≥ 0, round to 1 decimal
  }),

  // Parsing confidence (LLM self-assessment)
  parsingConfidence: z
    .object({
      overall: z.number().min(0).max(1),
      name: z.number().min(0).max(1).optional(),
      location: z.number().min(0).max(1).optional(),
      languages: z.number().min(0).max(1).optional(),
      experienceDates: z.number().min(0).max(1).optional(),
      flags: z.array(z.string()).default([]),
    })
    .optional()
    .nullable(),
});

export type CvExtraction = z.infer<typeof CvExtractionSchema>;

// ============================================
// ASSESSMENT SCORING DTO
// ============================================

export const AssessmentScoringSchema = z.object({
  grammarScore: z.number().min(0).max(100),
  vocabularyScore: z.number().min(0).max(100),
  clarityScore: z.number().min(0).max(100),
  fluencyScore: z.number().min(0).max(100),
  customerHandlingScore: z.number().min(0).max(100),
  cefrEstimation: z.enum(["A1", "A2", "B1", "B2", "C1", "C2"]),
  feedbackSummary: z.string(),
  detailedFeedback: z
    .object({
      grammar: z.string(),
      vocabulary: z.string(),
      clarity: z.string(),
      fluency: z.string(),
      customerHandling: z.string(),
    })
    .optional(),
});

export type AssessmentScoring = z.infer<typeof AssessmentScoringSchema>;

// ============================================
// API REQUEST DTOs
// ============================================

export const CreateJobSchema = z.object({
  title: z.string().min(1, "Title is required"),
  description: z.string().optional(),
  department: z.string().optional(),
  location: z.string().optional(),
  country: z.string().optional(),
  type: z.enum(["FULL_TIME", "PART_TIME", "INTERNSHIP", "CONTRACT"]).optional(),
  // Internship-specific
  startDate: z.string().optional(),    // ISO date string
  endDate: z.string().optional(),      // ISO date string
  stipend: z.string().optional(),
  mentorName: z.string().optional(),
  mentorEmail: z.string().email().optional().or(z.literal("")),
  isErasmus: z.boolean().optional(),
  internshipStatus: z.enum(["DRAFT", "ACTIVE", "INACTIVE", "FINISHED"]).optional(),
  // Requirements
  requiredLanguage: z.string().optional(),
  requiredLanguageLevel: z
    .enum(["A1", "A2", "B1", "B2", "C1", "C2"])
    .optional(),
  requiredExperienceType: z.string().optional(),
  minYearsExperience: z.number().int().min(0).optional(),
  requiredEducationLevel: z
    .enum(["HIGH_SCHOOL", "BACHELOR", "MASTER", "PHD", "VOCATIONAL", "OTHER"])
    .optional(),
  requiredSkills: z.array(z.string().min(1)).optional(),
});

export type CreateJobInput = z.infer<typeof CreateJobSchema>;

export const UpdateJobSchema = z.object({
  title: z.string().min(1).optional(),
  description: z.string().optional().nullable(),
  department: z.string().optional().nullable(),
  location: z.string().optional().nullable(),
  country: z.string().optional().nullable(),
  type: z.enum(["FULL_TIME", "PART_TIME", "INTERNSHIP", "CONTRACT"]).optional(),
  status: z.enum(["DRAFT", "OPEN", "CLOSED", "ARCHIVED"]).optional(),
  // Internship-specific
  startDate: z.string().optional().nullable(),
  endDate: z.string().optional().nullable(),
  stipend: z.string().optional().nullable(),
  mentorName: z.string().optional().nullable(),
  mentorEmail: z.string().email().optional().nullable().or(z.literal("")),
  isErasmus: z.boolean().optional(),
  internshipStatus: z.enum(["DRAFT", "ACTIVE", "INACTIVE", "FINISHED"]).optional().nullable(),
  // Requirements
  requiredLanguage: z.string().optional().nullable(),
  requiredLanguageLevel: z.enum(["A1", "A2", "B1", "B2", "C1", "C2"]).optional().nullable(),
  requiredExperienceType: z.string().optional().nullable(),
  minYearsExperience: z.number().int().min(0).optional().nullable(),
  requiredEducationLevel: z.enum(["HIGH_SCHOOL", "BACHELOR", "MASTER", "PHD", "VOCATIONAL", "OTHER"]).optional().nullable(),
  requiredSkills: z.array(z.string().min(1)).optional().nullable(),
});

export type UpdateJobInput = z.infer<typeof UpdateJobSchema>;

export const CandidateFilterSchema = z.object({
  search: z.string().optional(),
  status: z
    .enum([
      "NEW",
      "PARSED",
      "SCREENED",
      "INVITED",
      "ASSESSED",
      "SHORTLISTED",
      "BORDERLINE",
      "ON_IMPROVEMENT_TRACK",
      "REJECTED",
      "HIRED",
      "OFFER_SENT",
    ])
    .optional(),
  country: z.string().optional(),
  locationSearch: z.string().optional(),
  minScore: z.number().min(0).max(100).optional(),
  maxScore: z.number().min(0).max(100).optional(),
  language: z.string().optional(),
  languageLevel: z.enum(["A1", "A2", "B1", "B2", "C1", "C2"]).optional(),
  sourceType: z.enum(["EXTERNAL", "INTERNAL"]).optional(),
  businessArea: z.string().optional(),
  shortlisted: z.boolean().optional(),
  needsReview: z.boolean().nullable().optional(),
  tags: z.array(z.string()).optional(),
  page: z.number().int().min(1).default(1),
  pageSize: z.number().int().min(1).max(100).default(20),
  sortBy: z.enum(["createdAt", "firstName", "lastName", "email", "overallCvScore", "country", "status", "languageScore"]).optional(),
  sortOrder: z.enum(["asc", "desc"]).default("desc"),
});

export type CandidateFilter = z.infer<typeof CandidateFilterSchema>;

export const CreateAssessmentSchema = z.object({
  candidateId: z.string().min(1),
  jobId: z.string().optional(),
  templateId: z.string().optional(),
  type: z.enum(["LISTENING_WRITTEN", "SPEAKING", "READING_ALOUD", "COMBINED"]),
  language: z.string(),
  expiresInHours: z.number().int().min(1).max(168).default(48),
});

export type CreateAssessmentInput = z.infer<typeof CreateAssessmentSchema>;

// ============================================
// UPDATE CANDIDATE DTO
// Partial schema for PATCH updates — all fields optional
// ============================================

export const UpdateCandidateSchema = z
  .object({
    firstName: z.string().min(1).optional(),
    lastName: z.string().min(1).optional(),
    email: z.string().email().optional().nullable(),
    phone: z.string().optional().nullable(),
    location: z.string().optional().nullable(),
    country: z.string().optional().nullable(),
    linkedinUrl: z.string().optional().nullable(),
    dateOfBirth: z.string().optional().nullable(),
    nationality: z.string().optional().nullable(),
    willingToRelocate: z.boolean().optional().nullable(),
    availability: z
      .enum(["Immediately", "1 month", "2 months", "3+ months"])
      .optional()
      .nullable(),
    workModel: z.enum(["REMOTE", "HYBRID", "ON_SITE"]).optional().nullable(),
    bio: z.string().max(500).optional().nullable(),
    sourceType: z.enum(["EXTERNAL", "INTERNAL"]).optional(),
    status: z
      .enum([
        "NEW",
        "PARSED",
        "SCREENED",
        "INVITED",
        "ASSESSED",
        "SHORTLISTED",
        "BORDERLINE",
        "ON_IMPROVEMENT_TRACK",
        "REJECTED",
        "HIRED",
        "OFFER_SENT",
      ])
      .optional(),
    tags: z.array(z.string()).optional(),
    motivationLetterUrl: z.string().optional().nullable(),
    motivationLetterText: z.string().optional().nullable(),
    learningAgreementUrl: z.string().optional().nullable(),
    needsReview: z.boolean().nullable().optional(),
    invitationSent: z.boolean().optional(),
    shortlisted: z.boolean().optional(),
  })
  .strict();

export type UpdateCandidateInput = z.infer<typeof UpdateCandidateSchema>;

// ============================================
// CANDIDATE RELATIONS DTO
// Used when saving edited related records (experiences, education, languages, skills)
// ============================================

export const CandidateRelationsUpdateSchema = z.object({
  experiences: z.array(
    z.object({
      jobTitle: z.string(),
      company: z.string().optional().nullable(),
      location: z.string().optional().nullable(),
      startDate: z.string().optional().nullable(),
      endDate: z.string().optional().nullable(),
      isCurrent: z.boolean().default(false),
      description: z.string().optional().nullable(),
    })
  ).optional(),
  education: z.array(
    z.object({
      institution: z.string().optional().nullable(),
      degree: z.string().optional().nullable(),
      fieldOfStudy: z.string().optional().nullable(),
      startDate: z.string().optional().nullable(),
      endDate: z.string().optional().nullable(),
      level: z.enum(["HIGH_SCHOOL", "BACHELOR", "MASTER", "PHD", "VOCATIONAL", "OTHER"]).optional().nullable(),
    })
  ).optional(),
  languages: z.array(
    z.object({
      language: z.string(),
      selfDeclaredLevel: z.enum(["A1", "A2", "B1", "B2", "C1", "C2"]).optional().nullable(),
    })
  ).optional(),
  skills: z.array(
    z.object({
      name: z.string(),
      category: z.string().optional().nullable(),
    })
  ).optional(),
});

export type CandidateRelationsUpdate = z.infer<typeof CandidateRelationsUpdateSchema>;

// ============================================
// UPDATE PROFILE DTO
// Used by candidates on the Settings page — limited to profile-only fields
// ============================================

export const UpdateProfileSchema = z.object({
  firstName: z.string().min(1, "First name is required").optional(),
  lastName: z.string().min(1, "Last name is required").optional(),
  email: z.string().email("Invalid email address").optional().nullable(),
  phone: z.string().optional().nullable(),
  location: z.string().optional().nullable(),
  nationality: z.string().optional().nullable(),
  linkedinUrl: z.string().optional().nullable(),
  dateOfBirth: z.string().optional().nullable(),
  willingToRelocate: z.boolean().optional().nullable(),
  availability: z
    .enum(["Immediately", "1 month", "2 months", "3+ months"])
    .optional()
    .nullable(),
  workModel: z.enum(["REMOTE", "HYBRID", "ON_SITE"]).optional().nullable(),
  bio: z.string().max(500, "Bio must be under 500 characters").optional().nullable(),
});

export type UpdateProfileInput = z.infer<typeof UpdateProfileSchema>;

export const InterviewProctoringEventSchema = z.object({
  eventType: z.string().min(1),
  severity: z.enum(["INFO", "WARNING", "CRITICAL"]),
  occurredAt: z.string().datetime().optional(),
  details: z.record(z.string(), z.unknown()).optional(),
});

export const StartInterviewRuntimeSchema = z.object({
  candidateId: z.string().min(1),
  targetSkill: z.string().min(1).optional(),
  interviewMode: z.enum(["TECHNICAL", "LANGUAGE"]).default("TECHNICAL"),
});

export const StartInterviewRealtimeSchema = z.object({
  mode: z.enum(["text", "voice"]).default("text"),
  candidate: z.object({
    candidate_id: z.string().min(1),
    full_name: z.string().optional().nullable(),
    target_skill: z.string().optional().nullable(),
    mode: z.enum(["TECHNICAL", "LANGUAGE"]).default("TECHNICAL"),
    skills: z
      .array(
        z.object({
          name: z.string().min(1),
          category: z.string().optional().nullable(),
        })
      )
      .default([]),
    projects: z
      .array(
        z.object({
          title: z.string().optional().nullable(),
          description: z.string().min(1),
          technologies: z.array(z.string()).default([]),
        })
      )
      .default([]),
  }),
});

export type InterviewProctoringEventInput = z.infer<
  typeof InterviewProctoringEventSchema
>;
export type StartInterviewRuntimeInput = z.infer<typeof StartInterviewRuntimeSchema>;
export type StartInterviewRealtimeInput = z.infer<typeof StartInterviewRealtimeSchema>;
