/**
 * POST /api/applications
 *
 * ONION LAYER: Presentation (thin controller)
 * Delegates to: ApplicationUseCases.applyToJob
 *
 * Candidate applies to a job opening. Expects { jobId, candidateId }.
 */

import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { applicationUseCases } from "@server/application";

const ApplySchema = z.object({
  jobId: z.string().uuid(),
  candidateId: z.string().uuid(),
});

export async function POST(request: NextRequest) {
  try {
    const parsed = ApplySchema.safeParse(await request.json());
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validation failed", details: parsed.error.flatten() },
        { status: 400 }
      );
    }
    const { jobId, candidateId } = parsed.data;

    const result = await applicationUseCases.applyToJob(jobId, candidateId);

    return NextResponse.json(result, {
      status: result.alreadyApplied ? 200 : 201,
    });
  } catch (error) {
    console.error("Error creating application:", error);
    return NextResponse.json(
      { error: "Failed to create application" },
      { status: 500 }
    );
  }
}

/**
 * GET /api/applications?candidateId=xxx
 *
 * Lists all applications for a candidate.
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const candidateId = searchParams.get("candidateId");

    if (!candidateId) {
      return NextResponse.json(
        { error: "candidateId is required" },
        { status: 400 }
      );
    }

    const applications =
      await applicationUseCases.listByCandidateId(candidateId);
    return NextResponse.json(applications);
  } catch (error) {
    console.error("Error fetching applications:", error);
    return NextResponse.json(
      { error: "Failed to fetch applications" },
      { status: 500 }
    );
  }
}
