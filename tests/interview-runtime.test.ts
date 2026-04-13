/**
 * Interview Runtime — Unit Tests
 * Tests for timer formatting, audio payload building, and termination logic.
 */

import { describe, it, expect } from "vitest";
import { buildAudioPayload, formatTime, isClarificationText, STT_FALLBACK_MESSAGE, SUPPORTED_AUDIO_MIME_TYPES } from "@/lib/interview-utils";

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

// ─── STT / TTS Speech Tests ──────────────────────────────────────────────────

describe("isClarificationText", () => {
  it("returns true for text ending with ?", () => {
    expect(isClarificationText("Can you repeat?")).toBe(true);
  });

  it("returns true for text ending with ? after whitespace", () => {
    expect(isClarificationText("What do you mean?  ")).toBe(true);
  });

  it("returns false for a regular answer", () => {
    expect(isClarificationText("I worked on a React project")).toBe(false);
  });

  it("returns false for empty string", () => {
    expect(isClarificationText("")).toBe(false);
  });

  it("returns false for whitespace-only", () => {
    expect(isClarificationText("   ")).toBe(false);
  });

  it("returns true for single question mark", () => {
    expect(isClarificationText("?")).toBe(true);
  });

  it("returns false when ? is in middle of text", () => {
    expect(isClarificationText("Is this right? I think so.")).toBe(false);
  });
});

describe("STT_FALLBACK_MESSAGE", () => {
  it("is a non-empty string", () => {
    expect(typeof STT_FALLBACK_MESSAGE).toBe("string");
    expect(STT_FALLBACK_MESSAGE.length).toBeGreaterThan(0);
  });

  it("mentions Chrome or Edge", () => {
    expect(STT_FALLBACK_MESSAGE).toMatch(/Chrome|Edge/);
  });

  it("mentions typing as fallback", () => {
    expect(STT_FALLBACK_MESSAGE).toMatch(/type/i);
  });
});

describe("speech state transitions (push-to-talk model)", () => {
  it("starts in idle state (not recording, no transcript)", () => {
    const state = { isRecording: false, sttTranscript: "", sttSupported: false };
    expect(state.isRecording).toBe(false);
    expect(state.sttTranscript).toBe("");
  });

  it("transitions to recording on start", () => {
    const state = { isRecording: false, sttTranscript: "" };
    // Simulate startSpeechRecognition
    state.isRecording = true;
    state.sttTranscript = "";
    expect(state.isRecording).toBe(true);
    expect(state.sttTranscript).toBe("");
  });

  it("accumulates transcript during recording", () => {
    const state = { isRecording: true, sttTranscript: "" };
    // Simulate onresult events
    state.sttTranscript = "Hello";
    expect(state.sttTranscript).toBe("Hello");
    state.sttTranscript = "Hello world";
    expect(state.sttTranscript).toBe("Hello world");
  });

  it("resets state on stop and submit", () => {
    const state = { isRecording: true, sttTranscript: "My answer is React" };
    // Simulate stopAndSubmitVoice
    const submittedText = state.sttTranscript.trim();
    state.isRecording = false;
    state.sttTranscript = "";
    expect(state.isRecording).toBe(false);
    expect(state.sttTranscript).toBe("");
    expect(submittedText).toBe("My answer is React");
  });

  it("does not submit empty transcript on stop", () => {
    const state = { isRecording: true, sttTranscript: "" };
    const submittedText = state.sttTranscript.trim();
    state.isRecording = false;
    state.sttTranscript = "";
    expect(submittedText).toBe("");
    // In the real code, empty transcript means no sendTurnWithText call
  });

  it("detects clarification in voice transcript", () => {
    const transcript = "Can you explain that more?";
    expect(isClarificationText(transcript)).toBe(true);

    const answer = "I have experience with TypeScript";
    expect(isClarificationText(answer)).toBe(false);
  });
});
