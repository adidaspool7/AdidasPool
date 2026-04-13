/**
 * Export Use Cases
 *
 * ONION LAYER: Application
 * DEPENDENCIES: Domain ports (inward only), papaparse (data formatting)
 *
 * Orchestrates data export operations.
 */

import Papa from "papaparse";
import type { ICandidateRepository } from "@server/domain/ports/repositories";

export class ExportUseCases {
  constructor(private readonly candidateRepo: ICandidateRepository) {}

  /**
   * Export all candidates as a CSV string.
   */
  async exportCandidatesCsv(): Promise<string> {
    const candidates = await this.candidateRepo.findForExport();

    const csvData = (candidates as any[]).map((c: any) => ({
      Name: `${c.firstName} ${c.lastName}`,
      Email: c.email || "",
      Phone: c.phone || "",
      Location: c.location || "",
      Country: c.country || "",
      Status: c.status,
      "CV Score": c.overallCvScore ?? "",
      "Experience Score": c.experienceScore ?? "",
      "Education Score": c.educationScore ?? "",
      "Years of Experience": c.yearsOfExperience ?? "",
      Languages: c.languages
        .map((l: any) => `${l.language} (${l.selfDeclaredLevel || "?"})`)
        .join(", "),
      Tags: c.tags.map((t: any) => t.tag).join(", "),
      Source: c.sourceType,
      "Created At": c.createdAt.toISOString(),
    }));

    return Papa.unparse(csvData);
  }
}
