/**
 * Supabase Job Application Repository
 *
 * ONION LAYER: Infrastructure
 * REPLACES: PrismaJobApplicationRepository
 */

import db from "./supabase-client";
import { camelizeKeys, snakeifyKeys, generateId, assertNoError } from "./db-utils";
import type { IJobApplicationRepository } from "@server/domain/ports/repositories";

const JOB_SELECT_FIELDS =
  "id, title, department, location, country, status, source_url, external_id";

const APPLICATION_WITH_JOB = `*, job:jobs(${JOB_SELECT_FIELDS})` as const;
const APPLICATION_WITH_BOTH = `
  *,
  job:jobs(id, title, type, department, location, country, status, source_url, external_id),
  candidate:candidates(id, first_name, last_name, email, shortlisted)
` as const;

export class SupabaseJobApplicationRepository
  implements IJobApplicationRepository
{
  async findByCandidateId(candidateId: string) {
    const { data, error } = await db
      .from("job_applications")
      .select(APPLICATION_WITH_JOB)
      .eq("candidate_id", candidateId)
      .order("created_at", { ascending: false });
    assertNoError(error, "application.findByCandidateId");
    return (data ?? []).map((r: Record<string, unknown>) => camelizeKeys<any>(r));
  }

  async findAll() {
    const { data, error } = await db
      .from("job_applications")
      .select(APPLICATION_WITH_BOTH)
      .order("created_at", { ascending: false });
    assertNoError(error, "application.findAll");
    return (data ?? []).map((r: Record<string, unknown>) => camelizeKeys<any>(r));
  }

  async findByJobAndCandidate(jobId: string, candidateId: string) {
    const { data, error } = await db
      .from("job_applications")
      .select("*")
      .eq("job_id", jobId)
      .eq("candidate_id", candidateId)
      .single();
    if (error) return null;
    return camelizeKeys<any>(data as Record<string, unknown>);
  }

  async create(data: { jobId: string; candidateId: string }) {
    const { data: row, error } = await db
      .from("job_applications")
      .insert({
        id: generateId(),
        job_id: data.jobId,
        candidate_id: data.candidateId,
        status: "SUBMITTED",
      })
      .select(APPLICATION_WITH_JOB)
      .single();
    assertNoError(error, "application.create");
    return camelizeKeys<any>(row as Record<string, unknown>);
  }

  async updateStatus(id: string, status: string) {
    const { data, error } = await db
      .from("job_applications")
      .update({ status })
      .eq("id", id)
      .select()
      .single();
    assertNoError(error, "application.updateStatus");
    return camelizeKeys<any>(data as Record<string, unknown>);
  }

  async update(id: string, data: Record<string, unknown>) {
    const { data: row, error } = await db
      .from("job_applications")
      .update(snakeifyKeys(data))
      .eq("id", id)
      .select()
      .single();
    assertNoError(error, "application.update");
    return camelizeKeys<any>(row as Record<string, unknown>);
  }

  async delete(id: string) {
    const { error } = await db
      .from("job_applications")
      .delete()
      .eq("id", id);
    assertNoError(error, "application.delete");
  }
}
