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
    department?: string | string[];
    country?: string | string[];
  }) {
    const page = options?.page ?? 1;
    const pageSize = options?.pageSize ?? 100;
    const from = (page - 1) * pageSize;
    const to = from + pageSize - 1;

    let query = db
      .from("jobs")
      .select("*, matches:job_matches(id), assessments(id)", { count: "exact" });

    // Search: split on whitespace, each term must match at least one field.
    // NOTE: country is intentionally excluded here — short 2-letter codes
    // ("PT", "FR") cause false-positive substring hits in title/department
    // (e.g. "Senior PT-BR Linguist"). Country is filtered exactly via the
    // dedicated `country` option below.
    if (options?.search) {
      const terms = options.search.trim().split(/\s+/).filter(Boolean);
      for (const term of terms) {
        const t = term.replace(/'/g, "''");
        query = query.or(
          `title.ilike.%${t}%,department.ilike.%${t}%,location.ilike.%${t}%`
        );
      }
    }

    if (options?.type) query = query.eq("type", options.type);
    if (options?.excludeType) query = query.neq("type", options.excludeType);
    if (options?.internshipStatus)
      query = query.eq("internship_status", options.internshipStatus);
    if (options?.department) {
      const depts = Array.isArray(options.department)
        ? options.department
        : [options.department];
      const cleaned = depts.map((d) => d.trim()).filter(Boolean);
      if (cleaned.length === 1) {
        query = query.ilike("department", `%${cleaned[0]}%`);
      } else if (cleaned.length > 1) {
        // OR of substring matches — mirrors single-value semantics so
        // "Retail" still matches "Retail (Store)" etc.
        const expr = cleaned
          .map((d) => `department.ilike.%${d.replace(/[,()]/g, " ").trim()}%`)
          .join(",");
        query = query.or(expr);
      }
    }
    if (options?.country) {
      const countries = Array.isArray(options.country)
        ? options.country
        : [options.country];
      const cleaned = countries.map((c) => c.trim()).filter(Boolean);
      if (cleaned.length === 1) {
        query = query.eq("country", cleaned[0]);
      } else if (cleaned.length > 1) {
        query = query.in("country", cleaned);
      }
    }

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

    // Count distinct countries from the full result set (not paginated),
    // filtered by the same type/excludeType/internshipStatus scope so the
    // header stat matches the listing (e.g. Internships page shows only
    // countries that actually have internships).
    let countriesQuery = db
      .from("jobs")
      .select("country")
      .not("country", "is", null);
    if (options?.type) countriesQuery = countriesQuery.eq("type", options.type);
    if (options?.excludeType)
      countriesQuery = countriesQuery.neq("type", options.excludeType);
    if (options?.internshipStatus)
      countriesQuery = countriesQuery.eq(
        "internship_status",
        options.internshipStatus
      );
    const { data: allCountries } = await countriesQuery;
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

  /**
   * Lightweight list of all jobs for searchable pickers.
   * Returns only id, title, department \u2014 no joins, no pagination.
   * Pages internally to bypass Supabase's default 1000-row cap.
   */
  async findAllForPicker() {
    const out: Array<{ id: string; title: string; department: string | null; country: string | null }> = [];
    const pageSize = 1000;
    let from = 0;
    // Cap at 50k rows defensively to avoid runaway loops.
    while (out.length < 50000) {
      const { data, error } = await db
        .from("jobs")
        .select("id, title, department, country")
        .order("title", { ascending: true })
        .range(from, from + pageSize - 1);
      assertNoError(error, "job.findAllForPicker");
      const rows = data ?? [];
      for (const r of rows as Array<Record<string, unknown>>) {
        out.push({
          id: String(r.id),
          title: String(r.title ?? ""),
          department: (r.department as string | null) ?? null,
          country: (r.country as string | null) ?? null,
        });
      }
      if (rows.length < pageSize) break;
      from += pageSize;
    }
    return out;
  }

  async findDistinctCountries(options?: {
    type?: string;
    excludeType?: string;
    internshipStatus?: string;
  }): Promise<string[]> {
    let q = db
      .from("jobs")
      .select("country")
      .not("country", "is", null);
    if (options?.type) q = q.eq("type", options.type);
    if (options?.excludeType) q = q.neq("type", options.excludeType);
    if (options?.internshipStatus)
      q = q.eq("internship_status", options.internshipStatus);
    const { data, error } = await q;
    assertNoError(error, "job.findDistinctCountries");
    const set = new Set<string>();
    for (const r of (data ?? []) as Array<{ country: string | null }>) {
      const c = (r.country ?? "").trim();
      if (c) set.add(c);
    }
    return Array.from(set).sort();
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

  async bulkUpsertByExternalId(
    jobs: {
      externalId: string;
      title: string;
      department: string | null;
      location: string | null;
      country: string | null;
      sourceUrl: string;
      description?: string | null;
      type?: string | null;
    }[]
  ): Promise<{ created: number; updated: number }> {
    if (jobs.length === 0) return { created: 0, updated: 0 };

    // Get existing jobs (id + external_id + source_url + status) in chunked queries
    // to avoid PostgREST row limits.
    // We need:
    //   - the existing id to avoid overwriting PKs that have FK references,
    //   - the existing source_url to detect changes that should invalidate
    //     any cached parsed_requirements (Phase 1.5 sync invalidation),
    //   - the existing status so we don't accidentally re-OPEN a job that we
    //     previously marked CLOSED (and so we don't send NULL into a NOT NULL
    //     column when the row pre-exists).
    const externalIds = jobs.map((j) => j.externalId);
    const existingMap = new Map<
      string,
      { id: string; source_url: string | null; status: string }
    >();
    const ID_QUERY_CHUNK = 500;
    for (let i = 0; i < externalIds.length; i += ID_QUERY_CHUNK) {
      const idChunk = externalIds.slice(i, i + ID_QUERY_CHUNK);
      const { data: existing } = await db
        .from("jobs")
        .select("id, external_id, source_url, status")
        .in("external_id", idChunk);
      for (const r of existing ?? []) {
        const row = r as {
          id: string;
          external_id: string;
          source_url: string | null;
          status: string;
        };
        existingMap.set(row.external_id, {
          id: row.id,
          source_url: row.source_url,
          status: row.status,
        });
      }
    }

    // Build rows for upsert — reuse existing id to avoid FK violations.
    // When the source_url changed since the last sync, null out
    // parsed_requirements so the next match request triggers a re-parse.
    const rows = jobs.map((j) => {
      const existing = existingMap.get(j.externalId);
      const sourceUrlChanged =
        existing !== undefined && existing.source_url !== j.sourceUrl;
      const baseRow: Record<string, unknown> = {
        id: existing?.id ?? generateId(),
        external_id: j.externalId,
        title: j.title,
        department: j.department,
        location: j.location,
        country: j.country,
        source_url: j.sourceUrl,
        description: j.description ?? null,
        type: j.type ?? "FULL_TIME",
        // Always include status: preserve existing (so a previously-detected
        // CLOSED job stays CLOSED), default to OPEN for new rows. Omitting
        // this column would send explicit NULL via PostgREST and violate
        // the NOT NULL constraint on `jobs.status`.
        status: existing?.status ?? "OPEN",
      };
      if (sourceUrlChanged) {
        baseRow.parsed_requirements = null;
        baseRow.parsed_requirements_version = null;
      }
      return baseRow;
    });

    // Upsert in chunks (Supabase has payload limits)
    const CHUNK_SIZE = 500;
    for (let i = 0; i < rows.length; i += CHUNK_SIZE) {
      const chunk = rows.slice(i, i + CHUNK_SIZE);
      const { error } = await db
        .from("jobs")
        .upsert(chunk, {
          onConflict: "external_id",
          ignoreDuplicates: false,
        });
      assertNoError(error, `job.bulkUpsert (chunk ${Math.floor(i / CHUNK_SIZE) + 1})`);
    }

    const created = jobs.filter((j) => !existingMap.has(j.externalId)).length;
    const updated = jobs.length - created;

    return { created, updated };
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

  async findUnparsedJobs(
    limit: number
  ): Promise<Array<{ id: string; title: string; sourceUrl: string | null; description: string | null }>> {
    const { data, error } = await db
      .from("jobs")
      .select("id, title, source_url, description")
      .is("parsed_requirements", null)
      .not("source_url", "is", null)
      .limit(limit);
    assertNoError(error, "job.findUnparsedJobs");
    return (data ?? []).map((r) => {
      const row = r as {
        id: string;
        title: string;
        source_url: string | null;
        description: string | null;
      };
      return {
        id: row.id,
        title: row.title,
        sourceUrl: row.source_url,
        description: row.description,
      };
    });
  }

  async updateParsedRequirements(
    id: string,
    parsedRequirements: unknown,
    version: number
  ): Promise<void> {
    const { error } = await db
      .from("jobs")
      .update({
        parsed_requirements: parsedRequirements,
        parsed_requirements_version: version,
      })
      .eq("id", id);
    assertNoError(error, "job.updateParsedRequirements");
  }

  async markClosed(id: string): Promise<void> {
    // Also clear any cached parsed_requirements written from a previous
    // (possibly hallucinated) parse \u2014 the JD body is now gone.
    const { error } = await db
      .from("jobs")
      .update({
        status: "CLOSED",
        parsed_requirements: null,
        parsed_requirements_version: null,
      })
      .eq("id", id);
    assertNoError(error, "job.markClosed");
  }
}
