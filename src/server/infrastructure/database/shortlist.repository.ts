/**
 * Supabase Job Shortlist Repository
 *
 * ONION LAYER: Infrastructure
 *
 * Persists per-job shortlists (HR's working pick list of candidates
 * being actively considered for a specific job). Distinct from the
 * global candidates.shortlisted flag (now framed as the "Watchlist").
 */

import db from "./supabase-client";
import { camelizeKeys, generateId, assertNoError } from "./db-utils";
import type {
  IShortlistRepository,
  ShortlistEntry,
  ShortlistEntryWithCandidate,
  ShortlistEntryWithJob,
} from "@server/domain/ports/repositories";

const ENTRY_WITH_CANDIDATE = `
  *,
  candidate:candidates(
    id, first_name, last_name, email, location, country, overall_cv_score
  )
` as const;

const ENTRY_WITH_JOB = `
  *,
  job:jobs(id, title, department, location, country, status)
` as const;

export class SupabaseShortlistRepository implements IShortlistRepository {
  async add(data: {
    jobId: string;
    candidateId: string;
    addedBy: string | null;
    fitScoreAtAdd: number | null;
    notes: string | null;
  }): Promise<{ entry: ShortlistEntry; created: boolean }> {
    // Try insert; on UNIQUE(job_id, candidate_id) conflict, fall back to
    // returning the existing row. We do this with `upsert` using
    // ignoreDuplicates so we can detect "did we create or already exist?".
    const { data: inserted, error: insertErr } = await db
      .from("job_shortlists")
      .insert({
        id: generateId(),
        job_id: data.jobId,
        candidate_id: data.candidateId,
        added_by: data.addedBy,
        fit_score_at_add: data.fitScoreAtAdd,
        notes: data.notes,
      })
      .select("*")
      .single();

    if (!insertErr && inserted) {
      return {
        entry: camelizeKeys<ShortlistEntry>(inserted as Record<string, unknown>),
        created: true,
      };
    }

    // Conflict (or any other error): try to fetch the existing row.
    // Postgres unique-violation SQLSTATE is 23505.
    const code = (insertErr as { code?: string } | null)?.code;
    if (code !== "23505") {
      assertNoError(insertErr, "shortlist.add");
    }

    const existing = await this.findOne(data.jobId, data.candidateId);
    if (!existing) {
      // Should be unreachable: conflict implies it exists. Re-throw original.
      assertNoError(insertErr, "shortlist.add (post-conflict lookup)");
      throw new Error("shortlist.add: conflict but row not found");
    }
    return { entry: existing, created: false };
  }

  async remove(jobId: string, candidateId: string): Promise<boolean> {
    const { error, count } = await db
      .from("job_shortlists")
      .delete({ count: "exact" })
      .eq("job_id", jobId)
      .eq("candidate_id", candidateId);
    assertNoError(error, "shortlist.remove");
    return (count ?? 0) > 0;
  }

  async findByJob(jobId: string): Promise<ShortlistEntryWithCandidate[]> {
    const { data, error } = await db
      .from("job_shortlists")
      .select(ENTRY_WITH_CANDIDATE)
      .eq("job_id", jobId)
      .order("added_at", { ascending: false });
    assertNoError(error, "shortlist.findByJob");
    const rows = (data ?? []).map(
      (r: Record<string, unknown>) =>
        camelizeKeys<ShortlistEntryWithCandidate>(r) as ShortlistEntryWithCandidate
    );

    if (rows.length === 0) return [];

    // Enrich with current cached fit scores from job_matches (one query).
    const candidateIds = rows.map((r) => r.candidateId);
    const { data: matches, error: matchErr } = await db
      .from("job_matches")
      .select("candidate_id, match_score")
      .eq("job_id", jobId)
      .in("candidate_id", candidateIds);
    assertNoError(matchErr, "shortlist.findByJob (match scores)");

    const scoreByCandidate = new Map<string, number>();
    for (const m of (matches ?? []) as Array<{
      candidate_id: string;
      match_score: number | null;
    }>) {
      if (m.match_score != null) scoreByCandidate.set(m.candidate_id, m.match_score);
    }

    return rows.map((r) => ({
      ...r,
      currentFitScore: scoreByCandidate.get(r.candidateId) ?? null,
    }));
  }

  async findByCandidate(candidateId: string): Promise<ShortlistEntryWithJob[]> {
    const { data, error } = await db
      .from("job_shortlists")
      .select(ENTRY_WITH_JOB)
      .eq("candidate_id", candidateId)
      .order("added_at", { ascending: false });
    assertNoError(error, "shortlist.findByCandidate");
    return (data ?? []).map(
      (r: Record<string, unknown>) =>
        camelizeKeys<ShortlistEntryWithJob>(r) as ShortlistEntryWithJob
    );
  }

  async findOne(jobId: string, candidateId: string): Promise<ShortlistEntry | null> {
    const { data, error } = await db
      .from("job_shortlists")
      .select("*")
      .eq("job_id", jobId)
      .eq("candidate_id", candidateId)
      .maybeSingle();
    if (error) return null;
    if (!data) return null;
    return camelizeKeys<ShortlistEntry>(data as Record<string, unknown>);
  }

  async updateNote(
    jobId: string,
    candidateId: string,
    notes: string | null
  ): Promise<ShortlistEntry | null> {
    const { data, error } = await db
      .from("job_shortlists")
      .update({ notes })
      .eq("job_id", jobId)
      .eq("candidate_id", candidateId)
      .select("*")
      .maybeSingle();
    assertNoError(error, "shortlist.updateNote");
    if (!data) return null;
    return camelizeKeys<ShortlistEntry>(data as Record<string, unknown>);
  }

  async countByJob(jobId: string): Promise<number> {
    const { count, error } = await db
      .from("job_shortlists")
      .select("*", { count: "exact", head: true })
      .eq("job_id", jobId);
    assertNoError(error, "shortlist.countByJob");
    return count ?? 0;
  }

  async findCachedFitScore(jobId: string, candidateId: string): Promise<number | null> {
    const { data, error } = await db
      .from("job_matches")
      .select("match_score")
      .eq("job_id", jobId)
      .eq("candidate_id", candidateId)
      .maybeSingle();
    if (error || !data) return null;
    const score = (data as { match_score: number | null }).match_score;
    return score ?? null;
  }
}
