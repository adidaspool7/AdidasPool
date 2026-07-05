/**
 * Public Ambassador Application Submission
 *
 * POST /api/ambassador/apply/[programId]
 *
 * No authentication required — publicly accessible.
 * Accepts multipart/form-data with:
 *   - file (CV — PDF/DOCX/TXT, required)
 *   - firstName, lastName, email, phone, location (optional — LLM extracts from CV)
 *   - university, yearOfStudy, motivation, previousExperience
 *
 * Flow:
 *  1. Parse CV → create/update candidate record (sourceType = AMBASSADOR)
 *  2. Create ambassador_application record
 */

import { NextRequest, NextResponse } from "next/server";
import { uploadUseCases, ambassadorUseCases } from "@server/application";
import { createLogger } from "@server/infrastructure/logging/logger";

const log = createLogger("api/ambassador/apply");

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ programId: string }> }
) {
  const { programId } = await params;

  try {
    const formData = await request.formData();
    const file = formData.get("file") as File | null;
    const pitchVideoUrlRaw =
      (formData.get("pitchVideoUrl") as string | null) || null;
    const motivation = (formData.get("motivation") as string | null) || null;
    const university = (formData.get("university") as string | null) || null;
    const yearOfStudy = (formData.get("yearOfStudy") as string | null) || null;
    const previousExperience =
      (formData.get("previousExperience") as string | null) || null;

    if (!file) {
      return NextResponse.json(
        { error: "A CV file is required to apply" },
        { status: 400 }
      );
    }

    // Step 1: Upload + parse CV → creates/updates candidate
    const uploadResult = await uploadUseCases.uploadCandidateCv(file);

    // Step 2: Validate the optional pitch-video link
    let pitchVideoUrl: string | null = null;
    if (pitchVideoUrlRaw && pitchVideoUrlRaw.trim().length > 0) {
      let parsed: URL;
      try {
        parsed = new URL(pitchVideoUrlRaw.trim());
      } catch {
        return NextResponse.json(
          { error: "The pitch video link is not a valid URL." },
          { status: 400 }
        );
      }
      if (parsed.protocol !== "https:" && parsed.protocol !== "http:") {
        return NextResponse.json(
          { error: "The pitch video link must be an http(s) link." },
          { status: 400 }
        );
      }
      pitchVideoUrl = parsed.toString();
    }

    // Step 3: Submit the ambassador application (also marks sourceType = AMBASSADOR)
    const application = await ambassadorUseCases.submitApplication({
      programId,
      candidateId: uploadResult.candidateId,
      motivation,
      university,
      yearOfStudy,
      previousExperience,
      pitchVideoUrl,
    });

    return NextResponse.json(
      {
        applicationId: application.id,
        candidateId: uploadResult.candidateId,
        status: application.status,
      },
      { status: 201 }
    );
  } catch (error: unknown) {
    const message =
      error instanceof Error ? error.message : "Unknown error";
    const name = error instanceof Error ? error.name : "";

    if (name === "ValidationError") {
      return NextResponse.json({ error: message }, { status: 400 });
    }
    if (name === "NotFoundError") {
      return NextResponse.json({ error: message }, { status: 404 });
    }

    log.error(`[POST /api/ambassador/apply/${programId}]`, message);
    return NextResponse.json(
      { error: "Application submission failed. Please try again." },
      { status: 500 }
    );
  }
}
