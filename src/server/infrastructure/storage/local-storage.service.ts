/**
 * Local Filesystem Storage Service
 *
 * ONION LAYER: Infrastructure
 * DEPENDENCIES: Node.js fs (built-in), domain ports (inward)
 *
 * Drop-in replacement for VercelBlobStorageService during local development.
 * Saves files to /public/uploads/ so they're served by Next.js dev server.
 * Automatically used when BLOB_READ_WRITE_TOKEN is not set.
 */

import fs from "fs/promises";
import path from "path";
import type { IStorageService } from "@server/domain/ports/services";

const UPLOADS_DIR = path.join(process.cwd(), "public", "uploads");

export class LocalStorageService implements IStorageService {
  async uploadFile(
    file: File,
    filePath: string,
    _options?: { access?: "public" | "private" }
  ): Promise<{ url: string; pathname: string }> {
    // Ensure uploads directory exists
    await fs.mkdir(UPLOADS_DIR, { recursive: true });

    // Add timestamp to avoid collisions (mirrors Vercel Blob's addRandomSuffix)
    const ext = path.extname(filePath);
    const base = path.basename(filePath, ext);
    const uniqueName = `${base}-${Date.now()}${ext}`;

    const destPath = path.join(UPLOADS_DIR, uniqueName);
    const buffer = Buffer.from(await file.arrayBuffer());
    await fs.writeFile(destPath, buffer);

    const url = `/uploads/${uniqueName}`;

    console.log(`[LocalStorage] Saved file: ${destPath}`);

    return {
      url,
      pathname: uniqueName,
    };
  }

  async deleteFile(url: string): Promise<void> {
    const filename = path.basename(url);
    const filePath = path.join(UPLOADS_DIR, filename);

    try {
      await fs.unlink(filePath);
      console.log(`[LocalStorage] Deleted file: ${filePath}`);
    } catch {
      // File may not exist — ignore
    }
  }

  async getSignedUrl(url: string): Promise<string> {
    // Local files are served directly by Next.js dev server
    return url;
  }

  async getFileContent(
    url: string
  ): Promise<{ stream: ReadableStream<Uint8Array>; contentType: string } | null> {
    const filename = path.basename(url);
    const filePath = path.join(UPLOADS_DIR, filename);
    try {
      const buffer = await fs.readFile(filePath);
      const ext = path.extname(filename).toLowerCase();
      const mimeTypes: Record<string, string> = {
        ".jpg": "image/jpeg",
        ".jpeg": "image/jpeg",
        ".png": "image/png",
        ".gif": "image/gif",
        ".webp": "image/webp",
        ".svg": "image/svg+xml",
      };
      const contentType = mimeTypes[ext] || "application/octet-stream";
      const stream = new ReadableStream<Uint8Array>({
        start(controller) {
          controller.enqueue(new Uint8Array(buffer));
          controller.close();
        },
      });
      return { stream, contentType };
    } catch {
      return null;
    }
  }
}
