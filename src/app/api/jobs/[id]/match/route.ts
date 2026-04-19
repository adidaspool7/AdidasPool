import { NextRequest, NextResponse } from "next/server";
import { jobUseCases, NotFoundError } from "@server/application";

/**
 * POST /api/jobs/[id]/match
 *
 * ONION LAYER: Presentation (thin controller)
 * Delegates to: JobUseCases.matchCandidatesToJob
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const result = await jobUseCases.matchCandidatesToJob(id);
    return NextResponse.json(result);
  } catch (error) {
    if (error instanceof NotFoundError) {
      return NextResponse.json({ error: error.message }, { status: 404 });
    }
    console.error("Error running matching:", error);
    return NextResponse.json(
      { error: "Failed to run matching" },
      { status: 500 }
    );
  }
}
