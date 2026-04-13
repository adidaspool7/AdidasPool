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
 * Detect if a user message is a clarification question rather than an answer.
 * Messages ending with "?" are treated as clarifications — the per-question timer
 * is NOT reset on clarification turns.
 */
export function isClarificationText(text: string): boolean {
  const t = text.trim();
  return t.endsWith("?");
}

/**
 * Fallback message shown in chat when browser STT (SpeechRecognition) is unavailable.
 */
export const STT_FALLBACK_MESSAGE =
  "Speech recognition is not available in this browser. Please type your answers instead. For voice input, use Chrome or Edge.";
