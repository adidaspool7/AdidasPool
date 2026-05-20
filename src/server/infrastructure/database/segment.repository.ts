/**
 * Supabase Candidate Segment Repository
 *
 * ONION LAYER: Infrastructure
 *
 * Persists candidate segments (named manual groups) and their membership.
 * Groups are HR-owned; any HR user can add/remove candidates and use a
 * segment as a campaign target.
 */

import db from "./supabase-client";
import { camelizeKeys, generateId, assertNoError } from "./db-utils";
import type {
  ISegmentRepository,
  SegmentRow,
  SegmentMemberRow,
} from "@server/domain/ports/repositories";

export class SupabaseSegmentRepository implements ISegmentRepository {
  // ── Segment CRUD ─────────────────────────────────────────────

  async findAll(): Promise<SegmentRow[]> {
    const { data, error } = await db
      .from("candidate_segments")
      .select(`
        *,
        member_count:candidate_segment_members(count)
      `)
      .order("created_at", { ascending: false });

    assertNoError(error, "findAll segments");

    return (data ?? []).map((row: Record<string, unknown>) => {
      const r = camelizeKeys<SegmentRow & { memberCount?: { count: number }[] }>(row);
      return {
        ...r,
        memberCount: Array.isArray(r.memberCount) ? (r.memberCount[0] as any)?.count ?? 0 : 0,
      } as SegmentRow;
    });
  }

  async findById(id: string): Promise<SegmentRow | null> {
    const { data, error } = await db
      .from("candidate_segments")
      .select("*")
      .eq("id", id)
      .single();

    if (error?.code === "PGRST116") return null; // not found
    assertNoError(error, "findById segment");

    return camelizeKeys<SegmentRow>(data as Record<string, unknown>);
  }

  async create(data: {
    name: string;
    description: string | null;
    createdBy: string;
  }): Promise<SegmentRow> {
    const { data: row, error } = await db
      .from("candidate_segments")
      .insert({
        id: generateId(),
        name: data.name,
        description: data.description,
        created_by: data.createdBy,
      })
      .select()
      .single();

    assertNoError(error, "create segment");
    return camelizeKeys<SegmentRow>(row as Record<string, unknown>);
  }

  async update(
    id: string,
    data: { name?: string; description?: string | null }
  ): Promise<SegmentRow | null> {
    const patch: Record<string, unknown> = {};
    if (data.name !== undefined) patch.name = data.name;
    if (data.description !== undefined) patch.description = data.description;

    const { data: row, error } = await db
      .from("candidate_segments")
      .update(patch)
      .eq("id", id)
      .select()
      .single();

    if (error?.code === "PGRST116") return null;
    assertNoError(error, "update segment");

    return camelizeKeys<SegmentRow>(row as Record<string, unknown>);
  }

  async delete(id: string): Promise<boolean> {
    const { error } = await db
      .from("candidate_segments")
      .delete()
      .eq("id", id);

    assertNoError(error, "delete segment");
    return true;
  }

  // ── Membership ───────────────────────────────────────────────

  async findMembers(segmentId: string): Promise<SegmentMemberRow[]> {
    const { data, error } = await db
      .from("candidate_segment_members")
      .select(`
        segment_id,
        candidate_id,
        added_at,
        candidate:candidates(
          id, first_name, last_name, email, overall_cv_score, status, country
        )
      `)
      .eq("segment_id", segmentId)
      .order("added_at", { ascending: false });

    assertNoError(error, "findMembers");

    return (data ?? []).map((row: Record<string, unknown>) =>
      camelizeKeys<SegmentMemberRow>(row)
    );
  }

  async findMemberIds(segmentId: string): Promise<string[]> {
    const { data, error } = await db
      .from("candidate_segment_members")
      .select("candidate_id")
      .eq("segment_id", segmentId);

    assertNoError(error, "findMemberIds");
    return (data ?? []).map((r: { candidate_id: string }) => r.candidate_id);
  }

  async addMembers(segmentId: string, candidateIds: string[]): Promise<number> {
    if (candidateIds.length === 0) return 0;

    const rows = candidateIds.map((cid) => ({
      segment_id: segmentId,
      candidate_id: cid,
    }));

    const { data, error } = await db
      .from("candidate_segment_members")
      .upsert(rows, { onConflict: "segment_id,candidate_id", ignoreDuplicates: true })
      .select("candidate_id");

    assertNoError(error, "addMembers");
    return (data ?? []).length;
  }

  async removeMember(segmentId: string, candidateId: string): Promise<boolean> {
    const { error } = await db
      .from("candidate_segment_members")
      .delete()
      .eq("segment_id", segmentId)
      .eq("candidate_id", candidateId);

    assertNoError(error, "removeMember");
    return true;
  }

  async findSegmentsForCandidate(candidateId: string): Promise<string[]> {
    const { data, error } = await db
      .from("candidate_segment_members")
      .select("segment_id")
      .eq("candidate_id", candidateId);

    assertNoError(error, "findSegmentsForCandidate");
    return (data ?? []).map((r: { segment_id: string }) => r.segment_id);
  }
}
