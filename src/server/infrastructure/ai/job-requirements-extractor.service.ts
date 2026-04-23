/**
 * Job Requirements Extractor Service
 *
 * ONION LAYER: Infrastructure
 * DEPENDENCIES: OpenAI SDK (external), domain schema (inward)
 *
 * Extracts structured hiring requirements from a raw job description using the
 * configured LLM (Groq primary, OpenAI fallback).
 *
 * Phase 1 of docs/JOB_ANCHORED_MATCHING_PLAN.md.
 *
 * Contract:
 *   - Input: JD plain text (boilerplate stripped).
 *   - Output: JobRequirements conforming to JobRequirementsSchema.
 *   - On LLM failure or invalid JSON → throws. Caller decides policy
 *     (skip / retry / store error).
 *
 * Prompt invariant: every numeric field MUST be null if not explicitly stated.
 */

import {
  JobRequirementsSchema,
  JOB_REQUIREMENTS_SCHEMA_VERSION,
  type JobRequirements,
} from "@server/domain/services/job-requirements.schema";
import { FIELDS_OF_WORK } from "@/client/lib/constants";
import {
  getLLMConfig,
  getFallbackLLMConfig,
  isRateLimitError,
  describeLLMError,
} from "./openai-client";
import type { LLMConfig } from "./openai-client";

const SYSTEM_PROMPT = `You are a recruitment analyst. Extract structured hiring requirements from the job description below.

Return a JSON object with EXACTLY these keys:
{
  "fieldsOfWork": string[],                 // subset of the allowed list
  "seniorityLevel": "INTERN" | "JUNIOR" | "MID" | "SENIOR" | "LEAD" | "DIRECTOR" | null,
  "minYearsInField": number | null,         // integer years if explicitly stated, else null
  "requiredSkills": string[],               // hard requirements only
  "preferredSkills": string[],              // "nice to have" / "preferred"
  "requiredLanguages": [{ "language": "English", "cefr": "B2" | "A1"..."C2" | null }],
  "requiredEducationLevel": "HIGH_SCHOOL" | "VOCATIONAL" | "BACHELOR" | "MASTER" | "PHD" | "OTHER" | null,
  "responsibilitiesSummary": string | null  // one or two sentences max
}

ALLOWED fieldsOfWork VALUES (pick zero or more that best match the role — do NOT invent others):
${FIELDS_OF_WORK.map((f) => `  - "${f}"`).join("\n")}

CRITICAL RULES:
  1. If a field is not explicitly stated in the JD, return null (for scalars) or [] (for arrays).
     NEVER guess or infer numeric values. "Entry-level" does NOT imply 0 years; leave minYearsInField null.
  2. seniorityLevel: only set if the JD clearly uses words like "intern", "junior", "mid-level",
     "senior", "lead", "principal", "director", "VP", etc. Otherwise null.
  3. requiredSkills vs preferredSkills:
     - "required", "must have", "essential" → requiredSkills
     - "preferred", "nice to have", "bonus", "ideally" → preferredSkills
  4. requiredLanguages: only include languages the JD explicitly asks for. CEFR level only if
     the JD names it (e.g. "B2 English"). "Fluent" or "native" → cefr: null (don't guess).
  5. Return valid JSON. No commentary.`;

export class JobRequirementsExtractorService {
  /**
   * Strip boilerplate (copyright, equal-opportunity blurbs, navigation) from a
   * JD body. Heuristic — good enough for input size reduction before the LLM.
   * Caller can pass either raw text or already-stripped text.
   */
  static stripBoilerplate(text: string): string {
    let out = text.replace(/\r\n/g, "\n").replace(/\t/g, " ");

    // Collapse whitespace
    out = out.replace(/[ \u00a0]{2,}/g, " ").replace(/\n{3,}/g, "\n\n");

    // Drop very common adidas EEO / closing blurbs below this line (case-insensitive)
    const cutMarkers = [
      /at adidas[, ]we believe/i,
      /equal[- ]opportunity employer/i,
      /we celebrate diversity/i,
      /adidas is an equal[- ]opportunity/i,
      /adidas does not accept unsolicited/i,
      /agency referrals? are not accepted/i,
    ];
    for (const marker of cutMarkers) {
      const match = out.search(marker);
      if (match > 200) {
        out = out.slice(0, match);
      }
    }

    return out.trim();
  }

  /**
   * Extract requirements from a JD body. Throws on failure (rate limits after
   * one fallback attempt, invalid JSON, schema validation error).
   */
  async extract(jdText: string): Promise<JobRequirements> {
    const cleaned = JobRequirementsExtractorService.stripBoilerplate(jdText);
    if (cleaned.length < 50) {
      throw new Error(
        `Job description too short to extract (${cleaned.length} chars).`
      );
    }

    // Truncate extremely long JDs — Groq free tier has token limits.
    const MAX_INPUT_CHARS = 12_000;
    const input =
      cleaned.length > MAX_INPUT_CHARS
        ? cleaned.slice(0, MAX_INPUT_CHARS)
        : cleaned;

    const primary = getLLMConfig();
    let config = primary;
    let raw: string | null;

    try {
      raw = await this.callLLM(config, input);
    } catch (err) {
      if (!isRateLimitError(err)) throw err;
      const fallback = getFallbackLLMConfig();
      if (!fallback) {
        throw new Error(
          `Job requirements extraction failed: ${describeLLMError(err)}`
        );
      }
      console.warn(
        `[JobRequirementsExtractor] Rate-limited on ${primary.provider}; trying ${fallback.provider}.`
      );
      config = fallback;
      raw = await this.callLLM(config, input);
    }

    if (!raw) {
      throw new Error("LLM returned empty response.");
    }

    let parsed: unknown;
    try {
      parsed = JSON.parse(raw);
    } catch {
      throw new Error(
        `LLM returned invalid JSON (first 200 chars): ${raw.slice(0, 200)}`
      );
    }

    // Fill provenance before schema parse so defaults aren't overwritten
    const withProvenance = {
      ...(parsed as Record<string, unknown>),
      rawExtractionModel: `${config.provider}:${config.model}`,
      rawExtractionTimestamp: new Date().toISOString(),
    };

    const result = JobRequirementsSchema.safeParse(withProvenance);
    if (!result.success) {
      throw new Error(
        `LLM output failed schema validation: ${result.error.message}`
      );
    }
    return result.data;
  }

  /** Exposed for callers that want to record the schema version in DB. */
  get schemaVersion(): number {
    return JOB_REQUIREMENTS_SCHEMA_VERSION;
  }

  private async callLLM(
    config: LLMConfig,
    userContent: string
  ): Promise<string | null> {
    const response = await config.client.chat.completions.create({
      model: config.model,
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        { role: "user", content: userContent },
      ],
      response_format: { type: "json_object" },
      temperature: 0.1,
      max_tokens: 1500,
    });
    return response.choices[0]?.message?.content ?? null;
  }
}
