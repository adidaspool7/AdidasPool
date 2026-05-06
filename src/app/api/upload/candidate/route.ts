/**
 * Candidate CV Upload API Route
 *
 * POST /api/upload/candidate
 * Accepts a single CV file (PDF, DOCX, TXT) via multipart form data.
 * Synchronously parses and stores the CV, returning the extracted data.
 */

import { NextRequest, NextResponse } from "next/server";
import { uploadUseCases, notificationUseCases } from "@server/application";
import { createLogger } from "@server/infrastructure/logging/logger";

const log = createLogger("api/upload/candidate");

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get("file") as File | null;
    const candidateId = formData.get("candidateId") as string | null;

    if (!file) {
      return NextResponse.json(
        { error: "No file provided. Send a 'file' field in multipart form data." },
        { status: 400 }
      );
    }

    const result = await uploadUseCases.uploadCandidateCv(
      file,
      candidateId ?? undefined
    );

    // Notify HR — candidate self-uploaded a CV. Distinguish first upload
    // ("created") vs re-upload ("updated") so the HR feed can show context.
    try {
      const isReupload = result.status === "updated";
      await notificationUseCases.create({
        type: "HR_CV_UPLOADED",
        message: isReupload
          ? "A candidate uploaded a new version of their CV."
          : "A new candidate CV was added to the talent pool.",
        targetRole: "HR",
        candidateId: result.candidateId,
        metadata: { isReupload, source: "candidate-self-upload" },
      });
    } catch (err) {
      log.error("Failed to create HR_CV_UPLOADED notification:", err);
    }

    return NextResponse.json(result, { status: 200 });
  } catch (error: unknown) {
    const message =
      error instanceof Error ? error.message : "Unknown upload error";
    const name = error instanceof Error ? error.name : "";

    // Validation errors → 400
    if (name === "ValidationError") {
      return NextResponse.json({ error: message }, { status: 400 });
    }

    log.error("[POST /api/upload/candidate] Error:", message);
    return NextResponse.json(
      { error: `Upload failed: ${message}` },
      { status: 500 }
    );
  }
}
