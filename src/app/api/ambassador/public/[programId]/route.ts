/**
 * Public program info — used by the public /ambassador/[programId] landing page.
 *
 * GET /api/ambassador/public/[programId]
 *
 * No authentication required (not under /api/ambassador/programs/ prefix).
 * Returns safe program fields only — does NOT expose applicant list or HR notes.
 */

import { NextRequest, NextResponse } from "next/server";
import { ambassadorUseCases } from "@server/application";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ programId: string }> }
) {
  const { programId } = await params;

  try {
    const program = await ambassadorUseCases.getProgramById(programId);

    // Expose only fields needed for the public landing page
    return NextResponse.json({
      id: program.id,
      title: program.title,
      description: program.description,
      cohort: program.cohort,
      applicationDeadline: program.applicationDeadline,
      location: program.location,
      country: program.country,
      requirements: program.requirements,
      perks: program.perks,
      status: program.status,
      maxApplicants: program.maxApplicants,
    });
  } catch (error: unknown) {
    if (error instanceof Error && error.name === "NotFoundError") {
      return NextResponse.json({ error: "Program not found" }, { status: 404 });
    }
    return NextResponse.json(
      { error: "Failed to load program" },
      { status: 500 }
    );
  }
}
