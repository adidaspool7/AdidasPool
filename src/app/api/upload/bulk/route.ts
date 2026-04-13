import { NextRequest, NextResponse } from "next/server";
import { after } from "next/server";
import { uploadUseCases } from "@server/application";

/**
 * POST /api/upload/bulk
 *
 * HR Bulk CV Upload — accepts multiple files or a ZIP archive.
 * Creates a ParsingJob, returns immediately with the job ID,
 * then processes files in the background via Next.js after().
 *
 * GET /api/upload/bulk
 *
 * Returns recent parsing jobs for the job history table.
 */
export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const files = formData.getAll("files") as File[];

    if (!files.length) {
      return NextResponse.json(
        { error: "No files provided" },
        { status: 400 }
      );
    }

    // Phase 1: Validate, extract ZIP, create ParsingJob
    const { jobId, fileEntries, totalFiles } =
      await uploadUseCases.prepareBulkUpload(files);

    // Phase 2: Process files in background after response is sent
    after(async () => {
      try {
        await uploadUseCases.processBulkUpload(jobId, fileEntries);
      } catch (error) {
        console.error("[BulkUpload] Background processing error:", error);
      }
    });

    return NextResponse.json(
      { jobId, totalFiles, status: "PROCESSING" },
      { status: 202 }
    );
  } catch (error) {
    console.error("[BulkUpload] Error:", error);
    const message =
      error instanceof Error ? error.message : "Failed to process bulk upload";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}

export async function GET() {
  try {
    // Auto-recover stale PROCESSING jobs (e.g., server crashed mid-upload)
    await uploadUseCases.recoverStaleJobs(10);

    const jobs = await uploadUseCases.getRecentParsingJobs(50);
    return NextResponse.json({ jobs });
  } catch (error) {
    console.error("[BulkUpload] Error fetching jobs:", error);
    return NextResponse.json(
      { error: "Failed to fetch parsing jobs" },
      { status: 500 }
    );
  }
}

/**
 * PATCH /api/upload/bulk
 *
 * Cancel a running or queued parsing job.
 * Body: { jobId: string }
 */
export async function PATCH(request: NextRequest) {
  try {
    const { jobId } = await request.json();
    if (!jobId || typeof jobId !== "string") {
      return NextResponse.json(
        { error: "Missing jobId in request body" },
        { status: 400 }
      );
    }

    const result = await uploadUseCases.cancelJob(jobId);
    return NextResponse.json(result);
  } catch (error) {
    console.error("[BulkUpload] Cancel error:", error);
    const message =
      error instanceof Error ? error.message : "Failed to cancel job";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
