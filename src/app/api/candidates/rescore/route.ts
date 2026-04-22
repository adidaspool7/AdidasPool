import { NextResponse } from "next/server";
import { candidateRepository } from "@server/container";
import { calculateCvScore } from "@server/domain/services/scoring.service";
import db from "@server/infrastructure/database/supabase-client";

/**
 * POST /api/candidates/rescore
 *
 * Re-calculates scores for all candidates using the current scoring formula.
 * Used after updating scoring logic (e.g. distance-based location).
 *
 * Performance: a single upsert batches all score updates into one round-trip
 * (previously one UPDATE per candidate — see What-to-check-improve.md §3B).
 */
export async function POST() {
  try {
    const candidates = await candidateRepository.findForRescore();

    const rows = candidates.map((c: any) => {
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

      return {
        id: c.id,
        overall_cv_score: scoring.overallScore,
        experience_score: scoring.experienceScore,
        education_score: scoring.educationScore,
        location_score: scoring.locationScore,
        language_score: scoring.languageScore,
      };
    });

    if (rows.length > 0) {
      const { error } = await db
        .from("candidates")
        .upsert(rows, { onConflict: "id" });
      if (error) throw error;
    }

    return NextResponse.json({ updated: rows.length });
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
