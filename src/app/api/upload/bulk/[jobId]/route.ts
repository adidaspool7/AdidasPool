import { NextRequest, NextResponse } from "next/server";
import { uploadUseCases } from "@server/application";

/**
 * GET /api/upload/bulk/[jobId]
 *
 * Poll parsing job status — used by the HR upload page to track progress.
 */
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ jobId: string }> }
) {
  try {
    const { jobId } = await params;
    const job = await uploadUseCases.getParsingJob(jobId);

    return NextResponse.json({
      id: job.id,
      status: job.status,
      totalFiles: job.totalFiles,
      parsedFiles: job.parsedFiles,
      failedFiles: job.failedFiles,
      errorLog: job.errorLog ?? [],
      fileName: job.fileName,
      createdAt: job.createdAt,
      updatedAt: job.updatedAt,
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to fetch job status";
    return NextResponse.json({ error: message }, { status: 404 });
  }
}
