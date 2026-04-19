import { NextResponse } from "next/server";
import { candidateRepository } from "@server/container";
import { calculateCvScore } from "@server/domain/services/scoring.service";

/**
 * POST /api/candidates/rescore
 *
 * Re-calculates scores for all candidates using the current scoring formula.
 * Used after updating scoring logic (e.g. distance-based location).
 */
export async function POST() {
  try {
    const candidates = await candidateRepository.findForRescore();
    let updated = 0;

    for (const c of candidates) {
      const highestEdu = getHighestEducationLevel(
        c.education.map((e: { level: string | null }) => e.level)
      );

      const scoring = calculateCvScore({
        yearsOfExperience: c.yearsOfExperience ?? 0,
        educationLevel: highestEdu,
        candidateLocation: c.location,
        candidateCountry: c.country,
        languages: c.languages.map((l: { language: string; selfDeclaredLevel: string | null }) => ({
          language: l.language,
          level: l.selfDeclaredLevel,
        })),
      });

      await candidateRepository.update(c.id, {
        overallCvScore: scoring.overallScore,
        experienceScore: scoring.experienceScore,
        educationScore: scoring.educationScore,
        locationScore: scoring.locationScore,
        languageScore: scoring.languageScore,
      });
      updated++;
    }

    return NextResponse.json({ updated });
  } catch (error) {
    console.error("[Rescore]", error);
    return NextResponse.json(
      { error: "Failed to rescore candidates" },
      { status: 500 }
    );
  }
}

const EDU_RANK: Record<string, number> = {
  HIGH_SCHOOL: 1,
  VOCATIONAL: 2,
  OTHER: 2,
  BACHELOR: 3,
  MASTER: 4,
  PHD: 5,
};

function getHighestEducationLevel(levels: (string | null)[]): string | null {
  let highest: string | null = null;
  let highestRank = 0;
  for (const lvl of levels) {
    if (!lvl) continue;
    const rank = EDU_RANK[lvl] ?? 0;
    if (rank > highestRank) {
      highestRank = rank;
      highest = lvl;
    }
  }
  return highest;
}
