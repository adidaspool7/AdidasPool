/**
 * CV Scoring Domain Service
 *
 * ONION LAYER: Domain (innermost)
 * DEPENDENCIES: Only domain value objects — no infrastructure.
 *
 * Deterministic scoring formula — no black-box AI decisions.
 * All weights and calculations are transparent and configurable.
 *
 * Component scores (0-100) are stored individually per candidate.
 * The overall score is a weighted sum — HR can adjust weights via the UI
 * for instant re-ranking without any API calls or DB queries.
 */

import {
  CV_SCORING_WEIGHTS,
  EDUCATION_LEVEL_SCORES,
  ENGLISH_SCORE_MAP,
  PORTUGUESE_SCORE_MAP,
  ADDITIONAL_LANGUAGE_BONUS,
  MAX_ADDITIONAL_LANGUAGE_BONUS,
  FOREIGN_NO_ENGLISH_PENALTY,
  CEFR_LEVELS,
} from "@server/domain/value-objects";

// ============================================
// INTERFACES (Domain Types)
// ============================================

export interface CvScoringInput {
  yearsOfExperience: number;
  educationLevel: string | null;
  candidateLocation: string | null;
  candidateCountry: string | null;
  languages: { language: string; level: string | null }[];
}

export interface CvScoringResult {
  overallScore: number;
  experienceScore: number;
  educationScore: number;
  locationScore: number;
  languageScore: number;
  yearsScore: number;
  breakdown: {
    component: string;
    score: number;
    weight: number;
    weighted: number;
  }[];
  languageFlags: string[];
}

// ============================================
// CV SCORING
// ============================================

/**
 * Calculate a deterministic CV score.
 * Formula is fully transparent: weighted sum of 5 components.
 * Individual component scores are returned for HR to re-weight client-side.
 */
export function calculateCvScore(input: CvScoringInput): CvScoringResult {
  const yearsScore = Math.min(100, (input.yearsOfExperience / 10) * 100);
  const experienceScore = yearsScore; // For generic CV score, experience = years proxy
  const educationScore = input.educationLevel
    ? EDUCATION_LEVEL_SCORES[input.educationLevel] ?? 30
    : 30;
  const locationScore = calculateLocationScore(
    input.candidateLocation,
    input.candidateCountry
  );
  const { score: languageScore, flags: languageFlags } = calculateLanguageScore(
    input.languages,
    input.candidateCountry
  );

  const breakdown = [
    {
      component: "Experience",
      score: experienceScore,
      weight: CV_SCORING_WEIGHTS.experience,
      weighted: experienceScore * CV_SCORING_WEIGHTS.experience,
    },
    {
      component: "Years of Experience",
      score: yearsScore,
      weight: CV_SCORING_WEIGHTS.yearsOfExperience,
      weighted: yearsScore * CV_SCORING_WEIGHTS.yearsOfExperience,
    },
    {
      component: "Education Level",
      score: educationScore,
      weight: CV_SCORING_WEIGHTS.educationLevel,
      weighted: educationScore * CV_SCORING_WEIGHTS.educationLevel,
    },
    {
      component: "Location",
      score: locationScore,
      weight: CV_SCORING_WEIGHTS.locationMatch,
      weighted: locationScore * CV_SCORING_WEIGHTS.locationMatch,
    },
    {
      component: "Languages",
      score: languageScore,
      weight: CV_SCORING_WEIGHTS.language,
      weighted: languageScore * CV_SCORING_WEIGHTS.language,
    },
  ];

  const overallScore = Math.round(
    breakdown.reduce((sum, b) => sum + b.weighted, 0)
  );

  return {
    overallScore,
    experienceScore,
    educationScore,
    locationScore,
    languageScore,
    yearsScore,
    breakdown,
    languageFlags,
  };
}

/**
 * Re-compute overall score with custom weights (client-side helper).
 * Weights should sum to 1.0.
 */
export function recomputeOverallScore(
  componentScores: {
    experienceScore: number;
    yearsScore: number;
    educationScore: number;
    locationScore: number;
    languageScore: number;
  },
  weights: {
    experience: number;
    yearsOfExperience: number;
    educationLevel: number;
    locationMatch: number;
    language: number;
  }
): number {
  return Math.round(
    componentScores.experienceScore * weights.experience +
    componentScores.yearsScore * weights.yearsOfExperience +
    componentScores.educationScore * weights.educationLevel +
    componentScores.locationScore * weights.locationMatch +
    componentScores.languageScore * weights.language
  );
}

// ============================================
// ASSESSMENT SCORING
// ============================================

/**
 * Calculate weighted assessment score from sub-scores.
 */
export function calculateAssessmentScore(
  scores: {
    grammar: number;
    vocabulary: number;
    clarity: number;
    fluency: number;
    customerHandling: number;
  },
  weights: {
    grammar: number;
    vocabulary: number;
    clarity: number;
    fluency: number;
    customerHandling: number;
  } = {
    grammar: 20,
    vocabulary: 20,
    clarity: 20,
    fluency: 20,
    customerHandling: 20,
  }
): number {
  const totalWeight =
    weights.grammar +
    weights.vocabulary +
    weights.clarity +
    weights.fluency +
    weights.customerHandling;

  const weightedSum =
    scores.grammar * weights.grammar +
    scores.vocabulary * weights.vocabulary +
    scores.clarity * weights.clarity +
    scores.fluency * weights.fluency +
    scores.customerHandling * weights.customerHandling;

  return Math.round(weightedSum / totalWeight);
}

// ============================================
// CEFR ESTIMATION
// ============================================

/**
 * Estimate CEFR level from an overall assessment score (0-100).
 */
export function estimateCefrLevel(
  overallScore: number
): "A1" | "A2" | "B1" | "B2" | "C1" | "C2" {
  if (overallScore >= 90) return "C2";
  if (overallScore >= 78) return "C1";
  if (overallScore >= 65) return "B2";
  if (overallScore >= 50) return "B1";
  if (overallScore >= 35) return "A2";
  return "A1";
}

// ============================================
// BORDERLINE DETECTION
// ============================================

/**
 * Determine if a candidate is borderline based on their score.
 */
export function isBorderline(
  score: number,
  threshold = { min: 45, max: 60 }
): boolean {
  return score >= threshold.min && score <= threshold.max;
}

// ============================================
// INTERNAL HELPERS
// ============================================

// ============================================
// LOCATION SCORING — Distance-based from Maia, Porto
// ============================================

/** adidas office reference point: Maia, Porto, Portugal */
const MAIA_LAT = 41.2358;
const MAIA_LON = -8.6197;

/** Haversine distance in km between two lat/lon points */
function haversineKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

/** Coordinates for major cities in Portugal and Spain */
const CITY_COORDS: Record<string, [number, number]> = {
  // Portugal
  "maia": [41.2358, -8.6197],
  "porto": [41.1579, -8.6291],
  "matosinhos": [41.1844, -8.6950],
  "gondomar": [41.1505, -8.5321],
  "vila nova de gaia": [41.1239, -8.6118],
  "gaia": [41.1239, -8.6118],
  "braga": [41.5518, -8.4229],
  "guimarães": [41.4425, -8.2918],
  "guimaraes": [41.4425, -8.2918],
  "viana do castelo": [41.6934, -8.8328],
  "vila real": [41.3009, -7.7389],
  "bragança": [41.8063, -6.7570],
  "braganca": [41.8063, -6.7570],
  "aveiro": [40.6405, -8.6538],
  "coimbra": [40.2033, -8.4103],
  "viseu": [40.6610, -7.9097],
  "leiria": [39.7437, -8.8071],
  "santarém": [39.2336, -8.6847],
  "santarem": [39.2336, -8.6847],
  "castelo branco": [39.8210, -7.4916],
  "guarda": [40.5373, -7.2676],
  "lisboa": [38.7223, -9.1393],
  "lisbon": [38.7223, -9.1393],
  "setúbal": [38.5244, -8.8882],
  "setubal": [38.5244, -8.8882],
  "évora": [38.5710, -7.9093],
  "evora": [38.5710, -7.9093],
  "beja": [38.0155, -7.8633],
  "faro": [37.0194, -7.9322],
  "portimão": [37.1386, -8.5384],
  "portimao": [37.1386, -8.5384],
  "funchal": [32.6669, -16.9241],
  "ponta delgada": [37.7483, -25.6666],
  // Spain
  "vigo": [42.2406, -8.7207],
  "pontevedra": [42.4339, -8.6445],
  "ourense": [42.3358, -7.8639],
  "orense": [42.3358, -7.8639],
  "lugo": [43.0097, -7.5568],
  "a coruña": [43.3623, -8.4115],
  "la coruña": [43.3623, -8.4115],
  "santiago de compostela": [42.8782, -8.5448],
  "santiago": [42.8782, -8.5448],
  "león": [42.5987, -5.5671],
  "leon": [42.5987, -5.5671],
  "oviedo": [43.3614, -5.8493],
  "gijón": [43.5453, -5.6635],
  "gijon": [43.5453, -5.6635],
  "santander": [43.4623, -3.8100],
  "bilbao": [43.2631, -2.9350],
  "san sebastián": [43.3183, -1.9812],
  "san sebastian": [43.3183, -1.9812],
  "pamplona": [42.8125, -1.6458],
  "valladolid": [41.6523, -4.7245],
  "salamanca": [40.9688, -5.6631],
  "zamora": [41.5034, -5.7448],
  "badajoz": [38.8794, -6.9707],
  "cáceres": [39.4752, -6.3722],
  "caceres": [39.4752, -6.3722],
  "madrid": [40.4168, -3.7038],
  "toledo": [39.8628, -4.0273],
  "zaragoza": [41.6488, -0.8891],
  "barcelona": [41.3874, 2.1686],
  "valencia": [39.4699, -0.3763],
  "alicante": [38.3452, -0.4810],
  "murcia": [37.9922, -1.1307],
  "sevilla": [37.3886, -5.9823],
  "seville": [37.3886, -5.9823],
  "córdoba": [37.8882, -4.7794],
  "cordoba": [37.8882, -4.7794],
  "granada": [37.1773, -3.5986],
  "málaga": [36.7213, -4.4214],
  "malaga": [36.7213, -4.4214],
  "cádiz": [36.5271, -6.2886],
  "cadiz": [36.5271, -6.2886],
  "almería": [36.8340, -2.4637],
  "almeria": [36.8340, -2.4637],
  "palma de mallorca": [39.5696, 2.6502],
  "palma": [39.5696, 2.6502],
  "las palmas": [28.1248, -15.4300],
  "santa cruz de tenerife": [28.4636, -16.2518],
  "tenerife": [28.4636, -16.2518],
};

/** Country keywords to detect Portugal or Spain */
const PT_KEYWORDS = ["portugal", "portuguese"];
const ES_KEYWORDS = ["spain", "españa", "espanha", "spanish"];

/**
 * Score location based on distance from Maia, Porto.
 * Portugal & Spain: score decreases with distance.
 * All other countries: 0.
 */
function calculateLocationScore(
  candidateLocation: string | null,
  candidateCountry: string | null
): number {
  if (!candidateLocation && !candidateCountry) return 0;

  const loc = (candidateLocation || "").toLowerCase().trim();
  const country = (candidateCountry || "").toLowerCase().trim();
  const combined = `${loc} ${country}`;

  // Check if Portugal or Spain
  const isPortugal = PT_KEYWORDS.some((k) => combined.includes(k));
  const isSpain = ES_KEYWORDS.some((k) => combined.includes(k));

  if (!isPortugal && !isSpain) {
    // Check if city itself is in lookup (handles "Porto" without country)
    const cityMatch = findCityCoords(loc);
    if (!cityMatch) return 0;
  }

  // Try to find city coordinates from location
  const coords = findCityCoords(loc) ?? findCityCoords(country);

  if (coords) {
    const distance = haversineKm(MAIA_LAT, MAIA_LON, coords[0], coords[1]);
    // Linear: 0km=100, ~1125km+=10 (min score for PT/ES)
    return Math.max(10, Math.round(100 - distance * 0.08));
  }

  // Known PT/ES but unrecognized city → reasonable defaults
  if (isPortugal) return 70; // mid-range for Portugal
  return 40; // mid-range for Spain
}

/** Find coordinates for a city name in the lookup */
function findCityCoords(text: string): [number, number] | null {
  if (!text) return null;
  const normalized = text.toLowerCase().trim();

  // Direct match
  if (CITY_COORDS[normalized]) return CITY_COORDS[normalized];

  // Check if any city name appears in the text
  for (const [city, coords] of Object.entries(CITY_COORDS)) {
    if (normalized.includes(city)) return coords;
  }

  return null;
}

/**
 * Calculate language proficiency score (0-100).
 *
 * English is always evaluated (company language).
 * Portuguese adds bonus points.
 * Additional languages at B2+ each add bonus points.
 * Foreign candidates without English get a penalty + flag.
 */
function calculateLanguageScore(
  languages: { language: string; level: string | null }[],
  candidateCountry: string | null
): { score: number; flags: string[] } {
  const flags: string[] = [];
  let total = 0;

  // Find English
  const english = languages.find(
    (l) => l.language.toLowerCase() === "english" || l.language.toLowerCase() === "inglês"
  );
  if (english && english.level) {
    total += ENGLISH_SCORE_MAP[english.level] ?? 0;
  } else if (english) {
    // English listed but no level → assume B1 (conservative)
    total += ENGLISH_SCORE_MAP["B1"] ?? 0;
    flags.push("english_level_unknown");
  } else {
    // No English at all
    flags.push("no_english");
    const country = (candidateCountry || "").toLowerCase();
    const isForeign = !country.includes("portugal") && country.length > 0;
    if (isForeign) {
      total = Math.max(0, total - FOREIGN_NO_ENGLISH_PENALTY);
      flags.push("foreign_no_english");
    }
  }

  // Find Portuguese
  const portuguese = languages.find(
    (l) =>
      l.language.toLowerCase() === "portuguese" ||
      l.language.toLowerCase() === "português"
  );
  if (portuguese && portuguese.level) {
    total += PORTUGUESE_SCORE_MAP[portuguese.level] ?? 0;
  } else if (portuguese) {
    total += PORTUGUESE_SCORE_MAP["B1"] ?? 0;
    flags.push("portuguese_level_unknown");
  }

  // Additional languages bonus (B2+)
  const cefrIndex = (level: string | null): number => {
    if (!level) return -1;
    return CEFR_LEVELS.indexOf(level as (typeof CEFR_LEVELS)[number]);
  };
  const b2Index = CEFR_LEVELS.indexOf("B2");

  let additionalBonus = 0;
  for (const lang of languages) {
    const name = lang.language.toLowerCase();
    if (
      name === "english" || name === "inglês" ||
      name === "portuguese" || name === "português"
    ) continue;

    if (cefrIndex(lang.level) >= b2Index) {
      additionalBonus += ADDITIONAL_LANGUAGE_BONUS;
    }
  }
  total += Math.min(additionalBonus, MAX_ADDITIONAL_LANGUAGE_BONUS);

  // Cap at 100
  const score = Math.min(100, Math.max(0, total));

  if (languages.length === 0) {
    flags.push("no_languages_listed");
  }

  return { score, flags };
}
