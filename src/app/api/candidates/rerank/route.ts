import { NextRequest, NextResponse } from "next/server";
import { candidateUseCases, scoringWeightsRepository } from "@server/application";
import { recomputeOverallScore } from "@server/domain/services/scoring.service";
import { CandidateFilterSchema } from "@server/application/dtos";
import { z } from "zod";

const RerankSchema = z.object({
  weights: z.object({
    experience: z.number().min(0).max(1),
    yearsOfExperience: z.number().min(0).max(1),
    educationLevel: z.number().min(0).max(1),
    locationMatch: z.number().min(0).max(1),
    language: z.number().min(0).max(1),
  }).optional(),
  page: z.number().int().min(1).default(1),
  pageSize: z.number().int().min(1).max(100).default(20),
  search: z.string().optional(),
  status: CandidateFilterSchema.shape.status,
  businessArea: z.string().optional(),
});

/**
 * POST /api/candidates/rerank
 *
 * Re-ranks candidates using custom weights.
 * If weights are not provided, uses the saved weights from the DB.
 * Re-computes overallCvScore client-side from stored component scores.
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { weights: customWeights, page, pageSize, search, status, businessArea } = RerankSchema.parse(body);

    // Use provided weights or fetch saved config
    const weights = customWeights ?? await scoringWeightsRepository.get();

    // Fetch candidates with a large page to re-rank all matching
    const result = await candidateUseCases.listCandidates({
      page: 1,
      pageSize: 500, // Fetch enough for client-side re-ranking
      sortBy: "createdAt",
      sortOrder: "desc",
      search,
      status,
      businessArea,
    });

    // Re-compute scores with custom weights
    const reranked = result.data
      .map((c: any) => {
        const recomputedScore = (
          c.experienceScore != null &&
          c.educationScore != null &&
          c.locationScore != null &&
          c.languageScore != null
        )
          ? recomputeOverallScore(
              {
                experienceScore: c.experienceScore ?? 0,
                yearsScore: c.experienceScore ?? 0, // yearsScore = experienceScore in our scoring
                educationScore: c.educationScore ?? 0,
                locationScore: c.locationScore ?? 0,
                languageScore: c.languageScore ?? 0,
              },
              weights
            )
          : c.overallCvScore;

        return {
          ...c,
          rerankedScore: recomputedScore,
        };
      })
      .sort((a: any, b: any) => (b.rerankedScore ?? 0) - (a.rerankedScore ?? 0));

    // Paginate the re-ranked results
    const start = (page - 1) * pageSize;
    const paged = reranked.slice(start, start + pageSize);

    return NextResponse.json({
      candidates: paged,
      pagination: {
        page,
        pageSize,
        total: reranked.length,
        totalPages: Math.ceil(reranked.length / pageSize),
      },
      weights,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Validation failed", details: error.issues },
        { status: 400 }
      );
    }
    console.error("Error re-ranking candidates:", error);
    return NextResponse.json(
      { error: "Failed to re-rank candidates" },
      { status: 500 }
    );
  }
}
