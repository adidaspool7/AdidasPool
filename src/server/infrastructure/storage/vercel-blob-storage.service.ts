/**
 * Vercel Blob Storage Service
 *
 * ONION LAYER: Infrastructure
 * DEPENDENCIES: @vercel/blob (external), domain ports (inward)
 *
 * Implements IStorageService using Vercel Blob.
 * Requires BLOB_READ_WRITE_TOKEN env variable.
 */

import { put, del, get, getDownloadUrl } from "@vercel/blob";
import type { IStorageService } from "@server/domain/ports/services";

export class VercelBlobStorageService implements IStorageService {
  async uploadFile(
    file: File,
    path: string,
    options?: { access?: "public" | "private" }
  ): Promise<{ url: string; pathname: string }> {
    const blob = await put(path, file, {
      access: options?.access ?? "private",
      addRandomSuffix: true,
    });

    return {
      url: blob.url,
      pathname: blob.pathname,
    };
  }

  async deleteFile(url: string): Promise<void> {
    await del(url);
  }

  async getSignedUrl(url: string): Promise<string> {
    return await getDownloadUrl(url);
  }

  async getFileContent(
    url: string
  ): Promise<{ stream: ReadableStream<Uint8Array>; contentType: string } | null> {
    const result = await get(url, { access: "private" });
    if (!result || !result.stream) return null;
    return {
      stream: result.stream as ReadableStream<Uint8Array>,
      contentType: result.blob.contentType,
    };
  }
}
