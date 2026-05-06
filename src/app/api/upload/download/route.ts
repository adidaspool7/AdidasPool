import { NextRequest, NextResponse } from "next/server";
import { storageService } from "@server/container";
import { createLogger } from "@server/infrastructure/logging/logger";

const log = createLogger("api/upload/download");

/**
 * GET /api/upload/download?url=...
 *
 * Proxies private blob files by fetching content server-side with proper auth
 * and streaming it back with the correct Content-Type.
 * This allows private blobs to be used in <img> tags and other embeds.
 */
export async function GET(request: NextRequest) {
  const url = request.nextUrl.searchParams.get("url");

  if (!url) {
    return NextResponse.json({ error: "Missing url parameter" }, { status: 400 });
  }

  try {
    const content = await storageService.getFileContent(url);

    if (!content) {
      return NextResponse.json({ error: "File not found" }, { status: 404 });
    }

    return new NextResponse(content.stream, {
      headers: {
        "Content-Type": content.contentType,
        "Cache-Control": "public, max-age=31536000, immutable",
      },
    });
  } catch (error) {
    log.error("[Download] Error proxying file:", error);
    return NextResponse.json(
      { error: "Failed to fetch file" },
      { status: 500 }
    );
  }
}
