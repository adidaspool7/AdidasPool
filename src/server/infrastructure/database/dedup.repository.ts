/**
 * Prisma Deduplication Repository
 *
 * ONION LAYER: Infrastructure
 * DEPENDENCIES: Prisma (external), domain ports (inward)
 *
 * Implements IDeduplicationRepository using Prisma ORM.
 * Deduplication RULES are domain logic, but the DB queries
 * to find duplicates are infrastructure concerns.
 */

import { PrismaClient } from "@prisma/client";
import type {
  IDeduplicationRepository,
  DeduplicationResult,
} from "@server/domain/ports/repositories";

export class PrismaDeduplicationRepository
  implements IDeduplicationRepository
{
  constructor(private readonly prisma: PrismaClient) {}

  async checkForDuplicate(candidate: {
    email?: string | null;
    firstName: string;
    lastName: string;
    location?: string | null;
  }): Promise<DeduplicationResult> {
    // 1. Exact email match (highest confidence)
    if (candidate.email) {
      const emailMatch = await this.prisma.candidate.findUnique({
        where: { email: candidate.email },
        select: { id: true },
      });

      if (emailMatch) {
        return {
          isDuplicate: true,
          duplicateOf: emailMatch.id,
          matchType: "email",
          confidence: 100,
        };
      }
    }

    // 2. Name + location match (fuzzy)
    const nameMatches = await this.prisma.candidate.findMany({
      where: {
        firstName: { equals: candidate.firstName, mode: "insensitive" },
        lastName: { equals: candidate.lastName, mode: "insensitive" },
      },
      select: { id: true, location: true },
    });

    if (nameMatches.length > 0) {
      for (const match of nameMatches) {
        if (
          candidate.location &&
          match.location &&
          this.normalizeLocation(candidate.location) ===
            this.normalizeLocation(match.location)
        ) {
          return {
            isDuplicate: true,
            duplicateOf: match.id,
            matchType: "name_location",
            confidence: 85,
          };
        }
      }

      if (nameMatches.length === 1) {
        return {
          isDuplicate: false,
          duplicateOf: nameMatches[0].id,
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
