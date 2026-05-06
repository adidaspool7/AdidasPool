/**
 * Unit tests for the PostgREST `.or()` value sanitizer.
 * See src/server/infrastructure/database/db-utils.ts → escapeOrTerm.
 */
import { describe, it, expect } from "vitest";
import { escapeOrTerm } from "../src/server/infrastructure/database/db-utils";

describe("escapeOrTerm", () => {
  it("passes through plain ASCII", () => {
    expect(escapeOrTerm("alice@example.com")).toBe("alice@example.com");
  });

  it("strips commas (PostgREST OR-list separator)", () => {
    // A naïve search like `foo,email.eq.victim@x.com` would silently widen
    // the OR list. Sanitizer must drop the comma.
    expect(escapeOrTerm("foo,email.eq.x@y.com"))
      .toBe("foo email.eq.x@y.com");
  });

  it("strips parentheses", () => {
    expect(escapeOrTerm("a(b)c")).toBe("a b c");
  });

  it("strips colons", () => {
    expect(escapeOrTerm("a:b")).toBe("a b");
  });

  it("strips backslashes and double quotes", () => {
    expect(escapeOrTerm('a"b\\c')).toBe("a b c");
  });

  it("collapses whitespace and trims", () => {
    expect(escapeOrTerm("  hello   world  ")).toBe("hello world");
  });

  it("preserves SQL ILIKE wildcards % and _", () => {
    // Caller wraps the value in %...%; user-supplied wildcards pass through.
    // PostgREST always parameterizes ILIKE so this is safe.
    expect(escapeOrTerm("100% off_now")).toBe("100% off_now");
  });

  it("returns empty string for input that is all separators", () => {
    expect(escapeOrTerm(",,(,):")).toBe("");
  });

  it("does not let a search term break out of an .or() expression", () => {
    // Real-world injection attempt: try to escape `email.ilike.%X%` and
    // append a new OR-branch matching another column.
    const malicious = "x%,is_admin.eq.true";
    expect(escapeOrTerm(malicious)).toBe("x% is_admin.eq.true");
    // The result, when interpolated into the .or() string, becomes a single
    // literal — PostgREST will treat it as ILIKE substring rather than as
    // additional structural OR-branches, because the comma is gone.
  });
});
