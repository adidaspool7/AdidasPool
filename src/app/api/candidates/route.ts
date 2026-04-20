import { NextRequest, NextResponse } from "next/server";
import { candidateUseCases } from "@server/application";
import { CandidateFilterSchema } from "@server/application/dtos";

/**
 * GET /api/candidates
 *
 * ONION LAYER: Presentation (thin controller)
 * Delegates to: CandidateUseCases.listCandidates
 */
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const filters = CandidateFilterSchema.parse({
      search: searchParams.get("search") || undefined,
      status: searchParams.get("status") || undefined,
      country: searchParams.get("country") || undefined,
      locationSearch: searchParams.get("locationSearch") || undefined,
      minScore: searchParams.get("minScore")
        ? Number(searchParams.get("minScore"))
        : undefined,
      maxScore: searchParams.get("maxScore")
        ? Number(searchParams.get("maxScore"))
        : undefined,
      language: searchParams.get("language") || undefined,
      languageLevel: searchParams.get("languageLevel") || undefined,
      sourceType: searchParams.get("sourceType") || undefined,
      businessArea: searchParams.get("businessArea") || undefined,
      shortlisted: searchParams.get("shortlisted") === "true"
        ? true
        : undefined,
      needsReview: searchParams.get("needsReview") === "true"
        ? true
        : searchParams.get("needsReview") === "false"
          ? false
          : undefined,
      page: searchParams.get("page")
        ? Number(searchParams.get("page"))
        : 1,
      pageSize: searchParams.get("pageSize")
        ? Number(searchParams.get("pageSize"))
        : 20,
      sortBy: searchParams.get("sortBy") || "createdAt",
      sortOrder: (searchParams.get("sortOrder") as "asc" | "desc") || "desc",
    });

    const result = await candidateUseCases.listCandidates(filters);

    return NextResponse.json({
      candidates: result.data,
      pagination: result.pagination,
    });
  } catch (error) {
    console.error("Error fetching candidates:", error);
    return NextResponse.json(
      { error: "Failed to fetch candidates" },
      { status: 500 }
    );
  }
}
