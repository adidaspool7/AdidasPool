import { NextRequest, NextResponse } from "next/server";
import { storageService } from "@server/container";

const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/gif", "image/webp", "image/svg+xml"];
const MAX_SIZE = 5 * 1024 * 1024; // 5 MB

/**
 * POST /api/upload/image
 *
 * Accepts a single image file and stores it via IStorageService.
 * Returns { url } for embedding in rich text content.
 */
export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get("file") as File | null;

    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }

    if (!ALLOWED_TYPES.includes(file.type)) {
      return NextResponse.json(
        { error: "Invalid file type. Allowed: JPEG, PNG, GIF, WebP, SVG" },
        { status: 400 }
      );
    }

    if (file.size > MAX_SIZE) {
      return NextResponse.json(
        { error: "File too large. Maximum size is 5 MB" },
        { status: 400 }
      );
    }

    const result = await storageService.uploadFile(
      file,
      `campaign-images/${file.name}`
    );

    // Return a proxy URL so private blob images are accessible in <img> tags
    const proxyUrl = `/api/upload/download?url=${encodeURIComponent(result.url)}`;

    return NextResponse.json({ url: proxyUrl });
  } catch (error) {
    console.error("Error uploading image:", error);
    return NextResponse.json(
      { error: "Failed to upload image" },
      { status: 500 }
    );
  }
}
