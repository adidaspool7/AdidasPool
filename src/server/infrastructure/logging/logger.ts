/**
 * Server-side logger wrapper (audit M2).
 *
 * Goals:
 * - Single chokepoint for all server logs so they can be silenced or
 *   re-routed (e.g. to a future structured sink) without touching call sites.
 * - Cheap PII redaction for known-sensitive shapes (email addresses, JWT-ish
 *   tokens, Bearer headers, long base64 blobs that often hold CV text).
 * - Levelled output that respects LOG_LEVEL / NODE_ENV so production logs
 *   stay terse and the test runner stays quiet by default.
 *
 * Usage:
 *   import { createLogger } from "@server/infrastructure/logging/logger";
 *   const log = createLogger("CV Parser");
 *   log.warn("rate limit", { provider });   // -> [CV Parser] rate limit { provider }
 *
 * The log methods accept the same variadic args as `console.*` for an easy
 * drop-in migration; redaction is applied to each argument.
 */

type Level = "debug" | "info" | "warn" | "error";

const LEVELS: Record<Level, number> = {
  debug: 10,
  info: 20,
  warn: 30,
  error: 40,
};

function resolveMinLevel(): Level {
  const explicit = (process.env.LOG_LEVEL ?? "").toLowerCase();
  if (explicit in LEVELS) return explicit as Level;
  if (process.env.NODE_ENV === "test") return "warn";
  if (process.env.NODE_ENV === "production") return "info";
  return "debug";
}

const minLevel: Level = resolveMinLevel();
const minLevelValue = LEVELS[minLevel];

// Common PII / secret patterns. Conservative on purpose — this is the
// hot-path scrubber, not a full DLP system.
const EMAIL_RE = /[\w.+-]+@[\w-]+\.[\w.-]+/g;
// Bearer/Authorization headers and bare JWT-ish triplets
const BEARER_RE = /Bearer\s+[A-Za-z0-9._\-]+/gi;
const JWT_RE = /\beyJ[A-Za-z0-9_\-]{8,}\.[A-Za-z0-9_\-]{8,}\.[A-Za-z0-9_\-]{8,}\b/g;
// Long base64-ish blobs (likely encoded CV/file payloads, > 256 chars)
const LONG_BASE64_RE = /\b[A-Za-z0-9+/=]{256,}\b/g;

function redactString(s: string): string {
  return s
    .replace(BEARER_RE, "Bearer [REDACTED]")
    .replace(JWT_RE, "[REDACTED_JWT]")
    .replace(EMAIL_RE, "[REDACTED_EMAIL]")
    .replace(LONG_BASE64_RE, "[REDACTED_BLOB]");
}

const SENSITIVE_KEY_RE = /(token|secret|password|authorization|api[_-]?key|cookie)/i;

function redactValue(value: unknown, depth = 0): unknown {
  if (depth > 4) return "[Truncated]";
  if (value == null) return value;
  if (typeof value === "string") return redactString(value);
  if (value instanceof Error) {
    return {
      name: value.name,
      message: redactString(value.message),
      // Stack often contains source paths; keep but redact.
      stack: value.stack ? redactString(value.stack) : undefined,
    };
  }
  if (Array.isArray(value)) {
    return value.map((v) => redactValue(v, depth + 1));
  }
  if (typeof value === "object") {
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
      if (SENSITIVE_KEY_RE.test(k)) {
        out[k] = "[REDACTED]";
      } else {
        out[k] = redactValue(v, depth + 1);
      }
    }
    return out;
  }
  return value;
}

function emit(level: Level, scope: string, args: unknown[]): void {
  if (LEVELS[level] < minLevelValue) return;
  const prefix = `[${scope}]`;
  const sanitized = args.map((a) => redactValue(a));
  // Map to the matching console method so existing log streams (Vercel,
  // local) keep level colouring/severity routing.
  switch (level) {
    case "debug":
      // eslint-disable-next-line no-console
      console.debug(prefix, ...sanitized);
      return;
    case "info":
      // eslint-disable-next-line no-console
      console.log(prefix, ...sanitized);
      return;
    case "warn":
      // eslint-disable-next-line no-console
      console.warn(prefix, ...sanitized);
      return;
    case "error":
      // eslint-disable-next-line no-console
      console.error(prefix, ...sanitized);
      return;
  }
}

export interface Logger {
  debug(...args: unknown[]): void;
  info(...args: unknown[]): void;
  warn(...args: unknown[]): void;
  error(...args: unknown[]): void;
}

export function createLogger(scope: string): Logger {
  return {
    debug: (...args) => emit("debug", scope, args),
    info: (...args) => emit("info", scope, args),
    warn: (...args) => emit("warn", scope, args),
    error: (...args) => emit("error", scope, args),
  };
}

// Exported for unit tests only.
export const __internal = { redactValue, redactString };
