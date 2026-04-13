/**
 * Supabase Parsing Job Repository
 *
 * ONION LAYER: Infrastructure
 * REPLACES: PrismaParsingJobRepository
 */

import db from "./supabase-client";
import { camelizeKeys, generateId, assertNoError } from "./db-utils";
import type {
  IParsingJobRepository,
  ParsingJobErrorEntry,
} from "@server/domain/ports/repositories";

export class SupabaseParsingJobRepository implements IParsingJobRepository {
  async create(data: {
    totalFiles: number;
    uploadedBy?: string;
    fileName?: string;
  }) {
    const { data: row, error } = await db
      .from("parsing_jobs")
      .insert({
        id: generateId(),
        total_files: data.totalFiles,
        uploaded_by: data.uploadedBy ?? null,
        file_name: data.fileName ?? null,
        status: "QUEUED",
        parsed_files: 0,
        failed_files: 0,
        error_log: [],
      })
      .select()
      .single();
    assertNoError(error, "parsingJob.create");
    return camelizeKeys<any>(row as Record<string, unknown>);
  }

  async findById(id: string) {
    const { data, error } = await db
      .from("parsing_jobs")
      .select("*")
      .eq("id", id)
      .single();
    if (error) return null;
    return camelizeKeys<any>(data as Record<string, unknown>);
  }

  async findRecent(limit = 20) {
    const { data, error } = await db
      .from("parsing_jobs")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(limit);
    assertNoError(error, "parsingJob.findRecent");
    return (data ?? []).map((r: Record<string, unknown>) => camelizeKeys<any>(r));
  }

  async updateStatus(id: string, status: string) {
    const { error } = await db
      .from("parsing_jobs")
      .update({ status })
      .eq("id", id);
    assertNoError(error, "parsingJob.updateStatus");
  }

  async incrementParsed(id: string) {
    // Supabase doesn't have atomic increment in the JS client.
    // Fetch current value, increment, update.
    const { data } = await db
      .from("parsing_jobs")
      .select("parsed_files")
      .eq("id", id)
      .single();
    const current = (data as any)?.parsed_files ?? 0;
    const { error } = await db
      .from("parsing_jobs")
      .update({ parsed_files: current + 1 })
      .eq("id", id);
    assertNoError(error, "parsingJob.incrementParsed");
  }

  async incrementFailed(id: string) {
    const { data } = await db
      .from("parsing_jobs")
      .select("failed_files")
      .eq("id", id)
      .single();
    const current = (data as any)?.failed_files ?? 0;
    const { error } = await db
      .from("parsing_jobs")
      .update({ failed_files: current + 1 })
      .eq("id", id);
    assertNoError(error, "parsingJob.incrementFailed");
  }

  async appendError(id: string, entry: ParsingJobErrorEntry) {
    const { data } = await db
      .from("parsing_jobs")
      .select("error_log")
      .eq("id", id)
      .single();
    const current = ((data as any)?.error_log as ParsingJobErrorEntry[]) ?? [];
    const { error } = await db
      .from("parsing_jobs")
      .update({ error_log: [...current, entry] })
      .eq("id", id);
    assertNoError(error, "parsingJob.appendError");
  }

  async recoverStaleJobs(staleMinutes = 10): Promise<number> {
    const cutoff = new Date(
      Date.now() - staleMinutes * 60 * 1000
    ).toISOString();

    const { data, error } = await db
      .from("parsing_jobs")
      .update({ status: "FAILED" })
      .eq("status", "PROCESSING")
      .lt("updated_at", cutoff)
      .select("id");
    assertNoError(error, "parsingJob.recoverStaleJobs");

    const count = (data ?? []).length;
    if (count > 0) {
      console.log(
        `[ParsingJob] Recovered ${count} stale PROCESSING job(s) → FAILED`
      );
    }
    return count;
  }
}
