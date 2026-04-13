/**
 * VercelBlobStorageService — Unit Tests
 *
 * Tests file upload and deletion through the Vercel Blob API.
 * All @vercel/blob calls are mocked.
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { VercelBlobStorageService } from "@server/infrastructure/storage/vercel-blob-storage.service";

// ─── Mocks ────────────────────────────────────────────────────────

vi.mock("@vercel/blob", () => ({
  put: vi.fn().mockResolvedValue({
    url: "https://blob.vercel-storage.com/cvs/test-abc123.pdf",
    pathname: "cvs/test-abc123.pdf",
    downloadUrl: "https://blob.vercel-storage.com/cvs/test-abc123.pdf?download=1",
  }),
  del: vi.fn().mockResolvedValue(undefined),
}));

// ─── Tests ────────────────────────────────────────────────────────

describe("VercelBlobStorageService", () => {
  let service: VercelBlobStorageService;

  beforeEach(() => {
    service = new VercelBlobStorageService();
    vi.clearAllMocks();
  });

  describe("uploadFile", () => {
    it("should call put() with correct arguments", async () => {
      const { put } = await import("@vercel/blob");
      const file = new File([new ArrayBuffer(100)], "resume.pdf", { type: "application/pdf" });

      const result = await service.uploadFile(file, "cvs/candidates/resume.pdf");

      expect(put).toHaveBeenCalledWith("cvs/candidates/resume.pdf", file, {
        access: "private",
        addRandomSuffix: true,
      });
      expect(result.url).toBe("https://blob.vercel-storage.com/cvs/test-abc123.pdf");
      expect(result.pathname).toBe("cvs/test-abc123.pdf");
    });

    it("should pass the file and path through to Vercel Blob", async () => {
      const { put } = await import("@vercel/blob");
      const file = new File([Buffer.from("hello")], "doc.txt", { type: "text/plain" });

      await service.uploadFile(file, "cvs/txt/doc.txt");

      expect(put).toHaveBeenCalledWith("cvs/txt/doc.txt", file, expect.any(Object));
    });
  });

  describe("deleteFile", () => {
    it("should call del() with the file URL", async () => {
      const { del } = await import("@vercel/blob");
      const url = "https://blob.vercel-storage.com/cvs/old-file.pdf";

      await service.deleteFile(url);

      expect(del).toHaveBeenCalledWith(url);
    });
  });
});
