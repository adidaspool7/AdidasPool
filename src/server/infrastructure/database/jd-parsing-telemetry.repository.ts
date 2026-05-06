/**
 * JD Parsing Telemetry Repository
 *
 * ONION LAYER: Infrastructure
 * DEPENDENCIES: Supabase admin client (external), domain types (inward)
 *
 * Records one row per `JobRequirementsExtractorService.extract()` call into
 * the `jd_parsing_telemetry` table. Used to monitor success rate, latency,
 * provider/model mix, and error kinds for the JD requirements LLM pipeline.
 *
 * Failure is non-fatal — telemetry must NEVER break the JD parsing flow.
 * All errors are logged and swallowed.
 */

import db from "@server/infrastructure/database/supabase-client";
import { generateId, snakeifyKeys } from "@server/infrastructure/database/db-utils";
import { createLogger } from "@server/infrastructure/logging/logger";

const log = createLogger("jd-parsing-telemetry");

export type JdParsingErrorKind =
  | "rate_limit"
  | "invalid_json"
  | "schema_validation"
  | "llm_empty"
  | "input_too_short"
  | "other";

export interface JdParsingTelemetryEvent {
  jobId?: string | null;
  provider: string;
  model: string;
  success: boolean;
  durationMs: number;
  promptTokens?: number | null;
  completionTokens?: number | null;
  totalTokens?: number | null;
  fallbackUsed: boolean;
  schemaVersion: number;
  inputChars?: number | null;
  errorKind?: JdParsingErrorKind | null;
  errorMessage?: string | null;
}

export class JdParsingTelemetryRepository {
  async record(event: JdParsingTelemetryEvent): Promise<void> {
    try {
      const row = snakeifyKeys({
        id: generateId(),
        ...event,
      });
      const { error } = await db.from("jd_parsing_telemetry").insert(row);
      if (error) {
        log.warn("failed to insert telemetry row", error);
      }
    } catch (err) {
      log.warn("failed to record telemetry", err);
    }
  }
}

export const jdParsingTelemetryRepository = new JdParsingTelemetryRepository();
