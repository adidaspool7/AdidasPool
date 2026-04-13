import { NextRequest, NextResponse } from "next/server";
import { uploadUseCases } from "@server/application";

/**
 * POST /api/upload
 *
 * ONION LAYER: Presentation (thin controller)
 * Delegates to: UploadUseCases.uploadCvFiles
 */
export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const files = formData.getAll("files") as File[];

    const result = await uploadUseCases.uploadCvFiles(files);
    return NextResponse.json(result, { status: 202 });
  } catch (error) {
    console.error("Error handling upload:", error);
    return NextResponse.json(
      { error: "Failed to process upload" },
      { status: 500 }
    );
  }
}
