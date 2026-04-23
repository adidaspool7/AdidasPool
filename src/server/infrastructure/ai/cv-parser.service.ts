/**
 * LLM CV Parser Service
 *
 * ONION LAYER: Infrastructure
 * DEPENDENCIES: OpenAI SDK (external), domain ports (inward)
 *
 * Implements ICvParserService using the configured LLM provider.
 * Supports Groq (free, Llama 3.3 70B) and OpenAI (paid, GPT-4o-mini).
 *
 * RATE LIMIT RESILIENCE:
 *   1. On 429 → auto-fallback to OpenAI (if OPENAI_API_KEY set)
 *   2. If no fallback available → exponential backoff retry (up to 2 retries)
 *   3. Logs provider switches for observability
 *
 * The domain and application layers never see the LLM provider directly.
 */

import type {
  ICvParserService,
  CvExtractionResult,
  ExperienceRelevanceResult,
} from "@server/domain/ports/services";
import {
  getLLMConfig,
  getFallbackLLMConfig,
  isRateLimitError,
  isQuotaExhaustedError,
  describeLLMError,
  extractRetryAfterMs,
} from "./openai-client";
import type { LLMConfig } from "./openai-client";
import { FIELDS_OF_WORK } from "@client/lib/constants";

const CV_EXTRACTION_PROMPT = `You are a CV/resume parser. Extract structured information from the following CV text.

Return a JSON object with exactly this structure:
{
  "firstName": "string",
  "lastName": "string",
  "email": "string or null",
  "phone": "string or null",
  "location": "city, country or null",
  "country": "country name or null",
  "linkedinUrl": "string or null",
  "experiences": [
    {
      "jobTitle": "string",
      "company": "string or null",
      "location": "string or null",
      "startDate": "YYYY-MM or approximate",
      "endDate": "YYYY-MM or null if current",
      "isCurrent": false,
      "description": "brief summary or null",
      "fieldsOfWork": ["Retail", "Sales"]
    }
  ],
  "education": [
    {
      "institution": "string or null",
      "degree": "string or null",
      "fieldOfStudy": "string or null",
      "startDate": "string or null",
      "endDate": "string or null",
      "level": "HIGH_SCHOOL | BACHELOR | MASTER | PHD | VOCATIONAL | OTHER"
    }
  ],
  "languages": [
    {
      "language": "language name",
      "level": "A1 | A2 | B1 | B2 | C1 | C2 | null"
    }
  ],
  "skills": [
    {
      "name": "skill name",
      "category": "Technical | Soft Skill | Tool | Language | Other"
    }
  ],
  "businessAreaClassification": {
    "primary": "best-fit department from the list below",
    "secondary": ["up to 3 additional relevant departments"],
    "customArea": "free-text area if none of the departments fit, or null",
    "reasoning": "brief explanation of why this classification was chosen"
  },
  "estimatedTotalYears": 5.5,
  "parsingConfidence": {
    "overall": 0.85,
    "name": 0.99,
    "location": 0.70,
    "languages": 0.60,
    "experienceDates": 0.50,
    "flags": ["list of issues, e.g. location_uncertain, missing_language_levels, date_gaps, no_email"]
  }
}

Official departments for businessAreaClassification (pick from this list when possible):
- Brand Management & Communications
- Corporate Services
- Data
- Design
- Digital
- Finance
- General Management & Business Development
- Legal & Regulatory
- Merchandising & Planning
- People & Culture
- Product Development & Operations
- Real Estate & Facilities
- Retail
- Sales
- Supply Chain & Sourcing
- Technology

Rules:
- Extract ALL information present in the CV — do NOT skip any section
- firstName and lastName are REQUIRED — NEVER return null for these. If you cannot clearly identify the name, use your best guess from context (email address, headers, signatures). Only use "Unknown" as a last resort.
- For all other fields, if not found, use null
- For languages, map to CEFR levels if possible (native/fluent = C2, advanced = C1, intermediate = B1-B2, basic = A1-A2)
- For education entries:
  - Include formal degrees (HIGH_SCHOOL, BACHELOR, MASTER, PHD)
  - ALSO include certifications, courses, formations, online courses, bootcamps, and professional training — classify these as VOCATIONAL or OTHER
  - Use the "degree" field for the certificate/course name (e.g. "Architect of Safe Networks", "First Certificate in English", "MATLAB (48h)")
  - Use the "institution" field for the issuing organization (e.g. "Cambridge School", "Ciências e Letras")
  - If the section is titled "Other Courses", "Certifications", "Formations", "Professional Development", or similar — extract every single entry as a separate education item
- Sort experiences by date (most recent first)
- For each experience's "fieldsOfWork": pick 1–3 entries from the SAME official departments list used by businessAreaClassification. Use ONLY those exact strings (case-sensitive). If the experience is clearly unrelated to every field, return an empty array. Do NOT invent new field names.
- For estimatedTotalYears: calculate total professional years from all experiences. Sum the durations. If dates are missing, estimate from context.
- For businessAreaClassification: classify the candidate based on their overall experience and skills into the best-fit department from the official list. If none fits, set the primary to the closest match and fill customArea with a more accurate label.
- For parsingConfidence: honestly assess how confident you are about each extracted field (0.0 to 1.0). Add flags for any uncertainties (e.g. "location_uncertain", "missing_language_levels", "date_gaps", "no_email", "ambiguous_education_level").
- Return ONLY valid JSON, no markdown or extra text`;

export class OpenAiCvParserService implements ICvParserService {
  /** Track whether we've switched to fallback for the current session */
  private usingFallback = false;

  async parseCvText(cvText: string): Promise<CvExtractionResult> {
    const content = await this.callLLMWithResilience(
      CV_EXTRACTION_PROMPT,
      cvText,
      { response_format: { type: "json_object" } as const, temperature: 0.1, max_tokens: 5000 }
    );

    if (!content) {
      throw new Error("LLM returned empty response for CV parsing");
    }

    return JSON.parse(content) as CvExtractionResult;
  }

  /**
   * Phase 2: classify a batch of experiences into canonical Fields of Work.
   * Single LLM call per candidate. Used by the backfill script for
   * candidates whose experiences predate per-experience field tagging.
   */
  async classifyExperienceFields(
    experiences: Array<{
      jobTitle: string;
      company?: string | null;
      description?: string | null;
    }>
  ): Promise<string[][]> {
    if (experiences.length === 0) return [];

    const systemPrompt = `You classify each work experience into one or more canonical Fields of Work.

Official fields (use these EXACT strings, case-sensitive):
${(FIELDS_OF_WORK as readonly string[]).map((f) => `- ${f}`).join("\n")}

Return JSON of the form:
{
  "experiences": [
    { "index": 0, "fieldsOfWork": ["Retail", "Sales"] },
    { "index": 1, "fieldsOfWork": [] }
  ]
}

Rules:
- Pick 1–3 fields per experience from the official list above.
- If the experience is clearly unrelated to every field, return an empty array for that index.
- Do NOT invent new field names. Do NOT rephrase. Use the exact strings.
- Preserve the input order via the "index" field.`;

    const userContent = JSON.stringify(
      experiences.map((e, i) => ({
        index: i,
        jobTitle: e.jobTitle,
        company: e.company ?? null,
        description: e.description ?? null,
      }))
    );

    const content = await this.callLLMWithResilience(
      systemPrompt,
      userContent,
      { response_format: { type: "json_object" } as const, temperature: 0.1, max_tokens: 1000 }
    );
    if (!content) throw new Error("LLM returned empty response for field classification");

    const parsed = JSON.parse(content) as {
      experiences?: Array<{ index: number; fieldsOfWork: unknown }>;
    };
    const allowed = new Set(FIELDS_OF_WORK as readonly string[]);
    const result: string[][] = experiences.map(() => []);
    for (const row of parsed.experiences ?? []) {
      if (typeof row.index !== "number" || row.index < 0 || row.index >= experiences.length) continue;
      const arr = Array.isArray(row.fieldsOfWork) ? row.fieldsOfWork : [];
      result[row.index] = arr
        .filter((x): x is string => typeof x === "string")
        .map((x) => (FIELDS_OF_WORK as readonly string[]).find((f) => f.toLowerCase() === x.toLowerCase()))
        .filter((x): x is string => !!x && allowed.has(x));
    }
    return result;
  }

  async classifyExperienceRelevance(
    experience: {
      jobTitle: string;
      company?: string | null;
      description?: string | null;
    },
    targetRoleType: string = "customer service"
  ): Promise<ExperienceRelevanceResult> {
    const systemPrompt = `You are an HR analyst. Rate how relevant this work experience is for a "${targetRoleType}" role. Return JSON: { "score": 0-100, "reason": "brief explanation" }`;
    const userContent = `Job Title: ${experience.jobTitle}\nCompany: ${experience.company || "N/A"}\nDescription: ${experience.description || "N/A"}`;

    try {
      const content = await this.callLLMWithResilience(
        systemPrompt,
        userContent,
        { response_format: { type: "json_object" } as const, temperature: 0.2, max_tokens: 200 }
      );

      if (!content) {
        return { score: 0, reason: "Failed to classify" };
      }

      const result = JSON.parse(content);
      return {
        score: Math.min(100, Math.max(0, result.score ?? 0)),
        reason: result.reason ?? "No reason provided",
      };
    } catch {
      return { score: 0, reason: "Failed to classify (rate limited)" };
    }
  }

  // ─── Resilient LLM call with fallback + retry ─────────────────

  /**
   * Calls the LLM with automatic fallback and retry on rate limits:
   *   1. Try primary provider (Groq)
   *   2. On 429 → try fallback (OpenAI) if available
   *   3. If no fallback → wait and retry with exponential backoff (max 2 retries)
   */
  private async callLLMWithResilience(
    systemPrompt: string,
    userContent: string,
    options: { response_format: { type: "json_object" }; temperature: number; max_tokens: number }
  ): Promise<string | null> {
    const MAX_RETRIES = 2;

    // If we already know primary is rate-limited this session, try fallback first
    const config = this.usingFallback
      ? (getFallbackLLMConfig() ?? getLLMConfig())
      : getLLMConfig();

    try {
      return await this.doLLMCall(config, systemPrompt, userContent, options);
    } catch (error) {
      if (!isRateLimitError(error)) throw error;

      console.warn(
        `[CV Parser] Rate limit hit on ${config.provider}. Attempting fallback/retry...`
      );

      // Strategy 1: Try fallback provider (Groq → OpenAI)
      const fallback = getFallbackLLMConfig();
      if (fallback && !this.usingFallback) {
        this.usingFallback = true;
        console.log(
          `[CV Parser] Switching to fallback provider: ${fallback.provider} (${fallback.model})`
        );
        try {
          return await this.doLLMCall(fallback, systemPrompt, userContent, options);
        } catch (fallbackError) {
          // Log the actual fallback error for diagnosis
          console.warn(
            `[CV Parser] Fallback provider error: ${describeLLMError(fallbackError)}`
          );
          // If it's a quota/billing error, don't retry — it's permanent
          if (isQuotaExhaustedError(fallbackError)) {
            throw new Error(
              `${fallback.provider} quota exhausted (no credits). Add billing at https://platform.openai.com/settings/organization/billing`
            );
          }
          if (!isRateLimitError(fallbackError)) throw fallbackError;
          // Both providers rate-limited — fall through to retry with backoff
          console.warn(`[CV Parser] Fallback provider also rate-limited.`);
        }
      }

      // Strategy 2: Exponential backoff retry on primary/fallback
      const retryConfig = fallback ?? config;
      for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
        const delayMs = Math.min(
          extractRetryAfterMs(error),
          30_000 // Cap at 30s per retry to avoid extremely long waits
        );
        console.log(
          `[CV Parser] Retry ${attempt}/${MAX_RETRIES} on ${retryConfig.provider} after ${(delayMs / 1000).toFixed(1)}s...`
        );
        await this.sleep(delayMs * attempt); // exponential: delay * attempt

        try {
          return await this.doLLMCall(retryConfig, systemPrompt, userContent, options);
        } catch (retryError) {
          if (isQuotaExhaustedError(retryError)) {
            throw new Error(
              `${retryConfig.provider} quota exhausted. ${describeLLMError(retryError)}`
            );
          }
          if (!isRateLimitError(retryError)) throw retryError;
          if (attempt === MAX_RETRIES) {
            throw new Error(
              `LLM rate limit exceeded after ${MAX_RETRIES} retries on ${retryConfig.provider}. ` +
              `Original error: ${error instanceof Error ? error.message : String(error)}`
            );
          }
        }
      }

      throw error; // Should not reach here
    }
  }

  private async doLLMCall(
    config: LLMConfig,
    systemPrompt: string,
    userContent: string,
    options: { response_format: { type: "json_object" }; temperature: number; max_tokens: number }
  ): Promise<string | null> {
    const response = await config.client.chat.completions.create({
      model: config.model,
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userContent },
      ],
      ...options,
    });

    return response.choices[0]?.message?.content ?? null;
  }

  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}
