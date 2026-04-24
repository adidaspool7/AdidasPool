/**
 * Supabase Scoring Weights Repository
 *
 * ONION LAYER: Infrastructure
 * REPLACES: PrismaScoringWeightsRepository
 */

import db from "./supabase-client";
import { camelizeKeys, assertNoError } from "./db-utils";
import type {
  IScoringWeightsRepository,
  ScoringWeightsData,
} from "@server/domain/ports/repositories";
import { CV_SCORING_WEIGHTS } from "@server/domain/value-objects";

const DEFAULT_ID = "default";

export class SupabaseScoringWeightsRepository
  implements IScoringWeightsRepository
{
  async get(): Promise<ScoringWeightsData> {
    const { data, error } = await db
      .from("scoring_weights")
      .select("*")
      .eq("id", DEFAULT_ID)
      .single();

    if (error || !data) {
      return {
        experience: CV_SCORING_WEIGHTS.experience,
        yearsOfExperience: CV_SCORING_WEIGHTS.yearsOfExperience,
        educationLevel: CV_SCORING_WEIGHTS.educationLevel,
        locationMatch: CV_SCORING_WEIGHTS.locationMatch,
        language: CV_SCORING_WEIGHTS.language,
        requiredSkillThreshold: 0.5,
        presetName: "Default",
        updatedBy: null,
        updatedAt: new Date(),
      };
    }

    const row = camelizeKeys<any>(data as Record<string, unknown>);
    return {
      experience: row.experience,
      yearsOfExperience: row.yearsOfExperience,
      educationLevel: row.educationLevel,
      locationMatch: row.locationMatch,
      language: row.language,
      requiredSkillThreshold:
        typeof row.requiredSkillThreshold === "number" ? row.requiredSkillThreshold : 0.5,
      presetName: row.presetName ?? null,
      updatedBy: row.updatedBy ?? null,
      updatedAt: row.updatedAt,
    };
  }

  async upsert(weights: {
    experience: number;
    yearsOfExperience: number;
    educationLevel: number;
    locationMatch: number;
    language: number;
    requiredSkillThreshold?: number;
    presetName?: string | null;
    updatedBy?: string | null;
  }): Promise<ScoringWeightsData> {
    const payload: Record<string, unknown> = {
      id: DEFAULT_ID,
      experience: weights.experience,
      years_of_experience: weights.yearsOfExperience,
      education_level: weights.educationLevel,
      location_match: weights.locationMatch,
      language: weights.language,
      preset_name: weights.presetName ?? null,
      updated_by: weights.updatedBy ?? null,
    };
    if (typeof weights.requiredSkillThreshold === "number") {
      payload.required_skill_threshold = weights.requiredSkillThreshold;
    }

    // Try update first, then insert
    const { data: existing } = await db
      .from("scoring_weights")
      .select("id")
      .eq("id", DEFAULT_ID)
      .single();

    let row: Record<string, unknown>;

    if (existing) {
      const { data, error } = await db
        .from("scoring_weights")
        .update(payload)
        .eq("id", DEFAULT_ID)
        .select()
        .single();
      assertNoError(error, "scoringWeights.upsert.update");
      row = data as Record<string, unknown>;
    } else {
      const { data, error } = await db
        .from("scoring_weights")
        .insert(payload)
        .select()
        .single();
      assertNoError(error, "scoringWeights.upsert.insert");
      row = data as Record<string, unknown>;
    }

    const r = camelizeKeys<any>(row);
    return {
      experience: r.experience,
      yearsOfExperience: r.yearsOfExperience,
      educationLevel: r.educationLevel,
      locationMatch: r.locationMatch,
      language: r.language,
      requiredSkillThreshold:
        typeof r.requiredSkillThreshold === "number" ? r.requiredSkillThreshold : 0.5,
      presetName: r.presetName ?? null,
      updatedBy: r.updatedBy ?? null,
      updatedAt: r.updatedAt,
    };
  }
}
