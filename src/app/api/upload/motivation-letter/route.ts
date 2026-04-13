import { NextRequest, NextResponse } from "next/server";
import { uploadUseCases } from "@server/application";

/**
 * POST /api/upload/motivation-letter
 *
 * Uploads a motivation letter, extracts text, and optionally saves to candidate.
 * Accepts: file + optional candidateId in formData.
 * Returns: { url, fileName, extractedText }
 */
export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get("file") as File | null;
    const candidateId = formData.get("candidateId") as string | null;

    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }

    const result = await uploadUseCases.uploadMotivationLetter(file, candidateId);
    return NextResponse.json(result);
  } catch (error) {
    if (error instanceof Error && error.name === "ValidationError") {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    console.error("Motivation letter upload error:", error);
    return NextResponse.json(
      { error: "Failed to upload file" },
      { status: 500 }
    );
  }
}
