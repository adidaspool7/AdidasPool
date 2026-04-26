import { NextRequest, NextResponse } from "next/server";
import { jobUseCases } from "@server/application";

/**
 * GET /api/jobs/countries
 *
 * Distinct list of country codes (2-letter where available) for the
 * country dropdown filter on Job Openings / Internships pages. Honors
 * the same `type` / `excludeType` / `internshipStatus` scoping as the
 * main listing so the dropdown only shows countries that actually have
 * jobs in the current view.
 *
 * ONION LAYER: Presentation (thin controller).
 * Delegates to: JobUseCases.listDistinctCountries.
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const type = searchParams.get("type") || undefined;
    const excludeType = searchParams.get("excludeType") || undefined;
    const internshipStatus = searchParams.get("internshipStatus") || undefined;

    const countries = await jobUseCases.listDistinctCountries({
      type,
      excludeType,
      internshipStatus,
    });
    return NextResponse.json({ countries });
  } catch (error) {
    console.error("Error fetching job countries:", error);
    return NextResponse.json(
      { error: "Failed to fetch countries" },
      { status: 500 }
    );
  }
}
