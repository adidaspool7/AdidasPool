/**
 * Prisma Scoring Weights Repository
 *
 * ONION LAYER: Infrastructure
 *
 * Single-row config table for HR-adjustable scoring weights.
 * Returns default weights if no row exists yet.
 */

import { PrismaClient } from "@prisma/client";
import type {
  IScoringWeightsRepository,
  ScoringWeightsData,
} from "@server/domain/ports/repositories";
import { CV_SCORING_WEIGHTS } from "@server/domain/value-objects";

const DEFAULT_ID = "default";

export class PrismaScoringWeightsRepository
  implements IScoringWeightsRepository
{
  constructor(private readonly prisma: PrismaClient) {}

  async get(): Promise<ScoringWeightsData> {
    const row = await this.prisma.scoringWeights.findUnique({
      where: { id: DEFAULT_ID },
    });

    if (!row) {
      return {
        experience: CV_SCORING_WEIGHTS.experience,
        yearsOfExperience: CV_SCORING_WEIGHTS.yearsOfExperience,
        educationLevel: CV_SCORING_WEIGHTS.educationLevel,
        locationMatch: CV_SCORING_WEIGHTS.locationMatch,
        language: CV_SCORING_WEIGHTS.language,
        presetName: "Default",
        updatedBy: null,
        updatedAt: new Date(),
      };
    }

    return {
      experience: row.experience,
      yearsOfExperience: row.yearsOfExperience,
      educationLevel: row.educationLevel,
      locationMatch: row.locationMatch,
      language: row.language,
      presetName: row.presetName,
      updatedBy: row.updatedBy,
      updatedAt: row.updatedAt,
    };
  }

  async upsert(weights: {
    experience: number;
    yearsOfExperience: number;
    educationLevel: number;
    locationMatch: number;
    language: number;
    presetName?: string | null;
    updatedBy?: string | null;
  }): Promise<ScoringWeightsData> {
    const row = await this.prisma.scoringWeights.upsert({
      where: { id: DEFAULT_ID },
      create: {
        id: DEFAULT_ID,
        ...weights,
      },
      update: weights,
    });

    return {
      experience: row.experience,
      yearsOfExperience: row.yearsOfExperience,
      educationLevel: row.educationLevel,
      locationMatch: row.locationMatch,
      language: row.language,
      presetName: row.presetName,
      updatedBy: row.updatedBy,
      updatedAt: row.updatedAt,
    };
  }
}
