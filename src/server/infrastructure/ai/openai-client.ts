/**
 * LLM Client Singleton (Lazy-loaded)
 *
 * ONION LAYER: Infrastructure
 * DEPENDENCIES: openai (external — SDK is compatible with Groq, OpenAI, etc.)
 *
 * Provider auto-detection (with fallback chain):
 *   1. GROQ_API_KEY set   → Groq (free tier, Llama 3.3 70B)  — PRIMARY
 *   2. OPENAI_API_KEY set → OpenAI (paid, GPT-4o-mini)        — FALLBACK
 *
 * When Groq hits rate limits (429), the system auto-falls back to OpenAI
 * if OPENAI_API_KEY is available. Both providers use the OpenAI SDK.
 * Lazy initialization prevents build-time errors when keys are missing.
 */

import OpenAI from "openai";

export type LLMProvider = "groq" | "openai";

export interface LLMConfig {
  provider: LLMProvider;
  client: OpenAI;
  /** Model name to use for chat completions */
  model: string;
}

const globalForLLM = globalThis as unknown as {
  llmConfig: LLMConfig | undefined;
  fallbackConfig: LLMConfig | undefined;
};

function buildGroqConfig(): LLMConfig | null {
  if (!process.env.GROQ_API_KEY) return null;
  return {
    provider: "groq",
    model: "llama-3.3-70b-versatile",
    client: new OpenAI({
      apiKey: process.env.GROQ_API_KEY,
      baseURL: "https://api.groq.com/openai/v1",
    }),
  };
}

function buildOpenAIConfig(): LLMConfig | null {
  if (!process.env.OPENAI_API_KEY) return null;
  return {
    provider: "openai",
    model: "gpt-4o-mini",
    client: new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    }),
  };
}

function resolveLLMConfig(): LLMConfig {
  const groq = buildGroqConfig();
  if (groq) return groq;

  const openai = buildOpenAIConfig();
  if (openai) return openai;

  throw new Error(
    "No LLM API key found. Set GROQ_API_KEY (free) or OPENAI_API_KEY in your .env.local file.\n" +
      "Get a free Groq key at: https://console.groq.com/keys"
  );
}

export function getLLMConfig(): LLMConfig {
  if (!globalForLLM.llmConfig) {
    globalForLLM.llmConfig = resolveLLMConfig();
    console.log(`[LLM] Primary provider: ${globalForLLM.llmConfig.provider} (model: ${globalForLLM.llmConfig.model})`);
  }
  return globalForLLM.llmConfig;
}

/**
 * Returns the fallback LLM config (OpenAI) when primary (Groq) is rate-limited.
 * Returns null if no fallback is available or primary is already OpenAI.
 */
export function getFallbackLLMConfig(): LLMConfig | null {
  const primary = getLLMConfig();
  // Only fallback from Groq → OpenAI, not the other way
  if (primary.provider !== "groq") return null;

  if (!globalForLLM.fallbackConfig) {
    const openai = buildOpenAIConfig();
    if (openai) {
      globalForLLM.fallbackConfig = openai;
      console.log(`[LLM] Fallback provider ready: ${openai.provider} (model: ${openai.model})`);
    }
  }
  return globalForLLM.fallbackConfig ?? null;
}

/**
 * Check if an error is a rate limit (429) error.
 * Distinguishes temporary rate limits from permanent quota exhaustion.
 */
export function isRateLimitError(error: unknown): boolean {
  if (error instanceof OpenAI.APIError) {
    return error.status === 429;
  }
  // Fallback: check message string
  if (error instanceof Error) {
    return error.message.includes("429") || error.message.toLowerCase().includes("rate limit");
  }
  return false;
}

/**
 * Check if a 429 error is specifically about insufficient quota (no credits).
 * These are permanent — retrying won't help.
 */
export function isQuotaExhaustedError(error: unknown): boolean {
  const message = error instanceof Error ? error.message : String(error);
  return (
    message.toLowerCase().includes("insufficient_quota") ||
    message.toLowerCase().includes("billing") ||
    message.toLowerCase().includes("exceeded your current quota") ||
    message.toLowerCase().includes("you exceeded")
  );
}

/**
 * Get a human-readable description of an LLM API error for logging.
 */
export function describeLLMError(error: unknown): string {
  if (error instanceof OpenAI.APIError) {
    return `[${error.status}] ${error.message}`;
  }
  if (error instanceof Error) {
    return error.message;
  }
  return String(error);
}

/**
 * Extract retry-after delay (in ms) from a rate limit error.
 * Parses the "Please try again in Xm Y.Zs" message from Groq.
 * Returns a default of 10s if parsing fails.
 */
export function extractRetryAfterMs(error: unknown): number {
  const DEFAULT_RETRY_MS = 10_000;

  const message = error instanceof Error ? error.message : String(error);

  // Match "try again in 6m46.08s" or "try again in 3m32.543999999s"
  const match = message.match(/try again in (?:(\d+)m)?(\d+(?:\.\d+)?)s/i);
  if (match) {
    const minutes = parseInt(match[1] || "0", 10);
    const seconds = parseFloat(match[2] || "0");
    return (minutes * 60 + seconds) * 1000;
  }

  // Check for Retry-After header (in seconds) from OpenAI.APIError
  if (error instanceof OpenAI.APIError) {
    const headers = error.headers;
    const retryAfter = headers?.["retry-after"];
    if (retryAfter) {
      const seconds = parseFloat(retryAfter);
      if (!isNaN(seconds)) return seconds * 1000;
    }
  }

  return DEFAULT_RETRY_MS;
}

/** @deprecated Use getLLMConfig() instead */
export function getOpenAIClient(): OpenAI {
  return getLLMConfig().client;
}

export default getOpenAIClient;
