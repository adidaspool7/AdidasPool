import { NextResponse } from "next/server";
import { jobUseCases } from "@server/application";

/**
 * GET /api/jobs/picker
 *
 * ONION LAYER: Presentation (thin controller)
 * Lightweight endpoint that returns ALL jobs as { id, title, department }
 * for use in searchable dropdowns (Fit-for-job picker on candidates page).
 *
 * Bypasses the heavier /api/jobs (which joins matches/assessments and is
 * paginated at 200 rows).
 */
export async function GET() {
  try {
    const jobs = await jobUseCases.listJobsForPicker();
    return NextResponse.json({ jobs });
  } catch (error) {
    console.error("Error fetching jobs for picker:", error);
    return NextResponse.json(
      { error: "Failed to fetch jobs" },
      { status: 500 }
    );
  }
}
