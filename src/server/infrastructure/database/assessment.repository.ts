/**
 * Supabase Assessment Repository
 *
 * ONION LAYER: Infrastructure
 * REPLACES: PrismaAssessmentRepository
 */

import db from "./supabase-client";
import { camelizeKeys, snakeifyKeys, generateId, assertNoError } from "./db-utils";
import type { IAssessmentRepository } from "@server/domain/ports/repositories";

const ASSESSMENT_SELECT = `
  *,
  candidate:candidates(id, first_name, last_name, email),
  job:jobs(id, title),
  template:assessment_templates(id, name),
  result:assessment_results(*)
` as const;

export class SupabaseAssessmentRepository implements IAssessmentRepository {
  async findMany(filters: { status?: string; candidateId?: string }) {
    let query = db.from("assessments").select(ASSESSMENT_SELECT);

    if (filters.status) query = query.eq("status", filters.status);
    if (filters.candidateId) query = query.eq("candidate_id", filters.candidateId);

    const { data, error } = await query.order("created_at", { ascending: false });
    assertNoError(error, "assessment.findMany");
    return (data ?? []).map((r: Record<string, unknown>) => camelizeKeys<any>(r));
  }

  async create(data: Record<string, unknown>) {
    const { data: row, error } = await db
      .from("assessments")
      .insert({ id: generateId(), ...snakeifyKeys(data) })
      .select(ASSESSMENT_SELECT)
      .single();
    assertNoError(error, "assessment.create");
    return camelizeKeys<any>(row as Record<string, unknown>);
  }

  async findByToken(token: string) {
    const { data, error } = await db
      .from("assessments")
      .select(ASSESSMENT_SELECT)
      .eq("magic_token", token)
      .single();
    if (error) return null;
    return camelizeKeys<any>(data as Record<string, unknown>);
  }
}
