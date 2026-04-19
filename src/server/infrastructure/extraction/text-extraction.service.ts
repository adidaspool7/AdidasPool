/**
 * Text Extraction Service
 *
 * ONION LAYER: Infrastructure
 * DEPENDENCIES: unpdf, mammoth (external), domain ports (inward)
 *
 * Converts binary file buffers into raw plaintext.
 * Supports PDF (text-based), DOCX, and TXT formats.
 */

import type { ITextExtractionService } from "@server/domain/ports/services";

/**
 * Sanitize extracted text by removing/replacing non-standard characters.
 * PDFs often contain broken glyphs, zero-width spaces, soft hyphens, and
 * other invisible characters from embedded fonts that corrupt LLM parsing.
 *
 * Returns { cleaned, report } where report lists what was changed.
 */
function sanitizeExtractedText(raw: string): {
  cleaned: string;
  report: string[];
} {
  const report: string[] = [];
  let text = raw;

  // 1. Replace obscure special dashes/hyphens with standard hyphen
  //    (preserves em-dash U+2014 and en-dash U+2013 — those are valid punctuation)
  const dashPattern = /[\u2010\u2011\u2012\u2015\uFE58\uFE63\uFF0D]/g;
  const dashMatches = text.match(dashPattern);
  if (dashMatches) {
    report.push(
      `Replaced ${dashMatches.length} special dash/hyphen character(s) → standard hyphen`
    );
    text = text.replace(dashPattern, "-");
  }

  // 2. Remove zero-width / invisible characters
  const invisiblePattern =
    /[\u200B\u200C\u200D\u200E\u200F\uFEFF\u00AD\u2060\u00A0]/g;
  const invisibleMatches = text.match(invisiblePattern);
  if (invisibleMatches) {
    report.push(
      `Removed ${invisibleMatches.length} invisible/zero-width character(s)`
    );
    // Replace non-breaking space with regular space, remove the rest
    text = text.replace(/[\u00A0]/g, " ");
    text = text.replace(
      /[\u200B\u200C\u200D\u200E\u200F\uFEFF\u00AD\u2060]/g,
      ""
    );
  }

  // 3. Replace smart quotes with standard quotes
  const smartQuotePattern = /[\u2018\u2019\u201A\u201B]/g;
  const smartDoublePattern = /[\u201C\u201D\u201E\u201F]/g;
  const sqMatches = text.match(smartQuotePattern);
  const dqMatches = text.match(smartDoublePattern);
  if (sqMatches) {
    report.push(`Replaced ${sqMatches.length} smart single-quote(s) → '`);
    text = text.replace(smartQuotePattern, "'");
  }
  if (dqMatches) {
    report.push(`Replaced ${dqMatches.length} smart double-quote(s) → "`);
    text = text.replace(smartDoublePattern, '"');
  }

  // 4. Replace bullet-like symbols with standard bullet
  const bulletPattern = /[\u2022\u2023\u25E6\u2043\u25AA\u25CF\u2219]/g;
  const bulletMatches = text.match(bulletPattern);
  if (bulletMatches) {
    report.push(
      `Normalized ${bulletMatches.length} bullet/list character(s) → •`
    );
    text = text.replace(bulletPattern, "•");
  }

  // 5. Strip remaining non-printable control characters (keep tabs, newlines)
  const controlPattern = /[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g;
  const controlMatches = text.match(controlPattern);
  if (controlMatches) {
    report.push(
      `Stripped ${controlMatches.length} non-printable control character(s)`
    );
    text = text.replace(controlPattern, "");
  }

  // 6. Detect remaining non-ASCII non-letter characters that look like broken glyphs
  //    (characters in Private Use Area U+E000–U+F8FF)
  const puaPattern = /[\uE000-\uF8FF]/g;
  const puaMatches = text.match(puaPattern);
  if (puaMatches) {
    report.push(
      `Removed ${puaMatches.length} Private Use Area glyph(s) (likely broken font characters)`
    );
    text = text.replace(puaPattern, "");
  }

  // 7. Collapse multiple consecutive spaces into one (but preserve newlines)
  const beforeLen = text.length;
  text = text.replace(/ {2,}/g, " ");
  const spacesReduced = beforeLen - text.length;
  if (spacesReduced > 10) {
    report.push(`Collapsed ${spacesReduced} extra spaces`);
  }

  return { cleaned: text, report };
}

export class TextExtractionService implements ITextExtractionService {
  async extractText(
    buffer: Buffer,
    mimeType: string
  ): Promise<{ text: string; pageCount?: number }> {
    let result: { text: string; pageCount?: number };

    switch (mimeType) {
      case "application/pdf":
        result = await this.extractFromPdf(buffer);
        break;

      case "application/vnd.openxmlformats-officedocument.wordprocessingml.document":
        result = await this.extractFromDocx(buffer);
        break;

      case "text/plain":
        result = { text: buffer.toString("utf-8") };
        break;

      default:
        throw new Error(`Unsupported MIME type for text extraction: ${mimeType}`);
    }

    // Sanitize extracted text
    const { cleaned, report } = sanitizeExtractedText(result.text);
    if (report.length > 0) {
      console.log(
        `[Text Extraction] Sanitized text (${report.length} fix${report.length > 1 ? "es" : ""}):\n` +
          report.map((r) => `  → ${r}`).join("\n")
      );
    }

    return { ...result, text: cleaned };
  }

  private async extractFromPdf(
    buffer: Buffer
  ): Promise<{ text: string; pageCount?: number }> {
    const { extractText } = await import("unpdf");
    const result = await extractText(new Uint8Array(buffer), { mergePages: true });
    const text = (result.text as string)?.trim() ?? "";

    if (text.length < 50) {
      throw new Error(
        "PDF appears to be image-based or empty. Text extraction returned insufficient content. " +
          "OCR support for scanned PDFs is not yet available."
      );
    }

    return {
      text,
      pageCount: result.totalPages,
    };
  }

  private async extractFromDocx(
    buffer: Buffer
  ): Promise<{ text: string; pageCount?: number }> {
    const mammoth = await import("mammoth");

    const result = await mammoth.extractRawText({ buffer });
    const text = result.value?.trim() ?? "";

    if (text.length < 10) {
      throw new Error(
        "DOCX file appears to be empty or contains only images/formatting."
      );
    }

    return { text };
  }
}
