/**
 * Supabase Ambassador Application Repository
 *
 * ONION LAYER: Infrastructure
 */

import db from "./supabase-client";
import { camelizeKeys, snakeifyKeys, generateId, assertNoError } from "./db-utils";
import type {
  IAmbassadorApplicationRepository,
  AmbassadorApplicationRow,
} from "@server/domain/ports/repositories";

const WITH_CANDIDATE = `
  *,
  candidate:candidates(
    id, first_name, last_name, email, location, overall_cv_score, status, raw_cv_url
  )
` as const;

export class SupabaseAmbassadorApplicationRepository
  implements IAmbassadorApplicationRepository
{
  async findByProgram(programId: string): Promise<AmbassadorApplicationRow[]> {
    const { data, error } = await db
      .from("ambassador_applications")
      .select(WITH_CANDIDATE)
      .eq("program_id", programId)
      .order("applied_at", { ascending: false });
    assertNoError(error, "ambassadorApp.findByProgram");
    return (data ?? []).map((r) =>
      camelizeKeys<AmbassadorApplicationRow>(r as Record<string, unknown>)
    );
  }

  async findByCandidate(
    candidateId: string
  ): Promise<AmbassadorApplicationRow[]> {
    const { data, error } = await db
      .from("ambassador_applications")
      .select("*, program:ambassador_programs(id, title, cohort, status)")
      .eq("candidate_id", candidateId)
      .order("applied_at", { ascending: false });
    assertNoError(error, "ambassadorApp.findByCandidate");
    return (data ?? []).map((r) =>
      camelizeKeys<AmbassadorApplicationRow>(r as Record<string, unknown>)
    );
  }

  async findOne(
    programId: string,
    candidateId: string
  ): Promise<AmbassadorApplicationRow | null> {
    const { data, error } = await db
      .from("ambassador_applications")
      .select(WITH_CANDIDATE)
      .eq("program_id", programId)
      .eq("candidate_id", candidateId)
      .maybeSingle();
    assertNoError(error, "ambassadorApp.findOne");
    if (!data) return null;
    return camelizeKeys<AmbassadorApplicationRow>(
      data as Record<string, unknown>
    );
  }

  async create(data: {
    programId: string;
    candidateId: string;
    motivation?: string | null;
    university?: string | null;
    yearOfStudy?: string | null;
    previousExperience?: string | null;
  }): Promise<AmbassadorApplicationRow> {
    const { data: created, error } = await db
      .from("ambassador_applications")
      .insert({
        id: generateId(),
        program_id: data.programId,
        candidate_id: data.candidateId,
        motivation: data.motivation ?? null,
        university: data.university ?? null,
        year_of_study: data.yearOfStudy ?? null,
        previous_experience: data.previousExperience ?? null,
      })
      .select(WITH_CANDIDATE)
      .single();
    assertNoError(error, "ambassadorApp.create");
    return camelizeKeys<AmbassadorApplicationRow>(
      created as Record<string, unknown>
    );
  }

  async updateStatus(
    id: string,
    status: string
  ): Promise<AmbassadorApplicationRow> {
    const { data: updated, error } = await db
      .from("ambassador_applications")
      .update({ status })
      .eq("id", id)
      .select(WITH_CANDIDATE)
      .single();
    assertNoError(error, "ambassadorApp.updateStatus");
    return camelizeKeys<AmbassadorApplicationRow>(
      updated as Record<string, unknown>
    );
  }

  async update(
    id: string,
    data: Record<string, unknown>
  ): Promise<AmbassadorApplicationRow> {
    const { data: updated, error } = await db
      .from("ambassador_applications")
      .update(snakeifyKeys(data))
      .eq("id", id)
      .select(WITH_CANDIDATE)
      .single();
    assertNoError(error, "ambassadorApp.update");
    return camelizeKeys<AmbassadorApplicationRow>(
      updated as Record<string, unknown>
    );
  }

  async delete(id: string): Promise<boolean> {
    const { error, count } = await db
      .from("ambassador_applications")
      .delete({ count: "exact" })
      .eq("id", id);
    assertNoError(error, "ambassadorApp.delete");
    return (count ?? 0) > 0;
  }
}
