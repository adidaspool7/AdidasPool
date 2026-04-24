/**
 * Supabase Deduplication Repository
 *
 * ONION LAYER: Infrastructure
 * REPLACES: PrismaDeduplicationRepository
 */

import db from "./supabase-client";
import { assertNoError } from "./db-utils";
import type {
  IDeduplicationRepository,
  DeduplicationResult,
} from "@server/domain/ports/repositories";

export class SupabaseDeduplicationRepository
  implements IDeduplicationRepository
{
  async checkForDuplicate(candidate: {
    email?: string | null;
    firstName: string;
    lastName: string;
    location?: string | null;
    excludeId?: string | null;
  }): Promise<DeduplicationResult> {
    // 1. Exact email match
    if (candidate.email) {
      let q = db
        .from("candidates")
        .select("id")
        .eq("email", candidate.email);
      if (candidate.excludeId) q = q.neq("id", candidate.excludeId);
      const { data, error } = await q.limit(1).single();

      if (!error && data) {
        return {
          isDuplicate: true,
          duplicateOf: (data as any).id as string,
          matchType: "email",
          confidence: 100,
        };
      }
    }

    // 2. Name match (case-insensitive)
    let nameQ = db
      .from("candidates")
      .select("id, location")
      .ilike("first_name", candidate.firstName)
      .ilike("last_name", candidate.lastName);
    if (candidate.excludeId) nameQ = nameQ.neq("id", candidate.excludeId);
    const { data: nameMatches, error } = await nameQ;
    assertNoError(error, "dedup.checkForDuplicate");

    if (nameMatches && nameMatches.length > 0) {
      for (const match of nameMatches as any[]) {
        if (
          candidate.location &&
          match.location &&
          this.normalizeLocation(candidate.location) ===
            this.normalizeLocation(match.location as string)
        ) {
          return {
            isDuplicate: true,
            duplicateOf: match.id as string,
            matchType: "name_location",
            confidence: 85,
          };
        }
      }

      if (nameMatches.length === 1) {
        return {
          isDuplicate: false,
          duplicateOf: (nameMatches[0] as any).id as string,
          matchType: "name_location",
          confidence: 50,
        };
      }
    }

    return {
      isDuplicate: false,
      duplicateOf: null,
      matchType: null,
      confidence: 0,
    };
  }

  private normalizeLocation(location: string): string {
    return location.toLowerCase().trim().replace(/\s+/g, " ");
  }
}
