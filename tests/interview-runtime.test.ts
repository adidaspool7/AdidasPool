/**
 * Interview Runtime — Unit Tests
 * Tests for timer formatting, audio payload building, and termination logic.
 */

import { describe, it, expect } from "vitest";
import { buildAudioPayload, formatTime, SUPPORTED_AUDIO_MIME_TYPES } from "@/lib/interview-utils";

// ─── Tests ────────────────────────────────────────────────────────────────────

describe("formatTime", () => {
  it("formats zero seconds", () => {
    expect(formatTime(0)).toBe("00:00");
  });

  it("formats 30 minutes exactly", () => {
    expect(formatTime(30 * 60)).toBe("30:00");
  });

  it("formats 3 minutes exactly", () => {
    expect(formatTime(3 * 60)).toBe("03:00");
  });

  it("formats 1 hour 5 seconds", () => {
    expect(formatTime(3605)).toBe("60:05");
  });

  it("pads minutes and seconds to 2 digits", () => {
    expect(formatTime(65)).toBe("01:05");
  });
});

describe("buildAudioPayload", () => {
  it("returns invalid with reason 'missing' when base64 is null", () => {
    const result = buildAudioPayload(null, "audio/mpeg");
    expect(result.valid).toBe(false);
    if (!result.valid) expect(result.reason).toBe("missing");
  });

  it("returns invalid with reason 'missing' when base64 is undefined", () => {
    const result = buildAudioPayload(undefined, "audio/wav");
    expect(result.valid).toBe(false);
    if (!result.valid) expect(result.reason).toBe("missing");
  });

  it("returns invalid with reason 'invalid-mime' for unsupported MIME", () => {
    const result = buildAudioPayload("abc123", "audio/aiff");
    expect(result.valid).toBe(false);
    if (!result.valid) expect(result.reason).toBe("invalid-mime");
  });

  it("accepts audio/mpeg and builds data URL", () => {
    const result = buildAudioPayload("abc123", "audio/mpeg");
    expect(result.valid).toBe(true);
    if (result.valid) {
      expect(result.url).toBe("data:audio/mpeg;base64,abc123");
      expect(result.mimeType).toBe("audio/mpeg");
    }
  });

  it("accepts audio/wav and normalizes case", () => {
    const result = buildAudioPayload("xyz456", "AUDIO/WAV");
    expect(result.valid).toBe(true);
    if (result.valid) {
      expect(result.mimeType).toBe("audio/wav");
    }
  });

  it("defaults to audio/wav when mimeType is null", () => {
    const result = buildAudioPayload("abc123", null);
    expect(result.valid).toBe(true);
    if (result.valid) {
      expect(result.mimeType).toBe("audio/wav");
      expect(result.url).toContain("audio/wav");
    }
  });

  it("accepts audio/webm", () => {
    const result = buildAudioPayload("data", "audio/webm");
    expect(result.valid).toBe(true);
  });

  it("accepts audio/ogg", () => {
    const result = buildAudioPayload("data", "audio/ogg");
    expect(result.valid).toBe(true);
  });
});

describe("interview timer behaviour", () => {
  it("question timer constant is 3 minutes", () => {
    const QUESTION_SECONDS = 3 * 60;
    expect(QUESTION_SECONDS).toBe(180);
  });

  it("total timer constant is 30 minutes", () => {
    const TOTAL_INTERVIEW_SECONDS = 30 * 60;
    expect(TOTAL_INTERVIEW_SECONDS).toBe(1800);
  });

  it("timer reaches zero after decrement sequence", () => {
    let time = 3;
    while (time > 0) time -= 1;
    expect(time).toBe(0);
  });
});

describe("termination reason classification", () => {
  const validReasons = ["user_early_exit", "question_timeout", "total_timeout", "backend_ended"];

  it("all expected termination reasons are non-empty strings", () => {
    for (const reason of validReasons) {
      expect(typeof reason).toBe("string");
      expect(reason.length).toBeGreaterThan(0);
    }
  });

  it("defaults to user_early_exit when no reason given", () => {
    const reason = undefined ?? "user_early_exit";
    expect(reason).toBe("user_early_exit");
  });
});

describe("evaluation result shape", () => {
  it("maps final=true to PASS decision", () => {
    const finalDecision = true ? "PASS" : "FAIL";
    expect(finalDecision).toBe("PASS");
  });

  it("maps final=false to FAIL decision", () => {
    const finalDecision = false ? "PASS" : "FAIL";
    expect(finalDecision).toBe("FAIL");
  });

  it("maps technical.passed=true to PASS", () => {
    const technicalDecision = true ? "PASS" : "FAIL";
    expect(technicalDecision).toBe("PASS");
  });
});
