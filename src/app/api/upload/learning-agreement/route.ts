import { NextRequest, NextResponse } from "next/server";
import { uploadUseCases, applicationUseCases } from "@server/application";

/**
 * POST /api/upload/learning-agreement
 *
 * Upload a learning agreement (Erasmus internship).
 * Accepts: multipart form with "file" + either "applicationId" or "candidateId".
 *  - With applicationId: updates the application record (backward-compatible).
 *  - With candidateId: updates the candidate record (standalone upload).
 */
export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get("file") as File | null;
    const applicationId = formData.get("applicationId") as string | null;
    const candidateId = formData.get("candidateId") as string | null;

    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }

    const result = await uploadUseCases.uploadLearningAgreement(
      file,
      { applicationId, candidateId },
      (id, data) => applicationUseCases.updateApplication(id, data)
    );

    return NextResponse.json({
      url: result.url,
      fileName: result.fileName,
      ...(result.targetType === "application"
        ? { applicationId: result.targetId }
        : { candidateId: result.targetId }),
    });
  } catch (error) {
    if (error instanceof Error && error.name === "ValidationError") {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    console.error("Learning agreement upload error:", error);
    return NextResponse.json(
      { error: "Failed to upload learning agreement" },
      { status: 500 }
    );
  }
}
