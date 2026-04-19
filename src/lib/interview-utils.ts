/**
 * Interview runtime utility functions shared between the runtime page and tests.
 */

export const SUPPORTED_AUDIO_MIME_TYPES = new Set([
  "audio/wav",
  "audio/wave",
  "audio/x-wav",
  "audio/mpeg",
  "audio/mp3",
  "audio/ogg",
  "audio/webm",
  "audio/mp4",
]);

export type AudioPayload =
  | { valid: true; url: string; mimeType: string }
  | { valid: false; reason: "missing" | "invalid-mime" };

/**
 * Validates a base64-encoded audio payload and produces a data URL if playable.
 */
export function buildAudioPayload(
  base64: string | null | undefined,
  mimeType: string | null | undefined
): AudioPayload {
  if (!base64) return { valid: false, reason: "missing" };
  const normalized = (mimeType || "audio/wav").toLowerCase();
  if (!SUPPORTED_AUDIO_MIME_TYPES.has(normalized)) {
    return { valid: false, reason: "invalid-mime" };
  }
  return { valid: true, url: `data:${normalized};base64,${base64}`, mimeType: normalized };
}

/**
 * Formats a number of seconds as MM:SS.
 */
export function formatTime(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

/**
 * Patterns that indicate a user is thinking/stalling rather than answering.
 * These are matched case-insensitively against the full trimmed input.
 */
const THINKING_PATTERNS: RegExp[] = [
  /^(ok|okay|sure|right|alright|fine|got it|noted|understood|yep|yeah|yes|no)[.,!]*$/i,
  /\blet me think\b/i,
  /\bgive me a (moment|second|minute|sec|min)\b/i,
  /\bjust a (moment|second|minute|sec)\b/i,
  /\bone moment\b/i,
  /\blet me consider\b/i,
  /\blet me recall\b/i,
  /\blet me remember\b/i,
  /\bhold on\b/i,
  /\bhmm+\b/i,
  /\buhh*\b/i,
  /\bthinking\b/i,
];

/**
 * Returns true if the user's message is a clarification question (ends with "?")
 * OR a thinking/stalling phrase — both cases where the per-question timer should
 * NOT be reset, since no substantive new answer has been given.
 */
export function isClarificationText(text: string): boolean {
  const t = text.trim();
  if (t.endsWith("?")) return true;
  return THINKING_PATTERNS.some((pattern) => pattern.test(t));
}

/**
 * Fallback message shown in chat when browser STT (SpeechRecognition) is unavailable.
 */
export const STT_FALLBACK_MESSAGE =
  "Speech recognition is not available in this browser. Please type your answers instead. For voice input, use Chrome or Edge.";
