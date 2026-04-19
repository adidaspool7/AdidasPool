/**
 * TextExtractionService — Unit Tests
 *
 * Tests MIME-type routing, TXT extraction, and error handling.
 * PDF and DOCX extraction are tested with mocked dynamic imports.
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { TextExtractionService } from "@server/infrastructure/extraction/text-extraction.service";

// ─── Mocks ────────────────────────────────────────────────────────

// Mock unpdf: dynamic import returns { extractText }
const mockExtractText = vi.fn();

vi.mock("unpdf", () => ({
  extractText: mockExtractText,
}));

// Mock mammoth: dynamic import returns { extractRawText }
const mockExtractRawText = vi.fn();
vi.mock("mammoth", () => ({
  extractRawText: mockExtractRawText,
}));

// ─── Helpers ──────────────────────────────────────────────────────

function bufferFromText(text: string): Buffer {
  return Buffer.from(text, "utf-8");
}

// ─── Tests ────────────────────────────────────────────────────────

describe("TextExtractionService", () => {
  let service: TextExtractionService;

  beforeEach(() => {
    service = new TextExtractionService();
    vi.clearAllMocks();
  });

  // ─── TXT extraction ──────────────────────────────────────────

  describe("TXT extraction", () => {
    it("should extract text from a plain text buffer", async () => {
      const text = "John Doe\nSoftware Engineer\njohn@example.com";
      const buffer = bufferFromText(text);

      const result = await service.extractText(buffer, "text/plain");

      expect(result.text).toBe(text);
      expect(result.pageCount).toBeUndefined();
    });

    it("should handle empty TXT files (returns empty string)", async () => {
      const result = await service.extractText(bufferFromText(""), "text/plain");
      expect(result.text).toBe("");
    });

    it("should preserve UTF-8 characters in TXT", async () => {
      const text = "João da Silva — São Paulo, résumé, über";
      const result = await service.extractText(bufferFromText(text), "text/plain");
      expect(result.text).toBe(text);
    });
  });

  // ─── PDF extraction ──────────────────────────────────────────

  describe("PDF extraction", () => {
    it("should extract text from a PDF buffer using unpdf", async () => {
      mockExtractText.mockResolvedValue({
        text: "  John Doe\nExperienced Software Engineer with 10 years in backend development  ",
        totalPages: 3,
      });

      const fakeBuffer = Buffer.alloc(100);
      const result = await service.extractText(fakeBuffer, "application/pdf");

      expect(mockExtractText).toHaveBeenCalledWith(
        expect.any(Uint8Array),
        { mergePages: true }
      );
      expect(result.text).toBe("John Doe\nExperienced Software Engineer with 10 years in backend development");
      expect(result.pageCount).toBe(3);
    });

    it("should throw if PDF extraction returns insufficient text (<50 chars)", async () => {
      mockExtractText.mockResolvedValue({ text: "Short text", totalPages: 1 });

      const fakeBuffer = Buffer.alloc(100);
      await expect(
        service.extractText(fakeBuffer, "application/pdf")
      ).rejects.toThrow("image-based or empty");
    });

    it("should handle null text from PDF gracefully", async () => {
      mockExtractText.mockResolvedValue({ text: null, totalPages: 0 });

      const fakeBuffer = Buffer.alloc(100);
      await expect(
        service.extractText(fakeBuffer, "application/pdf")
      ).rejects.toThrow("image-based or empty");
    });
  });

  // ─── DOCX extraction ─────────────────────────────────────────

  describe("DOCX extraction", () => {
    it("should extract text from a DOCX buffer using mammoth", async () => {
      mockExtractRawText.mockResolvedValue({
        value: "  Maria Garcia — Project Manager at adidas Porto  ",
      });

      const fakeBuffer = Buffer.alloc(100);
      const result = await service.extractText(
        fakeBuffer,
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
      );

      expect(mockExtractRawText).toHaveBeenCalledWith({ buffer: fakeBuffer });
      expect(result.text).toBe("Maria Garcia — Project Manager at adidas Porto");
      expect(result.pageCount).toBeUndefined();
    });

    it("should throw if DOCX returns insufficient text (<10 chars)", async () => {
      mockExtractRawText.mockResolvedValue({ value: "Hi" });

      await expect(
        service.extractText(Buffer.alloc(50), "application/vnd.openxmlformats-officedocument.wordprocessingml.document")
      ).rejects.toThrow("empty or contains only images");
    });
  });

  // ─── Unsupported MIME types ───────────────────────────────────

  describe("unsupported types", () => {
    it("should throw for unsupported MIME type", async () => {
      await expect(
        service.extractText(Buffer.alloc(10), "image/png")
      ).rejects.toThrow("Unsupported MIME type");
    });

    it("should throw for application/msword (.doc)", async () => {
      // .doc is in ALLOWED_CV_MIME_TYPES but NOT in TextExtractionService
      await expect(
        service.extractText(Buffer.alloc(10), "application/msword")
      ).rejects.toThrow("Unsupported MIME type");
    });
  });
});
