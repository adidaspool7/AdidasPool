/**
 * Database utility helpers for Supabase repositories.
 *
 * camelizeKeys  — converts snake_case column names → camelCase JS properties
 *                 and ISO date strings → Date objects (recursively for relations,
 *                 but NOT inside known JSONB columns).
 * snakeifyKeys  — converts camelCase JS keys → snake_case column names
 *                 (top-level only; JSONB values are left as-is).
 * generateId    — generates a new UUID for use as a PRIMARY KEY.
 */

import { randomUUID } from "crypto";

// ----------------------------------------------------------------
// JSONB column names (camelCase) — do NOT recurse into these values
// ----------------------------------------------------------------
const JSONB_KEYS = new Set([
  "parsedData",
  "evaluationRationale",
  "errorLog",
  "result",
  "breakdown",
  "rawAiResponse",
  "details",
  "parsingConfidence",
  // Phase 1 job-anchored matching: the LLM-extracted JD requirements
  // are JSONB. Must NOT be recursed into — otherwise ISO date strings
  // inside (e.g. rawExtractionTimestamp) get coerced to Date objects
  // and the Zod schema (z.string()) rejects the cache on reload.
  "parsedRequirements",
  // Notification metadata — arbitrary JSON stored for audit/display
  "metadata",
]);

// ----------------------------------------------------------------
// camelizeKeys
// ----------------------------------------------------------------
function toCamel(s: string): string {
  return s.replace(/_([a-z])/g, (_, c: string) => c.toUpperCase());
}

function isIsoDate(val: unknown): val is string {
  return (
    typeof val === "string" &&
    /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/.test(val)
  );
}

export function camelizeKeys<T = Record<string, unknown>>(
  obj: Record<string, unknown>
): T {
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(obj)) {
    const ck = toCamel(k);
    if (v === null || v === undefined) {
      out[ck] = v;
    } else if (isIsoDate(v)) {
      out[ck] = new Date(v);
    } else if (Array.isArray(v)) {
      out[ck] = v.map((item) =>
        item && typeof item === "object" && !Array.isArray(item)
          ? camelizeKeys(item as Record<string, unknown>)
          : item
      );
    } else if (typeof v === "object" && !JSONB_KEYS.has(ck)) {
      out[ck] = camelizeKeys(v as Record<string, unknown>);
    } else {
      out[ck] = v;
    }
  }
  return out as T;
}

// ----------------------------------------------------------------
// snakeifyKeys  (top-level only)
// ----------------------------------------------------------------
function toSnake(s: string): string {
  return s.replace(/([A-Z])/g, (c) => `_${c.toLowerCase()}`);
}

export function snakeifyKeys(
  obj: Record<string, unknown>
): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(obj)) {
    out[toSnake(k)] = v;
  }
  return out;
}

// ----------------------------------------------------------------
// ID generation
// ----------------------------------------------------------------
export function generateId(): string {
  return randomUUID();
}

// ----------------------------------------------------------------
// Supabase error helper — throws on DB error
// ----------------------------------------------------------------
export function assertNoError(
  error: { message: string; code?: string } | null,
  context: string
): void {
  if (error) {
    throw new Error(`[DB:${context}] ${error.message} (code: ${error.code ?? "unknown"})`);
  }
}
