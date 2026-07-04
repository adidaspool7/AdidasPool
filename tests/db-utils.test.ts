/**
 * db-utils — Unit Tests
 *
 * Pure transformation helpers that sit on every Supabase round-trip:
 *   camelizeKeys  (snake_case → camelCase, ISO→Date, JSONB non-recursion)
 *   snakeifyKeys  (camelCase → snake_case, top-level)
 *   assertNoError (throws on a Supabase error object)
 *   generateId    (UUID v4)
 *
 * These have documented edge cases (JSONB columns must NOT be recursed into,
 * or ISO date strings inside them get coerced to Date and break Zod reloads),
 * so they are worth locking down even though the surrounding repositories are
 * intentionally left untested.
 */
import { describe, it, expect } from "vitest";
import {
  camelizeKeys,
  snakeifyKeys,
  assertNoError,
  generateId,
} from "@server/infrastructure/database/db-utils";

describe("camelizeKeys", () => {
  it("converts snake_case column names to camelCase", () => {
    const out = camelizeKeys<{ firstName: string; overallCvScore: number }>({
      first_name: "Ana",
      overall_cv_score: 82,
    });
    expect(out).toEqual({ firstName: "Ana", overallCvScore: 82 });
  });

  it("coerces ISO datetime strings to Date objects", () => {
    const out = camelizeKeys<{ createdAt: Date }>({
      created_at: "2026-01-15T10:30:00Z",
    });
    expect(out.createdAt).toBeInstanceOf(Date);
    expect((out.createdAt as Date).getUTCFullYear()).toBe(2026);
  });

  it("leaves plain date-only strings untouched (not ISO datetime)", () => {
    const out = camelizeKeys<{ dob: unknown }>({ dob: "1998-05-10" });
    expect(out.dob).toBe("1998-05-10");
  });

  it("recurses into nested relation objects and arrays", () => {
    const out = camelizeKeys<{ topSkill: { skillName: string }; workHistory: Array<{ jobTitle: string }> }>({
      top_skill: { skill_name: "TypeScript" },
      work_history: [{ job_title: "Engineer" }, { job_title: "Lead" }],
    });
    expect(out.topSkill).toEqual({ skillName: "TypeScript" });
    expect(out.workHistory).toEqual([{ jobTitle: "Engineer" }, { jobTitle: "Lead" }]);
  });

  it("does NOT recurse into JSONB columns (preserves ISO strings inside)", () => {
    const out = camelizeKeys<{ parsedRequirements: Record<string, unknown> }>({
      parsed_requirements: {
        rawExtractionTimestamp: "2026-01-01T00:00:00Z",
        raw_stays_raw: "value",
      },
    });
    // Inner keys are untouched and the ISO string stays a string.
    expect(out.parsedRequirements).toEqual({
      rawExtractionTimestamp: "2026-01-01T00:00:00Z",
      raw_stays_raw: "value",
    });
    expect(typeof (out.parsedRequirements as { rawExtractionTimestamp: unknown }).rawExtractionTimestamp).toBe("string");
  });

  it("passes null and undefined through unchanged", () => {
    const out = camelizeKeys<{ middleName: unknown; nickName: unknown }>({
      middle_name: null,
      nick_name: undefined,
    });
    expect(out.middleName).toBeNull();
    expect(out.nickName).toBeUndefined();
  });

  it("keeps primitive array items as-is", () => {
    const out = camelizeKeys<{ tagList: string[] }>({ tag_list: ["a", "b"] });
    expect(out.tagList).toEqual(["a", "b"]);
  });
});

describe("snakeifyKeys", () => {
  it("converts camelCase keys to snake_case (top-level only)", () => {
    expect(snakeifyKeys({ firstName: "Ana", overallCvScore: 82 })).toEqual({
      first_name: "Ana",
      overall_cv_score: 82,
    });
  });

  it("leaves nested object values untouched", () => {
    const nested = { rawExtractionModel: "m" };
    expect(snakeifyKeys({ parsedRequirements: nested })).toEqual({
      parsed_requirements: nested,
    });
  });
});

describe("assertNoError", () => {
  it("does nothing when the error is null", () => {
    expect(() => assertNoError(null, "test")).not.toThrow();
  });

  it("throws a contextualized error when a Supabase error is present", () => {
    expect(() => assertNoError({ message: "boom", code: "PGRST200" }, "findMany")).toThrow(
      /\[DB:findMany\] boom \(code: PGRST200\)/
    );
  });

  it("falls back to 'unknown' when no code is provided", () => {
    expect(() => assertNoError({ message: "boom" }, "ctx")).toThrow(/code: unknown/);
  });
});

describe("generateId", () => {
  it("produces a well-formed UUID", () => {
    const id = generateId();
    expect(id).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i);
  });

  it("produces unique values", () => {
    expect(generateId()).not.toBe(generateId());
  });
});
