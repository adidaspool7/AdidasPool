/**
 * Supabase Storage Service
 *
 * ONION LAYER: Infrastructure
 * REPLACES: VercelBlobStorageService
 *
 * Implements IStorageService using Supabase Storage.
 * Bucket: "talent-pool" (public bucket, path-level access control via RLS)
 *
 * Required setup in Supabase dashboard:
 *   Storage → New bucket → Name: "talent-pool" → Public: false
 */

import { createClient } from "@supabase/supabase-js";
import type { IStorageService } from "@server/domain/ports/services";

const BUCKET = "talent-pool";

function getAdminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  );
}

export class SupabaseStorageService implements IStorageService {
  async uploadFile(
    file: File,
    path: string,
    _options?: { access?: "public" | "private" }
  ): Promise<{ url: string; pathname: string }> {
    const supabase = getAdminClient();

    // Add a random suffix to avoid collisions (matching Vercel Blob behaviour)
    const ext = path.includes(".") ? path.split(".").pop() : "";
    const suffix = Math.random().toString(36).slice(2, 8);
    const pathname = ext ? `${path.replace(`.${ext}`, "")}_${suffix}.${ext}` : `${path}_${suffix}`;

    const arrayBuffer = await file.arrayBuffer();
    const { error } = await supabase.storage
      .from(BUCKET)
      .upload(pathname, arrayBuffer, {
        contentType: file.type || "application/octet-stream",
        upsert: false,
      });

    if (error) {
      throw new Error(`[Storage] Upload failed: ${error.message}`);
    }

    const { data } = supabase.storage.from(BUCKET).getPublicUrl(pathname);
    return { url: data.publicUrl, pathname };
  }

  async deleteFile(urlOrPath: string): Promise<void> {
    const supabase = getAdminClient();

    // Accept either a full URL or a storage path
    let path = urlOrPath;
    const storageBase = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/${BUCKET}/`;
    if (urlOrPath.startsWith(storageBase)) {
      path = urlOrPath.slice(storageBase.length);
    }

    const { error } = await supabase.storage.from(BUCKET).remove([path]);
    if (error) {
      throw new Error(`[Storage] Delete failed: ${error.message}`);
    }
  }

  async getSignedUrl(urlOrPath: string): Promise<string> {
    const supabase = getAdminClient();

    let path = urlOrPath;
    const storageBase = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/${BUCKET}/`;
    if (urlOrPath.startsWith(storageBase)) {
      path = urlOrPath.slice(storageBase.length);
    }

    const { data, error } = await supabase.storage
      .from(BUCKET)
      .createSignedUrl(path, 3600); // 1-hour expiry

    if (error || !data) {
      throw new Error(`[Storage] Signed URL failed: ${error?.message}`);
    }
    return data.signedUrl;
  }

  async getFileContent(
    urlOrPath: string
  ): Promise<{ stream: ReadableStream<Uint8Array>; contentType: string } | null> {
    const supabase = getAdminClient();

    let path = urlOrPath;
    const storageBase = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/${BUCKET}/`;
    if (urlOrPath.startsWith(storageBase)) {
      path = urlOrPath.slice(storageBase.length);
    }

    const { data, error } = await supabase.storage
      .from(BUCKET)
      .download(path);

    if (error || !data) return null;

    return {
      stream: data.stream() as ReadableStream<Uint8Array>,
      contentType: data.type || "application/octet-stream",
    };
  }
}
