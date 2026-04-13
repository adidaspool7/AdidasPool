/**
 * Supabase Scoring Preset Repository
 *
 * ONION LAYER: Infrastructure
 * REPLACES: PrismaScoringPresetRepository
 */

import db from "./supabase-client";
import { camelizeKeys, generateId, assertNoError } from "./db-utils";
import type {
  IScoringPresetRepository,
  ScoringPresetData,
} from "@server/domain/ports/repositories";

export class SupabaseScoringPresetRepository
  implements IScoringPresetRepository
{
  async findAll(): Promise<ScoringPresetData[]> {
    const { data, error } = await db
      .from("scoring_presets")
      .select("*")
      .order("created_at", { ascending: false });
    assertNoError(error, "scoringPreset.findAll");

    return (data ?? []).map((r: Record<string, unknown>) => {
      const row = camelizeKeys<any>(r);
      return {
        id: row.id,
        name: row.name,
        experience: row.experience,
        yearsOfExperience: row.yearsOfExperience,
        educationLevel: row.educationLevel,
        locationMatch: row.locationMatch,
        language: row.language,
        createdAt: row.createdAt,
      };
    });
  }

  async create(data: {
    name: string;
    experience: number;
    yearsOfExperience: number;
    educationLevel: number;
    locationMatch: number;
    language: number;
  }): Promise<ScoringPresetData> {
    const { data: row, error } = await db
      .from("scoring_presets")
      .insert({
        id: generateId(),
        name: data.name,
        experience: data.experience,
        years_of_experience: data.yearsOfExperience,
        education_level: data.educationLevel,
        location_match: data.locationMatch,
        language: data.language,
      })
      .select()
      .single();
    assertNoError(error, "scoringPreset.create");

    const r = camelizeKeys<any>(row as Record<string, unknown>);
    return {
      id: r.id,
      name: r.name,
      experience: r.experience,
      yearsOfExperience: r.yearsOfExperience,
      educationLevel: r.educationLevel,
      locationMatch: r.locationMatch,
      language: r.language,
      createdAt: r.createdAt,
    };
  }

  async delete(id: string): Promise<void> {
    const { error } = await db
      .from("scoring_presets")
      .delete()
      .eq("id", id);
    assertNoError(error, "scoringPreset.delete");
  }
}
