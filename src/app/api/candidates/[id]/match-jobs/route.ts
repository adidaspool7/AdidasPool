import { NextRequest, NextResponse } from "next/server";
import { jobUseCases, NotFoundError } from "@server/application";

/**
 * GET /api/candidates/[id]/match-jobs
 *
 * ONION LAYER: Presentation (thin controller)
 * Delegates to: JobUseCases.matchJobsForCandidate
 *
 * Returns all eligible (OPEN / ACTIVE) jobs ranked by how well they match
 * the given candidate. Used by:
 *   - HR on the candidate detail page ("Match Jobs to this Candidate")
 *   - Candidates on their dashboard ("Find my best matches")
 */
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const result = await jobUseCases.matchJobsForCandidate(id);
    return NextResponse.json(result);
  } catch (error) {
    if (error instanceof NotFoundError) {
      return NextResponse.json({ error: error.message }, { status: 404 });
    }
    console.error("Error running candidate-to-jobs matching:", error);
    return NextResponse.json(
      { error: "Failed to run matching" },
      { status: 500 }
    );
  }
}
