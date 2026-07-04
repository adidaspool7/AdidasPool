/**
 * Batch 3c — ExportUseCases (Application layer).
 * Verifies the candidate → CSV row mapping: header composition, null
 * coalescing, and the language/tag join formatting. Repo mocked.
 */
import { describe, it, expect, vi } from "vitest";
import { ExportUseCases } from "@server/application/use-cases/export.use-cases";
import type { ICandidateRepository, CandidateRow } from "@server/domain/ports/repositories";

function makeRepo(rows: unknown[]): ICandidateRepository {
  return {
    findForExport: vi.fn(async () => rows as CandidateRow[]),
  } as unknown as ICandidateRepository;
}

describe("ExportUseCases.exportCandidatesCsv", () => {
  it("produces a header row and one data row per candidate", async () => {
    const repo = makeRepo([
      {
        firstName: "Maria",
        lastName: "Garcia",
        email: "maria@x.com",
        location: "Porto",
        country: "Portugal",
        status: "SCREENED",
        overallCvScore: 82,
        sourceType: "PLATFORM",
        languages: [{ language: "English", selfDeclaredLevel: "C1" }],
        tags: [{ tag: "brand-ambassador" }],
        createdAt: new Date("2026-01-15T10:00:00Z"),
      },
    ]);
    const uc = new ExportUseCases(repo);

    const csv = await uc.exportCandidatesCsv();
    const lines = csv.trim().split(/\r?\n/);

    expect(lines[0]).toContain("Name");
    expect(lines[0]).toContain("CV Score");
    expect(lines).toHaveLength(2);
    expect(lines[1]).toContain("Maria Garcia");
    expect(lines[1]).toContain("English (C1)");
    expect(lines[1]).toContain("brand-ambassador");
  });

  it("coalesces missing optional fields to empty strings", async () => {
    const repo = makeRepo([
      {
        firstName: "No",
        lastName: "Contact",
        email: null,
        location: null,
        country: null,
        status: "NEW",
        overallCvScore: null,
        sourceType: "SCRAPED",
        languages: [],
        tags: [],
        createdAt: new Date("2026-02-01T00:00:00Z"),
      },
    ]);
    const uc = new ExportUseCases(repo);

    const csv = await uc.exportCandidatesCsv();
    const lines = csv.trim().split(/\r?\n/);

    expect(lines).toHaveLength(2);
    // Language self-declared level falls back to "?" only when a language row
    // exists; with none, the Languages column is blank.
    expect(lines[1]).toContain("No Contact");
  });

  it("returns a header-only CSV when there are no candidates", async () => {
    const uc = new ExportUseCases(makeRepo([]));
    const csv = await uc.exportCandidatesCsv();
    // papaparse emits an empty string for an empty array.
    expect(csv).toBe("");
  });
});
