/**
 * Interview runtime token tests (audit H5).
 *
 * Covers the user-binding contract added to prevent token replay across
 * different authenticated sessions.
 */

import { beforeAll, describe, expect, it } from "vitest";

beforeAll(() => {
  process.env.INTERVIEW_SESSION_TOKEN_SECRET = "test-secret-do-not-use";
});

async function loadModule() {
  return import("../src/server/infrastructure/security/interview-token");
}

describe("interview runtime token", () => {
  it("round-trips a valid payload including userId", async () => {
    const mod = await loadModule();
    const { token } = mod.createInterviewRuntimeToken({
      interviewId: "i-1",
      candidateId: "c-1",
      userId: "u-1",
    });
    const payload = mod.verifyInterviewRuntimeToken(token);
    expect(payload.interviewId).toBe("i-1");
    expect(payload.candidateId).toBe("c-1");
    expect(payload.userId).toBe("u-1");
    expect(payload.exp).toBeGreaterThan(Math.floor(Date.now() / 1000));
  });

  it("rejects tampered tokens", async () => {
    const mod = await loadModule();
    const { token } = mod.createInterviewRuntimeToken({
      interviewId: "i-1",
      candidateId: "c-1",
      userId: "u-1",
    });
    const tampered = token.slice(0, -3) + "AAA";
    expect(() => mod.verifyInterviewRuntimeToken(tampered)).toThrow(/signature/i);
  });

  it("rejects expired tokens", async () => {
    const mod = await loadModule();
    const { token } = mod.createInterviewRuntimeToken(
      { interviewId: "i-1", candidateId: "c-1", userId: "u-1" },
      -1 // already expired
    );
    expect(() => mod.verifyInterviewRuntimeToken(token)).toThrow(/expired/i);
  });

  it("verifyForUser accepts the matching user", async () => {
    const mod = await loadModule();
    const { token } = mod.createInterviewRuntimeToken({
      interviewId: "i-1",
      candidateId: "c-1",
      userId: "u-1",
    });
    const payload = mod.verifyInterviewRuntimeTokenForUser(token, "u-1");
    expect(payload.userId).toBe("u-1");
  });

  it("verifyForUser rejects a different user (replay protection)", async () => {
    const mod = await loadModule();
    const { token } = mod.createInterviewRuntimeToken({
      interviewId: "i-1",
      candidateId: "c-1",
      userId: "u-1",
    });
    expect(() => mod.verifyInterviewRuntimeTokenForUser(token, "u-other"))
      .toThrow(/match/i);
  });

  it("rejects payloads missing userId (legacy tokens)", async () => {
    // Manually craft a token with the old shape (no userId) using the same secret.
    const { createHmac } = await import("crypto");
    const body = Buffer.from(
      JSON.stringify({
        interviewId: "i-1",
        candidateId: "c-1",
        exp: Math.floor(Date.now() / 1000) + 600,
      }),
      "utf-8"
    ).toString("base64url");
    const sig = createHmac("sha256", process.env.INTERVIEW_SESSION_TOKEN_SECRET!)
      .update(body)
      .digest("base64url");
    const legacyToken = `${body}.${sig}`;

    const mod = await loadModule();
    expect(() => mod.verifyInterviewRuntimeToken(legacyToken)).toThrow(/payload/i);
  });
});
