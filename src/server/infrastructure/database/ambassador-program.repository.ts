/**
 * Supabase Ambassador Program Repository
 *
 * ONION LAYER: Infrastructure
 */

import db from "./supabase-client";
import { camelizeKeys, snakeifyKeys, generateId, assertNoError } from "./db-utils";
import type {
  IAmbassadorProgramRepository,
  AmbassadorProgramRow,
} from "@server/domain/ports/repositories";

const WITH_COUNT =
  `*, application_count:ambassador_applications(count)` as const;

export class SupabaseAmbassadorProgramRepository
  implements IAmbassadorProgramRepository
{
  async findAll(opts?: { status?: string }): Promise<AmbassadorProgramRow[]> {
    let query = db
      .from("ambassador_programs")
      .select(WITH_COUNT)
      .order("created_at", { ascending: false });
    if (opts?.status) query = query.eq("status", opts.status);
    const { data, error } = await query;
    assertNoError(error, "ambassadorProgram.findAll");
    return (data ?? []).map((r) => this.toRow(r as Record<string, unknown>));
  }

  async findById(id: string): Promise<AmbassadorProgramRow | null> {
    const { data, error } = await db
      .from("ambassador_programs")
      .select(WITH_COUNT)
      .eq("id", id)
      .single();
    if (error?.code === "PGRST116") return null;
    assertNoError(error, "ambassadorProgram.findById");
    if (!data) return null;
    return this.toRow(data as Record<string, unknown>);
  }

  async create(data: Record<string, unknown>): Promise<AmbassadorProgramRow> {
    const { data: created, error } = await db
      .from("ambassador_programs")
      .insert({ id: generateId(), ...snakeifyKeys(data) })
      .select("*")
      .single();
    assertNoError(error, "ambassadorProgram.create");
    return camelizeKeys<AmbassadorProgramRow>(
      created as Record<string, unknown>
    );
  }

  async update(
    id: string,
    data: Record<string, unknown>
  ): Promise<AmbassadorProgramRow> {
    const { data: updated, error } = await db
      .from("ambassador_programs")
      .update(snakeifyKeys(data))
      .eq("id", id)
      .select("*")
      .single();
    assertNoError(error, "ambassadorProgram.update");
    return camelizeKeys<AmbassadorProgramRow>(
      updated as Record<string, unknown>
    );
  }

  async delete(id: string): Promise<boolean> {
    const { error, count } = await db
      .from("ambassador_programs")
      .delete({ count: "exact" })
      .eq("id", id);
    assertNoError(error, "ambassadorProgram.delete");
    return (count ?? 0) > 0;
  }

  private toRow(r: Record<string, unknown>): AmbassadorProgramRow {
    const row = camelizeKeys<AmbassadorProgramRow>(r);
    // PostgREST aggregate: ambassador_applications returns [{ count: number }]
    const rawCount = (
      r as { ambassador_applications?: { count: number }[] }
    ).ambassador_applications;
    row.applicationCount = rawCount?.[0]?.count ?? 0;
    return row;
  }
}
