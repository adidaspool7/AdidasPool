import { PrismaClient } from "@prisma/client";
import type {
  IScoringPresetRepository,
  ScoringPresetData,
} from "@server/domain/ports/repositories";

export class PrismaScoringPresetRepository
  implements IScoringPresetRepository
{
  constructor(private readonly prisma: PrismaClient) {}

  async findAll(): Promise<ScoringPresetData[]> {
    const rows = await this.prisma.scoringPreset.findMany({
      orderBy: { createdAt: "desc" },
    });

    return rows.map((r) => ({
      id: r.id,
      name: r.name,
      experience: r.experience,
      yearsOfExperience: r.yearsOfExperience,
      educationLevel: r.educationLevel,
      locationMatch: r.locationMatch,
      language: r.language,
      createdAt: r.createdAt,
    }));
  }

  async create(data: {
    name: string;
    experience: number;
    yearsOfExperience: number;
    educationLevel: number;
    locationMatch: number;
    language: number;
  }): Promise<ScoringPresetData> {
    const row = await this.prisma.scoringPreset.create({ data });
    return {
      id: row.id,
      name: row.name,
      experience: row.experience,
      yearsOfExperience: row.yearsOfExperience,
      educationLevel: row.educationLevel,
      locationMatch: row.locationMatch,
      language: row.language,
      createdAt: row.createdAt,
    };
  }

  async delete(id: string): Promise<void> {
    await this.prisma.scoringPreset.delete({ where: { id } });
  }
}
