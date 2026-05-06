/**
 * Logger PII redaction tests (audit M2).
 *
 * The logger wraps console.* with a small PII/secret scrubber so hot-path
 * logs (CV parser, scraper, OpenAI client) don't leak sensitive values into
 * Vercel's log streams. These tests pin the redaction patterns so a future
 * change to the regex set has to update them deliberately.
 */

import { describe, it, expect } from "vitest";
import { __internal } from "../src/server/infrastructure/logging/logger";

const { redactString, redactValue } = __internal;

describe("logger redaction", () => {
  describe("redactString", () => {
    it("redacts plain email addresses", () => {
      expect(redactString("contact alice@example.com please"))
        .toBe("contact [REDACTED_EMAIL] please");
    });

    it("redacts Bearer tokens regardless of case", () => {
      expect(redactString("auth: bearer abc.def-ghi_jkl"))
        .toBe("auth: Bearer [REDACTED]");
    });

    it("redacts JWT-shaped tokens", () => {
      const jwt = "eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiIxMjM0NTY3ODkwIn0.SflKxwRJSMeKKF2QT4fwpMeJf36POk6yJV_adQssw5c";
      expect(redactString(`token=${jwt}`))
        .toBe("token=[REDACTED_JWT]");
    });

    it("redacts long base64-ish blobs (>=256 chars)", () => {
      const blob = "A".repeat(300);
      // The regex eats contiguous base64-class chars including "=", so
      // the prefix is consumed too. We just verify the blob disappears.
      const out = redactString(`payload=${blob}`);
      expect(out).toContain("[REDACTED_BLOB]");
      expect(out).not.toContain(blob);
    });

    it("leaves short safe text untouched", () => {
      expect(redactString("Job 12345 fetched ok")).toBe("Job 12345 fetched ok");
    });
  });

  describe("redactValue", () => {
    it("redacts strings inside arrays", () => {
      expect(redactValue(["alice@example.com", "ok"]))
        .toEqual(["[REDACTED_EMAIL]", "ok"]);
    });

    it("masks values under sensitive keys (token / password / authorization / api_key)", () => {
      const out = redactValue({
        token: "abc",
        password: "hunter2",
        authorization: "Bearer xyz",
        api_key: "k",
        apiKey: "k",
        cookie: "session=zzz",
        normal: "kept",
      }) as Record<string, unknown>;
      expect(out.token).toBe("[REDACTED]");
      expect(out.password).toBe("[REDACTED]");
      expect(out.authorization).toBe("[REDACTED]");
      expect(out.api_key).toBe("[REDACTED]");
      expect(out.apiKey).toBe("[REDACTED]");
      expect(out.cookie).toBe("[REDACTED]");
      expect(out.normal).toBe("kept");
    });

    it("redacts inside nested objects", () => {
      const out = redactValue({
        user: { email: "alice@example.com" },
      }) as { user: { email: string } };
      expect(out.user.email).toBe("[REDACTED_EMAIL]");
    });

    it("normalizes Error objects with redacted message + stack", () => {
      const err = new Error("Failed for alice@example.com");
      const out = redactValue(err) as { name: string; message: string; stack?: string };
      expect(out.name).toBe("Error");
      expect(out.message).toBe("Failed for [REDACTED_EMAIL]");
      expect(out.stack ?? "").not.toContain("alice@example.com");
    });

    it("caps recursion depth to avoid runaway logs", () => {
      const deep: Record<string, unknown> = {};
      let cur = deep;
      for (let i = 0; i < 10; i++) {
        const next: Record<string, unknown> = {};
        cur.next = next;
        cur = next;
      }
      // Should return without throwing, with truncation marker somewhere.
      const out = redactValue(deep);
      expect(JSON.stringify(out)).toContain("Truncated");
    });
  });
});
