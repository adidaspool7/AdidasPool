/**
 * Candidate CV Upload API Route
 *
 * POST /api/upload/candidate
 * Accepts a single CV file (PDF, DOCX, TXT) via multipart form data.
 * Synchronously parses and stores the CV, returning the extracted data.
 */

import { NextRequest, NextResponse } from "next/server";
import { uploadUseCases } from "@server/application";

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

    return NextResponse.json(result, { status: 200 });
  } catch (error: unknown) {
    const message =
      error instanceof Error ? error.message : "Unknown upload error";
    const name = error instanceof Error ? error.name : "";

    // Validation errors → 400
    if (name === "ValidationError") {
      return NextResponse.json({ error: message }, { status: 400 });
    }

    console.error("[POST /api/upload/candidate] Error:", message);
    return NextResponse.json(
      { error: `Upload failed: ${message}` },
      { status: 500 }
    );
  }
}
