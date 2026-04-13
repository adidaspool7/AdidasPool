/**
 * Supabase Job Repository
 *
 * ONION LAYER: Infrastructure
 * REPLACES: PrismaJobRepository
 */

import db from "./supabase-client";
import { camelizeKeys, snakeifyKeys, generateId, assertNoError } from "./db-utils";
import type { IJobRepository } from "@server/domain/ports/repositories";

export class SupabaseJobRepository implements IJobRepository {
  async findMany(options?: {
    page?: number;
    pageSize?: number;
    search?: string;
    type?: string;
    excludeType?: string;
    internshipStatus?: string;
    department?: string;
  }) {
    const page = options?.page ?? 1;
    const pageSize = options?.pageSize ?? 100;
    const from = (page - 1) * pageSize;
    const to = from + pageSize - 1;

    let query = db
      .from("jobs")
      .select("*, matches:job_matches(id), assessments(id)", { count: "exact" });

    // Search: split on whitespace, each term must match at least one field
    if (options?.search) {
      const terms = options.search.trim().split(/\s+/).filter(Boolean);
      for (const term of terms) {
        const t = term.replace(/'/g, "''");
        query = query.or(
          `title.ilike.%${t}%,department.ilike.%${t}%,location.ilike.%${t}%,country.ilike.%${t}%`
        );
      }
    }

    if (options?.type) query = query.eq("type", options.type);
    if (options?.excludeType) query = query.neq("type", options.excludeType);
    if (options?.internshipStatus)
      query = query.eq("internship_status", options.internshipStatus);
    if (options?.department)
      query = query.ilike("department", `%${options.department}%`);

    const { data, error, count } = await query
      .order("created_at", { ascending: false })
      .range(from, to);

    assertNoError(error, "job.findMany");

    const rows = (data ?? []).map((row: Record<string, unknown>) => {
      const j = camelizeKeys<any>(row);
      j._count = {
        matches: Array.isArray(j.matches) ? j.matches.length : 0,
        assessments: Array.isArray(j.assessments) ? j.assessments.length : 0,
      };
      return j;
    });

    const total = count ?? 0;

    // Count distinct countries from the full result set (not paginated)
    const { data: allCountries } = await db
      .from("jobs")
      .select("country")
      .not("country", "is", null);
    const distinctCountries = new Set(
      (allCountries ?? []).map((r: any) => r.country)
    ).size;

    return {
      data: rows,
      pagination: {
        page,
        pageSize,
        total,
        totalPages: Math.ceil(total / pageSize),
        distinctCountries,
      },
    };
  }

  async findById(id: string) {
    const { data, error } = await db
      .from("jobs")
      .select("*")
      .eq("id", id)
      .single();
    if (error) return null;
    return camelizeKeys<any>(data as Record<string, unknown>);
  }

  async findByExternalId(externalId: string) {
    const { data, error } = await db
      .from("jobs")
      .select("*")
      .eq("external_id", externalId)
      .single();
    if (error) return null;
    return camelizeKeys<any>(data as Record<string, unknown>);
  }

  async create(data: Record<string, unknown>) {
    const { data: row, error } = await db
      .from("jobs")
      .insert({ id: generateId(), ...snakeifyKeys(data) })
      .select()
      .single();
    assertNoError(error, "job.create");
    return camelizeKeys<any>(row as Record<string, unknown>);
  }

  async update(id: string, data: Record<string, unknown>) {
    const { data: row, error } = await db
      .from("jobs")
      .update(snakeifyKeys(data))
      .eq("id", id)
      .select()
      .single();
    assertNoError(error, "job.update");
    return camelizeKeys<any>(row as Record<string, unknown>);
  }

  async delete(id: string): Promise<void> {
    const { error } = await db.from("jobs").delete().eq("id", id);
    assertNoError(error, "job.delete");
  }

  async upsertByExternalId(
    externalId: string,
    data: Record<string, unknown>
  ): Promise<{ job: any; created: boolean }> {
    const existing = await this.findByExternalId(externalId);

    if (existing) {
      const job = await this.update(existing.id, {
        title: data.title,
        department: data.department ?? null,
        location: data.location ?? null,
        country: data.country ?? null,
        sourceUrl: data.sourceUrl ?? null,
        description: data.description ?? null,
      });
      return { job, created: false };
    }

    const job = await this.create({
      externalId,
      title: data.title,
      department: data.department ?? null,
      location: data.location ?? null,
      country: data.country ?? null,
      sourceUrl: data.sourceUrl ?? null,
      description: data.description ?? null,
      status: "OPEN",
    });
    return { job, created: true };
  }

  async upsertMatch(
    jobId: string,
    candidateId: string,
    matchScore: number,
    breakdown: any
  ) {
    const { data: existing } = await db
      .from("job_matches")
      .select("id")
      .eq("job_id", jobId)
      .eq("candidate_id", candidateId)
      .single();

    if (existing) {
      const { data, error } = await db
        .from("job_matches")
        .update({ match_score: matchScore, breakdown })
        .eq("job_id", jobId)
        .eq("candidate_id", candidateId)
        .select()
        .single();
      assertNoError(error, "job.upsertMatch.update");
      return camelizeKeys<any>(data as Record<string, unknown>);
    }

    const { data, error } = await db
      .from("job_matches")
      .insert({
        id: generateId(),
        job_id: jobId,
        candidate_id: candidateId,
        match_score: matchScore,
        breakdown,
      })
      .select()
      .single();
    assertNoError(error, "job.upsertMatch.insert");
    return camelizeKeys<any>(data as Record<string, unknown>);
  }
}
