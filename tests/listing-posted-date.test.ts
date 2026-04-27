/**
 * parseListingPostedDate — unit tests for the listing's "Posted Date"
 * cell parser. Strict format ("MMM d, yyyy"); anything else returns null
 * so we never persist a wrong date if adidas changes the listing format.
 */

import { describe, it, expect } from "vitest";
import { parseListingPostedDate } from "@server/infrastructure/scraping/adidas-job-scraper.service";

describe("parseListingPostedDate", () => {
  it("parses canonical 'Apr 26, 2026' as UTC midnight", () => {
    expect(parseListingPostedDate("Apr 26, 2026")).toBe("2026-04-26T00:00:00.000Z");
  });

  it("parses single-digit day", () => {
    expect(parseListingPostedDate("Jan 5, 2026")).toBe("2026-01-05T00:00:00.000Z");
  });

  it("is case-insensitive on month", () => {
    expect(parseListingPostedDate("DEC 31, 2025")).toBe("2025-12-31T00:00:00.000Z");
    expect(parseListingPostedDate("dec 31, 2025")).toBe("2025-12-31T00:00:00.000Z");
  });

  it("tolerates non-breaking spaces and extra whitespace", () => {
    expect(parseListingPostedDate("  Mar\u00a01, 2026  ")).toBe("2026-03-01T00:00:00.000Z");
  });

  it("returns null on null/empty input", () => {
    expect(parseListingPostedDate(null)).toBeNull();
    expect(parseListingPostedDate(undefined)).toBeNull();
    expect(parseListingPostedDate("")).toBeNull();
  });

  it("returns null on unknown month abbreviation", () => {
    expect(parseListingPostedDate("Foo 1, 2026")).toBeNull();
  });

  it("returns null on numeric/ISO formats (not what the listing emits)", () => {
    expect(parseListingPostedDate("2026-04-26")).toBeNull();
    expect(parseListingPostedDate("26/04/2026")).toBeNull();
    expect(parseListingPostedDate("April 26, 2026")).toBeNull();
  });

  it("returns null on impossible dates (Feb 30)", () => {
    expect(parseListingPostedDate("Feb 30, 2026")).toBeNull();
  });

  it("returns null on out-of-range year", () => {
    expect(parseListingPostedDate("Apr 1, 1999")).toBeNull();
    expect(parseListingPostedDate("Apr 1, 2200")).toBeNull();
  });
});
