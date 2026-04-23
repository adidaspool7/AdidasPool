/**
 * Phase 2 — CV extraction: per-experience Field of Work tagging.
 *
 * Covers only the Zod schema behavior. The LLM classifier is tested
 * implicitly by the upload-use-cases integration tests.
 */
import { describe, it, expect } from "vitest";
import { CvExtractionSchema } from "../src/server/application/dtos";

const base = {
  firstName: "Ada",
  lastName: "Lovelace",
  experiences: [
    {
      jobTitle: "Store Manager",
      isCurrent: false,
      fieldsOfWork: ["Retail", "Sales"],
    },
  ],
  education: [],
  languages: [],
  skills: [],
};

describe("CvExtractionSchema — per-experience fieldsOfWork (Phase 2)", () => {
  it("keeps canonical fields verbatim", () => {
    const parsed = CvExtractionSchema.parse(base);
    expect(parsed.experiences[0].fieldsOfWork).toEqual(["Retail", "Sales"]);
  });

  it("defaults to empty array when the LLM omits the field", () => {
    const parsed = CvExtractionSchema.parse({
      ...base,
      experiences: [{ jobTitle: "Analyst", isCurrent: false }],
    });
    expect(parsed.experiences[0].fieldsOfWork).toEqual([]);
  });

  it("drops unknown values rather than rejecting the whole payload (tolerance)", () => {
    const parsed = CvExtractionSchema.parse({
      ...base,
      experiences: [
        {
          jobTitle: "Ops Lead",
          isCurrent: false,
          fieldsOfWork: ["Retail", "Operations", "InventedThing"],
        },
      ],
    });
    // Only "Retail" is canonical; the other two are dropped.
    expect(parsed.experiences[0].fieldsOfWork).toEqual(["Retail"]);
  });

  it("matches case-insensitively and normalizes back to canonical form", () => {
    const parsed = CvExtractionSchema.parse({
      ...base,
      experiences: [
        {
          jobTitle: "Head of Retail",
          isCurrent: false,
          fieldsOfWork: ["retail", "SALES"],
        },
      ],
    });
    expect(parsed.experiences[0].fieldsOfWork).toEqual(["Retail", "Sales"]);
  });

  it("handles non-array inputs gracefully (defaults to empty)", () => {
    const parsed = CvExtractionSchema.parse({
      ...base,
      experiences: [
        {
          jobTitle: "Consultant",
          isCurrent: false,
          fieldsOfWork: "Retail" as unknown as string[], // malformed
        },
      ],
    });
    expect(parsed.experiences[0].fieldsOfWork).toEqual([]);
  });
});
