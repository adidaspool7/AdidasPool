import { NextRequest, NextResponse } from "next/server";
import { jobUseCases } from "@server/application";
import { CreateJobSchema } from "@server/application/dtos";

/**
 * GET /api/jobs
 *
 * ONION LAYER: Presentation (thin controller)
 * Delegates to: JobUseCases.listJobs
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const rawPage = parseInt(searchParams.get("page") || "1", 10);
    const rawPageSize = parseInt(searchParams.get("pageSize") || "100", 10);
    const page = Math.max(1, Number.isNaN(rawPage) ? 1 : rawPage);
    const pageSize = Math.min(200, Math.max(1, Number.isNaN(rawPageSize) ? 100 : rawPageSize));
    const search = searchParams.get("search") || undefined;
    const type = searchParams.get("type") || undefined;
    const excludeType = searchParams.get("excludeType") || undefined;
    const internshipStatus = searchParams.get("internshipStatus") || undefined;
    const department = searchParams.get("department") || undefined;
    const country = searchParams.get("country") || undefined;

    const result = await jobUseCases.listJobs({ page, pageSize, search, type, excludeType, internshipStatus, department, country });
    return NextResponse.json(result);
  } catch (error) {
    console.error("Error fetching jobs:", error);
    return NextResponse.json(
      { error: "Failed to fetch jobs" },
      { status: 500 }
    );
  }
}

/**
 * POST /api/jobs
 *
 * ONION LAYER: Presentation (thin controller)
 * Delegates to: JobUseCases.createJob
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const result = CreateJobSchema.safeParse(body);
    if (!result.success) {
      return NextResponse.json(
        { error: "Validation failed", details: result.error.flatten() },
        { status: 400 }
      );
    }
    const job = await jobUseCases.createJob(result.data);
    return NextResponse.json(job, { status: 201 });
  } catch (error) {
    console.error("Error creating job:", error);
    return NextResponse.json(
      { error: "Failed to create job" },
      { status: 500 }
    );
  }
}
