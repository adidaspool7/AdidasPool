/**
 * Domain Value Objects & Constants
 *
 * ONION LAYER: Domain (innermost)
 * DEPENDENCIES: None — this is the core of the application.
 *
 * All business-level constants, enumerations, and configuration values
 * live here. No framework or infrastructure imports allowed.
 */

// ============================================
// CEFR LANGUAGE LEVELS
// ============================================

export const CEFR_LEVELS = ["A1", "A2", "B1", "B2", "C1", "C2"] as const;
export type CEFRLevel = (typeof CEFR_LEVELS)[number];

export const CEFR_LEVEL_LABELS: Record<string, string> = {
  A1: "A1 - Beginner",
  A2: "A2 - Elementary",
  B1: "B1 - Intermediate",
  B2: "B2 - Upper Intermediate",
  C1: "C1 - Advanced",
  C2: "C2 - Proficient",
};

// ============================================
// CANDIDATE STATUS
// ============================================

export const CANDIDATE_STATUS_CONFIG = {
  NEW: { label: "New", color: "bg-gray-100 text-gray-800" },
  PARSED: { label: "Parsed", color: "bg-blue-100 text-blue-800" },
  SCREENED: { label: "Screened", color: "bg-indigo-100 text-indigo-800" },
  INVITED: { label: "Invited", color: "bg-yellow-100 text-yellow-800" },
  ASSESSED: { label: "Assessed", color: "bg-purple-100 text-purple-800" },
  SHORTLISTED: { label: "Shortlisted", color: "bg-green-100 text-green-800" },
  BORDERLINE: { label: "Borderline", color: "bg-orange-100 text-orange-800" },
  ON_IMPROVEMENT_TRACK: {
    label: "On Track",
    color: "bg-cyan-100 text-cyan-800",
  },
  REJECTED: { label: "Rejected", color: "bg-red-100 text-red-800" },
  HIRED: { label: "Hired", color: "bg-emerald-100 text-emerald-800" },
} as const;

// ============================================
// SCORING WEIGHTS (default — HR can adjust via UI)
// ============================================

export const CV_SCORING_WEIGHTS = {
  experience: 0.25,
  yearsOfExperience: 0.10,
  educationLevel: 0.15,
  locationMatch: 0.15,
  language: 0.35,
} as const;

export type ScoringWeightKey = keyof typeof CV_SCORING_WEIGHTS;

export const EDUCATION_LEVEL_SCORES: Record<string, number> = {
  HIGH_SCHOOL: 20,
  VOCATIONAL: 40,
  BACHELOR: 60,
  MASTER: 80,
  PHD: 100,
  OTHER: 30,
};

// ============================================
// LANGUAGE SCORING POINTS
// ============================================

/** Points awarded for English proficiency */
export const ENGLISH_SCORE_MAP: Record<string, number> = {
  C2: 35,
  C1: 30,
  B2: 20,
  B1: 10,
  A2: 5,
  A1: 2,
};

/** Points awarded for Portuguese proficiency */
export const PORTUGUESE_SCORE_MAP: Record<string, number> = {
  C2: 25,
  C1: 20,
  B2: 15,
  B1: 10,
  A2: 5,
  A1: 2,
};

/** Bonus points per additional language at B2+ level (max 30pts total) */
export const ADDITIONAL_LANGUAGE_BONUS = 10;
export const MAX_ADDITIONAL_LANGUAGE_BONUS = 30;

/** Penalty for foreign candidates without English listed */
export const FOREIGN_NO_ENGLISH_PENALTY = 20;

// ============================================
// LOCATION SCORING
// ============================================

// Distance-based scoring from Maia, Porto — see scoring.service.ts
// Portugal & Spain cities scored by proximity; all others = 0

export const ASSESSMENT_DEFAULT_WEIGHTS = {
  grammar: 20,
  vocabulary: 20,
  clarity: 20,
  fluency: 20,
  customerHandling: 20,
} as const;

// ============================================
// THRESHOLDS & LIMITS
// ============================================

export const BORDERLINE_THRESHOLD = {
  min: 45,
  max: 60,
} as const;

export const IMPROVEMENT_TRACK_DURATION_DAYS = 14;
export const MAGIC_LINK_EXPIRY_HOURS = 48;

export const DEFAULT_PAGE_SIZE = 20;
export const MAX_PAGE_SIZE = 100;

export const MAX_FILE_SIZE_MB = 10;
export const MAX_BULK_FILES = 500;
export const ALLOWED_CV_EXTENSIONS = [".pdf", ".doc", ".docx", ".txt"];
export const ALLOWED_CV_MIME_TYPES = [
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "text/plain",
];
