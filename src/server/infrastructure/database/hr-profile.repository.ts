/**
 * Supabase HR Profile Repository
 *
 * ONION LAYER: Infrastructure
 */

import db from "./supabase-client";
import { camelizeKeys, snakeifyKeys, generateId, assertNoError } from "./db-utils";
import type {
  IHrProfileRepository,
  HrProfileRow,
} from "@server/domain/ports/repositories";

export class SupabaseHrProfileRepository implements IHrProfileRepository {
  async findByUserId(userId: string): Promise<HrProfileRow | null> {
    const { data, error } = await db
      .from("hr_profiles")
      .select("*")
      .eq("user_id", userId)
      .maybeSingle();
    assertNoError(error, "hrProfile.findByUserId");
    if (!data) return null;
    return camelizeKeys<HrProfileRow>(data as Record<string, unknown>);
  }

  async upsert(
    userId: string,
    data: Partial<Omit<HrProfileRow, "id" | "userId" | "createdAt" | "updatedAt">>
  ): Promise<HrProfileRow> {
    const existing = await this.findByUserId(userId);
    const snaked = snakeifyKeys(data as Record<string, unknown>);

    if (existing) {
      const { data: updated, error } = await db
        .from("hr_profiles")
        .update(snaked)
        .eq("user_id", userId)
        .select()
        .single();
      assertNoError(error, "hrProfile.update");
      return camelizeKeys<HrProfileRow>(updated as Record<string, unknown>);
    } else {
      const { data: created, error } = await db
        .from("hr_profiles")
        .insert({ id: generateId(), user_id: userId, ...snaked })
        .select()
        .single();
      assertNoError(error, "hrProfile.insert");
      return camelizeKeys<HrProfileRow>(created as Record<string, unknown>);
    }
  }
}
