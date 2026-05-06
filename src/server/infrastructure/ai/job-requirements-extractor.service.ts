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
import { FIELDS_OF_WORK } from "@server/domain/value-objects/fields-of-work";
import {
  getLLMConfig,
  getFallbackLLMConfig,
  isRateLimitError,
  describeLLMError,
} from "./openai-client";
import type { LLMConfig } from "./openai-client";
import {
  jdParsingTelemetryRepository,
  type JdParsingErrorKind,
} from "@server/infrastructure/database/jd-parsing-telemetry.repository";

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

=== LANGUAGE OF INPUT vs OUTPUT ===
The job description may be written in any language (English, Portuguese, Spanish,
French, German, Italian, etc.). Read it natively in whatever language it’s in.
ALL output strings (skills, responsibilitiesSummary, language names) MUST be
written in English. Translate as needed.
  - "Atendimento ao cliente" → "Customer service"
  - "Gestión de inventario" → "Inventory management"
  - "Travail en équipe" → "Teamwork"
  - "Kassensystem" → "POS systems"

=== EDUCATION-LEVEL NORMALIZATION (multilingual) ===
Map localized education terms to the canonical English enum value:
  - "Licenciatura" / "Bacharelado" / "Bachillerato Universitario" / "Licence" / "Diplom" / "Laurea triennale" → BACHELOR
  - "Mestrado" / "Maestría" / "Master" / "Máster" / "Diplom (FH/Univ)" / "Laurea magistrale" → MASTER
  - "Doutorado" / "Doctorado" / "Doctorat" / "Promotion" / "PhD" → PHD
  - "Ensino Médio" / "Bachiller" (Spain secondary) / "Baccalauréat" / "Abitur" / "High school diploma" → HIGH_SCHOOL
  - "Técnico" / "Formação profissional" / "FP" / "BTS" / "Ausbildung" / "Vocational training" → VOCATIONAL
Return null if no education requirement is stated.

=== LANGUAGE-REQUIREMENT MAPPING ===
When the JD lists a foreign-language requirement in another language, normalize
the LANGUAGE NAME to English and capture the CEFR level if explicitly stated:
  - "B2 inglés" → { "language": "English", "cefr": "B2" }
  - "Inglês avançado" → { "language": "English", "cefr": "C1" }
  - "Inglês intermediário" → { "language": "English", "cefr": "B1" }
  - "Anglais courant" / "Englisch fließend" → { "language": "English", "cefr": null }
  - "Español nativo" → { "language": "Spanish", "cefr": null }
Do NOT include the local working language (e.g. don’t list "Portuguese" for a Brazil-based JD)
unless it is explicitly stated as a requirement.

=== TITLE-BASED SENIORITY HINTS (only when JD body is silent) ===
If the JD body itself doesn’t name a seniority but the job TITLE clearly does,
use the title as a fallback signal:
  - title contains "Intern" / "Trainee" / "Praktikant" / "Estagiário" / "Stagiaire" / "Becario" / "Alternance" → INTERN
  - title contains "Junior" / "Jr." → JUNIOR
  - title contains "Senior" / "Sr." → SENIOR
  - title contains "Lead" / "Principal" → LEAD
  - title contains "Manager" / "Director" / "Head of" / "VP" → DIRECTOR
If neither body nor title gives a clear signal, return null.

=== SECTIONLESS JOB DESCRIPTIONS ===
Many adidas postings (especially retail and regional roles) have NO explicit
"Requirements" / "Qualifications" / "Languages" section — only a responsibilities
block. In that case:
  - Infer requiredSkills from the verbs and nouns describing day-to-day duties.
    "Operate the POS system and handle returns" → ["POS systems", "Returns handling"].
    "Coach team members on visual standards" → ["Team coaching", "Visual merchandising"].
  - Leave preferredSkills as [] unless the JD literally says "preferred" / "a plus" / etc.
  - Leave minYearsInField, requiredEducationLevel, requiredLanguages as null/[]
    unless the JD explicitly states them. Do NOT invent.
  - Still try to set fieldsOfWork from the canonical list based on the role context.

CRITICAL RULES:
  1. If a field is not explicitly stated AND cannot be inferred per the
     sectionless rules above, return null (for scalars) or [] (for arrays).
     NEVER invent numeric values. "Entry-level" does NOT imply 0 years; leave minYearsInField null.
  2. requiredSkills vs preferredSkills:
     - "required", "must have", "essential", "obrigatório", "imprescindible", "erforderlich" → requiredSkills
     - "preferred", "nice to have", "bonus", "ideally", "deseable", "plus", "souhaité", "wünschenswert" → preferredSkills
  3. requiredLanguages: only include languages the JD explicitly asks for. CEFR level only if
     the JD names it explicitly OR maps cleanly per the table above.
  4. responsibilitiesSummary: write it in English, one or two sentences max, even if input was non-English.
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
   *
   * @param jdText The job description body (already scraped and chrome-stripped).
   * @param jobTitle Optional. When provided, the title is shown to the LLM as
   *                 context so the title-based seniority hint can fire on
   *                 sectionless postings (e.g. "Junior Designer" → JUNIOR).
   * @param jobId Optional. When provided, the per-call telemetry row is linked
   *              to the originating job (FK to jobs.id, ON DELETE CASCADE).
   */
  async extract(
    jdText: string,
    jobTitle?: string,
    jobId?: string
  ): Promise<JobRequirements> {
    const startedAt = Date.now();
    const cleaned = JobRequirementsExtractorService.stripBoilerplate(jdText);
    if (cleaned.length < 50) {
      const msg = `Job description too short to extract (${cleaned.length} chars).`;
      void jdParsingTelemetryRepository.record({
        jobId: jobId ?? null,
        provider: "n/a",
        model: "n/a",
        success: false,
        durationMs: Date.now() - startedAt,
        fallbackUsed: false,
        schemaVersion: JOB_REQUIREMENTS_SCHEMA_VERSION,
        inputChars: cleaned.length,
        errorKind: "input_too_short",
        errorMessage: msg,
      });
      throw new Error(msg);
    }

    // Truncate extremely long JDs — Groq free tier has token limits.
    const MAX_INPUT_CHARS = 12_000;
    const body =
      cleaned.length > MAX_INPUT_CHARS
        ? cleaned.slice(0, MAX_INPUT_CHARS)
        : cleaned;
    const input = jobTitle
      ? `JOB TITLE: ${jobTitle.trim()}\n\n--- JOB DESCRIPTION ---\n${body}`
      : body;

    const primary = getLLMConfig();
    let config = primary;
    let fallbackUsed = false;
    let llmResult: { raw: string | null; usage: LLMUsage | null };

    try {
      llmResult = await this.callLLM(config, input);
    } catch (err) {
      if (!isRateLimitError(err)) {
        void this.recordFailure({
          jobId,
          config,
          startedAt,
          fallbackUsed: false,
          inputChars: body.length,
          errorKind: "rate_limit_or_other",
          err,
        });
        throw err;
      }
      const fallback = getFallbackLLMConfig();
      if (!fallback) {
        const msg = `Job requirements extraction failed: ${describeLLMError(err)}`;
        void this.recordFailure({
          jobId,
          config,
          startedAt,
          fallbackUsed: false,
          inputChars: body.length,
          errorKind: "rate_limit_or_other",
          err: new Error(msg),
        });
        throw new Error(msg);
      }
      console.warn(
        `[JobRequirementsExtractor] Rate-limited on ${primary.provider}; trying ${fallback.provider}.`
      );
      config = fallback;
      fallbackUsed = true;
      try {
        llmResult = await this.callLLM(config, input);
      } catch (fallbackErr) {
        void this.recordFailure({
          jobId,
          config,
          startedAt,
          fallbackUsed: true,
          inputChars: body.length,
          errorKind: "rate_limit_or_other",
          err: fallbackErr,
        });
        throw fallbackErr;
      }
    }

    const { raw, usage } = llmResult;

    if (!raw) {
      void this.recordFailure({
        jobId,
        config,
        startedAt,
        fallbackUsed,
        inputChars: body.length,
        errorKind: "llm_empty",
        err: new Error("LLM returned empty response."),
        usage,
      });
      throw new Error("LLM returned empty response.");
    }

    let parsed: unknown;
    try {
      parsed = JSON.parse(raw);
    } catch {
      const msg = `LLM returned invalid JSON (first 200 chars): ${raw.slice(0, 200)}`;
      void this.recordFailure({
        jobId,
        config,
        startedAt,
        fallbackUsed,
        inputChars: body.length,
        errorKind: "invalid_json",
        err: new Error(msg),
        usage,
      });
      throw new Error(msg);
    }

    // Fill provenance before schema parse so defaults aren't overwritten
    const withProvenance = {
      ...(parsed as Record<string, unknown>),
      rawExtractionModel: `${config.provider}:${config.model}`,
      rawExtractionTimestamp: new Date().toISOString(),
    };

    const result = JobRequirementsSchema.safeParse(withProvenance);
    if (!result.success) {
      const msg = `LLM output failed schema validation: ${result.error.message}`;
      void this.recordFailure({
        jobId,
        config,
        startedAt,
        fallbackUsed,
        inputChars: body.length,
        errorKind: "schema_validation",
        err: new Error(msg),
        usage,
      });
      throw new Error(msg);
    }

    void jdParsingTelemetryRepository.record({
      jobId: jobId ?? null,
      provider: config.provider,
      model: config.model,
      success: true,
      durationMs: Date.now() - startedAt,
      promptTokens: usage?.promptTokens ?? null,
      completionTokens: usage?.completionTokens ?? null,
      totalTokens: usage?.totalTokens ?? null,
      fallbackUsed,
      schemaVersion: JOB_REQUIREMENTS_SCHEMA_VERSION,
      inputChars: body.length,
      errorKind: null,
      errorMessage: null,
    });

    return result.data;
  }

  /** Exposed for callers that want to record the schema version in DB. */
  get schemaVersion(): number {
    return JOB_REQUIREMENTS_SCHEMA_VERSION;
  }

  private recordFailure(args: {
    jobId?: string;
    config: LLMConfig;
    startedAt: number;
    fallbackUsed: boolean;
    inputChars: number;
    errorKind:
      | "invalid_json"
      | "schema_validation"
      | "llm_empty"
      | "rate_limit_or_other";
    err: unknown;
    usage?: LLMUsage | null;
  }): Promise<void> {
    const message =
      args.err instanceof Error ? args.err.message : String(args.err);
    const kind: JdParsingErrorKind =
      args.errorKind === "rate_limit_or_other"
        ? isRateLimitError(args.err)
          ? "rate_limit"
          : "other"
        : args.errorKind;
    return jdParsingTelemetryRepository.record({
      jobId: args.jobId ?? null,
      provider: args.config.provider,
      model: args.config.model,
      success: false,
      durationMs: Date.now() - args.startedAt,
      promptTokens: args.usage?.promptTokens ?? null,
      completionTokens: args.usage?.completionTokens ?? null,
      totalTokens: args.usage?.totalTokens ?? null,
      fallbackUsed: args.fallbackUsed,
      schemaVersion: JOB_REQUIREMENTS_SCHEMA_VERSION,
      inputChars: args.inputChars,
      errorKind: kind,
      errorMessage: message.slice(0, 500),
    });
  }

  private async callLLM(
    config: LLMConfig,
    userContent: string
  ): Promise<{ raw: string | null; usage: LLMUsage | null }> {
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
    const raw = response.choices[0]?.message?.content ?? null;
    const u = response.usage;
    const usage: LLMUsage | null = u
      ? {
          promptTokens: u.prompt_tokens ?? null,
          completionTokens: u.completion_tokens ?? null,
          totalTokens: u.total_tokens ?? null,
        }
      : null;
    return { raw, usage };
  }
}

interface LLMUsage {
  promptTokens: number | null;
  completionTokens: number | null;
  totalTokens: number | null;
}
