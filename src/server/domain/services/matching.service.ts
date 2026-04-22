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
    skills?: string[] | null;
    experienceScore?: number | null;
    primaryBusinessArea?: string | null;
    secondaryBusinessAreas?: string[] | null;
    candidateCustomArea?: string | null;
    willingToRelocate?: boolean | null;
  };
  job: {
    location?: string | null;
    country?: string | null;
    department?: string | null;
    requiredLanguage?: string | null;
    requiredLanguageLevel?: string | null;
    requiredExperienceType?: string | null;
    minYearsExperience?: number | null;
    requiredEducationLevel?: string | null;
    requiredSkills?: string[] | null;
  };
}

export interface MatchResult {
  overallScore: number;
  breakdown: {
    criterion: string;
    met: boolean;
    score: number;
    details: string;
    applicable: boolean;
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

  breakdown.push(matchField(candidate, job));
  breakdown.push(matchLocation(candidate, job));
  breakdown.push(matchLanguage(candidate, job));
  breakdown.push(matchExperience(candidate, job));
  breakdown.push(matchEducation(candidate, job));
  breakdown.push(matchSkills(candidate, job));

  // Only average criteria that have an actual requirement on the job.
  // If a job specifies nothing, we fall back to averaging all criteria to
  // avoid divide-by-zero (this yields the old neutral-100 behavior only for
  // truly unscored jobs).
  const applicable = breakdown.filter((b) => b.applicable);
  const pool = applicable.length > 0 ? applicable : breakdown;
  const overallScore = Math.round(
    pool.reduce((sum, b) => sum + b.score, 0) / pool.length
  );

  // Eligibility only considers applicable criteria — a job with no
  // requirements is trivially "eligible".
  const isEligible = applicable.every((b) => b.met);

  return { overallScore, breakdown, isEligible };
}

// ============================================
// INTERNAL MATCHING FUNCTIONS
// ============================================

/**
 * Normalize country strings so "DE", "de", " Germany " and "germany" all
 * compare equal. Uses a small ISO-alpha-2 ↔ common-name map for the countries
 * where adidas recruits; anything not in the map falls back to a trimmed
 * lowercase compare.
 */
const COUNTRY_ALIASES: Record<string, string> = {
  de: "de", germany: "de", deutschland: "de",
  us: "us", usa: "us", "united states": "us", "united states of america": "us", america: "us",
  gb: "gb", uk: "gb", "united kingdom": "gb", england: "gb", britain: "gb", "great britain": "gb",
  nl: "nl", netherlands: "nl", holland: "nl",
  fr: "fr", france: "fr",
  es: "es", spain: "es", españa: "es",
  it: "it", italy: "it", italia: "it",
  pt: "pt", portugal: "pt",
  be: "be", belgium: "be",
  ch: "ch", switzerland: "ch",
  at: "at", austria: "at",
  se: "se", sweden: "se",
  no: "no", norway: "no",
  dk: "dk", denmark: "dk",
  fi: "fi", finland: "fi",
  ie: "ie", ireland: "ie",
  pl: "pl", poland: "pl",
  cz: "cz", "czech republic": "cz", czechia: "cz",
  tr: "tr", turkey: "tr", türkiye: "tr", turkiye: "tr",
  gr: "gr", greece: "gr",
  ru: "ru", russia: "ru",
  ua: "ua", ukraine: "ua",
  jp: "jp", japan: "jp",
  cn: "cn", china: "cn",
  hk: "hk", "hong kong": "hk",
  tw: "tw", taiwan: "tw",
  kr: "kr", "south korea": "kr", korea: "kr",
  sg: "sg", singapore: "sg",
  th: "th", thailand: "th",
  vn: "vn", vietnam: "vn",
  id: "id", indonesia: "id",
  my: "my", malaysia: "my",
  ph: "ph", philippines: "ph",
  in: "in", india: "in",
  au: "au", australia: "au",
  nz: "nz", "new zealand": "nz",
  br: "br", brazil: "br", brasil: "br",
  mx: "mx", mexico: "mx", méxico: "mx",
  ar: "ar", argentina: "ar",
  cl: "cl", chile: "cl",
  co: "co", colombia: "co",
  pe: "pe", peru: "pe", perú: "pe",
  ca: "ca", canada: "ca",
  za: "za", "south africa": "za",
  ae: "ae", "united arab emirates": "ae", uae: "ae",
};

export function normalizeCountry(raw?: string | null): string | null {
  if (!raw) return null;
  // Candidate locations may arrive as "Lisbon, Portugal" or "Berlin, DE" —
  // take the trailing token as the country hint, then fall through to
  // the full string if that fails.
  const trimmed = raw.trim();
  if (!trimmed) return null;
  const parts = trimmed.split(",").map((s) => s.trim()).filter(Boolean);
  const candidates = [trimmed, parts[parts.length - 1] ?? ""];
  for (const c of candidates) {
    const key = c.toLowerCase();
    if (COUNTRY_ALIASES[key]) return COUNTRY_ALIASES[key];
  }
  // Fallback — return the lowercased last token so we at least compare
  // consistently across both sides.
  return (parts[parts.length - 1] ?? trimmed).toLowerCase();
}

/**
 * Work Field match — uses adidas' 16 Fields of Work as the shared taxonomy.
 * job.department carries the field name on the job side; candidate carries
 * primaryBusinessArea (strongest signal), secondaryBusinessAreas, and
 * candidateCustomArea (free-text, treated as neutral per product decision).
 */
function matchField(
  candidate: MatchInput["candidate"],
  job: MatchInput["job"]
) {
  if (!job.department || !job.department.trim()) {
    return {
      criterion: "Work Field",
      met: true,
      score: 100,
      details: "No work field specified on job",
      applicable: false,
    };
  }

  const norm = (s: string) => s.toLowerCase().trim();
  const target = norm(job.department);
  const primary = candidate.primaryBusinessArea
    ? norm(candidate.primaryBusinessArea)
    : null;
  const secondaries = (candidate.secondaryBusinessAreas ?? [])
    .filter((s) => !!s)
    .map(norm);
  const custom = candidate.candidateCustomArea
    ? norm(candidate.candidateCustomArea)
    : null;

  if (primary && primary === target) {
    return {
      criterion: "Work Field",
      met: true,
      score: 100,
      details: `Primary field match: ${candidate.primaryBusinessArea}`,
      applicable: true,
    };
  }

  if (secondaries.includes(target)) {
    return {
      criterion: "Work Field",
      met: true,
      score: 75,
      details: `Secondary field match: ${job.department}`,
      applicable: true,
    };
  }

  // Candidate declared a custom free-text field outside the 16-field taxonomy
  // — we can't tell either way, so treat as neutral (not applicable).
  if (custom && !primary && secondaries.length === 0) {
    return {
      criterion: "Work Field",
      met: true,
      score: 100,
      details: `Candidate field is custom (${candidate.candidateCustomArea}) — treated as neutral`,
      applicable: false,
    };
  }

  return {
    criterion: "Work Field",
    met: false,
    score: 0,
    details: `Candidate field (${candidate.primaryBusinessArea ?? "unspecified"}) does not match job field (${job.department})`,
    applicable: true,
  };
}

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
      applicable: false,
    };
  }

  const candidateCountry = normalizeCountry(
    candidate.country || candidate.location
  );
  const jobCountry = normalizeCountry(job.country || job.location);

  // Country-level match is the dominant signal — country hard-filter is
  // applied upstream in the use case, so by the time we get here we expect
  // either a country match OR a willing-to-relocate candidate.
  if (candidateCountry && jobCountry && candidateCountry === jobCountry) {
    const candidateCity = (candidate.location || "").toLowerCase().trim();
    const jobCity = (job.location || "").toLowerCase().trim();
    if (
      candidateCity &&
      jobCity &&
      (candidateCity.includes(jobCity) || jobCity.includes(candidateCity))
    ) {
      return {
        criterion: "Location",
        met: true,
        score: 100,
        details: `Same city & country: ${candidate.location}`,
        applicable: true,
      };
    }
    return {
      criterion: "Location",
      met: true,
      score: 100,
      details: `Same country: ${candidate.country ?? candidate.location}`,
      applicable: true,
    };
  }

  // Different country but candidate is willing to relocate → 90.
  if (candidate.willingToRelocate) {
    return {
      criterion: "Location",
      met: true,
      score: 90,
      details: `Different country (${candidate.country ?? "unknown"} → ${job.country ?? job.location}) — candidate is willing to relocate`,
      applicable: true,
    };
  }

  return {
    criterion: "Location",
    met: false,
    score: 0,
    details: `Country mismatch: ${candidate.country ?? candidate.location ?? "unknown"} vs ${job.country ?? job.location}`,
    applicable: true,
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
      applicable: false,
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
      applicable: true,
    };
  }

  if (!job.requiredLanguageLevel || !candidateLang.level) {
    return {
      criterion: "Language",
      met: true,
      score: 70,
      details: `Has ${job.requiredLanguage}, level unverified`,
      applicable: true,
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
      applicable: true,
    };
  }

  const diff = requiredIdx - candidateIdx;
  return {
    criterion: "Language",
    met: false,
    score: Math.max(0, 100 - diff * 25),
    details: `${candidateLang.level} below ${job.requiredLanguageLevel} requirement`,
    applicable: true,
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
      applicable: false,
    };
  }

  const years = candidate.yearsOfExperience ?? 0;

  if (years >= job.minYearsExperience) {
    return {
      criterion: "Experience",
      met: true,
      score: 100,
      details: `${years} years meets ${job.minYearsExperience} year requirement`,
      applicable: true,
    };
  }

  const ratio = years / job.minYearsExperience;
  return {
    criterion: "Experience",
    met: false,
    score: Math.round(ratio * 100),
    details: `${years} years below ${job.minYearsExperience} year requirement`,
    applicable: true,
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
      applicable: false,
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
      applicable: true,
    };
  }

  return {
    criterion: "Education",
    met: false,
    score: Math.max(0, Math.round((candidateIdx / requiredIdx) * 100)),
    details: `${candidate.educationLevel || "Unknown"} below ${job.requiredEducationLevel} requirement`,
    applicable: true,
  };
}

function normalizeSkill(s: string): string {
  return s
    .toLowerCase()
    .trim()
    .replace(/\.js$/, "js")
    .replace(/[\s._-]+/g, "");
}

function matchSkills(
  candidate: MatchInput["candidate"],
  job: MatchInput["job"]
) {
  const required = (job.requiredSkills ?? []).filter(
    (s) => s && s.trim().length > 0
  );

  // No skill requirement → neutral pass
  if (required.length === 0) {
    return {
      criterion: "Skills",
      met: true,
      score: 100,
      details: "No skill requirement",
      applicable: false,
    };
  }

  const candidateSkills = (candidate.skills ?? [])
    .filter((s) => s && s.trim().length > 0)
    .map(normalizeSkill);

  if (candidateSkills.length === 0) {
    return {
      criterion: "Skills",
      met: false,
      score: 0,
      details: `Candidate has no declared skills (required: ${required.join(", ")})`,
      applicable: true,
    };
  }

  const candidateSet = new Set(candidateSkills);
  const matched: string[] = [];
  const missing: string[] = [];
  for (const r of required) {
    if (candidateSet.has(normalizeSkill(r))) matched.push(r);
    else missing.push(r);
  }

  const ratio = matched.length / required.length;
  const score = Math.round(ratio * 100);
  const met = ratio >= 0.5; // at least half of required skills present

  let details: string;
  if (matched.length === required.length) {
    details = `All required skills present (${matched.join(", ")})`;
  } else if (matched.length === 0) {
    details = `Missing: ${missing.join(", ")}`;
  } else {
    details = `${matched.length}/${required.length} skills matched — missing: ${missing.join(", ")}`;
  }

  return { criterion: "Skills", met, score, details, applicable: true };
}
