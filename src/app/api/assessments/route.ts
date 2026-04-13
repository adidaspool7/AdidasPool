import { NextRequest, NextResponse } from "next/server";
import { assessmentUseCases } from "@server/application";
import { CreateAssessmentSchema } from "@server/application/dtos";

/**
 * GET /api/assessments
 *
 * ONION LAYER: Presentation (thin controller)
 * Delegates to: AssessmentUseCases.listAssessments
 */
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const status = searchParams.get("status") || undefined;
    const candidateId = searchParams.get("candidateId") || undefined;

    const assessments = await assessmentUseCases.listAssessments({
      status,
      candidateId,
    });
    return NextResponse.json(assessments);
  } catch (error) {
    console.error("Error fetching assessments:", error);
    return NextResponse.json(
      { error: "Failed to fetch assessments" },
      { status: 500 }
    );
  }
}

/**
 * POST /api/assessments
 *
 * ONION LAYER: Presentation (thin controller)
 * Delegates to: AssessmentUseCases.createAssessment
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const result = CreateAssessmentSchema.safeParse(body);
    if (!result.success) {
      return NextResponse.json(
        { error: "Validation failed", details: result.error.flatten() },
        { status: 400 }
      );
    }
    const assessment = await assessmentUseCases.createAssessment(result.data);
    return NextResponse.json(assessment, { status: 201 });
  } catch (error) {
    console.error("Error creating assessment:", error);
    return NextResponse.json(
      { error: "Failed to create assessment" },
      { status: 500 }
    );
  }
}
