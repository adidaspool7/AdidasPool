/**
 * Prisma Job Repository
 *
 * ONION LAYER: Infrastructure
 * DEPENDENCIES: Prisma (external), domain ports (inward)
 *
 * Implements IJobRepository using Prisma ORM.
 */

import { PrismaClient } from "@prisma/client";
import type { IJobRepository } from "@server/domain/ports/repositories";

export class PrismaJobRepository implements IJobRepository {
  constructor(private readonly prisma: PrismaClient) {}

  async findMany(options?: {
    page?: number;
    pageSize?: number;
    search?: string;
    type?: string;
    excludeType?: string;
    internshipStatus?: string;
    department?: string;
  }) {
    const page = options?.page ?? 1;
    const pageSize = options?.pageSize ?? 100;
    const skip = (page - 1) * pageSize;

    const conditions: any[] = [];

    if (options?.search) {
      // Split into individual terms so "Porto Customer" matches jobs
      // containing BOTH words (across any combination of fields).
      const terms = options.search.trim().split(/\s+/).filter(Boolean);
      for (const term of terms) {
        conditions.push({
          OR: [
            { title: { contains: term, mode: "insensitive" as const } },
            { department: { contains: term, mode: "insensitive" as const } },
            { location: { contains: term, mode: "insensitive" as const } },
            { country: { contains: term, mode: "insensitive" as const } },
          ],
        });
      }
    }

    if (options?.type) {
      conditions.push({ type: options.type });
    }

    if (options?.excludeType) {
      conditions.push({ type: { not: options.excludeType } });
    }

    if (options?.internshipStatus) {
      conditions.push({ internshipStatus: options.internshipStatus });
    }

    if (options?.department) {
      conditions.push({ department: { contains: options.department, mode: "insensitive" as const } });
    }

    const where = conditions.length > 0
      ? { AND: conditions }
      : undefined;

    const [data, total, countriesResult] = await Promise.all([
      this.prisma.job.findMany({
        where,
        include: {
          _count: {
            select: { matches: true, assessments: true },
          },
        },
        orderBy: { createdAt: "desc" },
        skip,
        take: pageSize,
      }),
      this.prisma.job.count({ where }),
      this.prisma.job.groupBy({
        by: ["country"],
        where: { ...where, country: { not: null } },
      }),
    ]);

    return {
      data,
      pagination: {
        page,
        pageSize,
        total,
        totalPages: Math.ceil(total / pageSize),
        distinctCountries: countriesResult.length,
      },
    };
  }

  async findById(id: string) {
    return this.prisma.job.findUnique({ where: { id } });
  }

  async findByExternalId(externalId: string) {
    return this.prisma.job.findUnique({ where: { externalId } });
  }

  async create(data: Record<string, unknown>) {
    return this.prisma.job.create({ data: data as any });
  }

  async update(id: string, data: Record<string, unknown>) {
    return this.prisma.job.update({ where: { id }, data: data as any });
  }

  async delete(id: string): Promise<void> {
    await this.prisma.job.delete({ where: { id } });
  }

  /**
   * Upsert a job by its external ID (from the careers portal).
   * Creates if not found, updates title/dept/location/sourceUrl if found.
   * Returns the job and whether it was newly created.
   */
  async upsertByExternalId(
    externalId: string,
    data: Record<string, unknown>
  ): Promise<{ job: any; created: boolean }> {
    const existing = await this.prisma.job.findUnique({
      where: { externalId },
    });

    if (existing) {
      const job = await this.prisma.job.update({
        where: { externalId },
        data: {
          title: data.title as string,
          department: data.department as string | null,
          location: data.location as string | null,
          country: data.country as string | null,
          sourceUrl: data.sourceUrl as string | null,
          description: data.description as string | null,
        },
      });
      return { job, created: false };
    }

    const job = await this.prisma.job.create({
      data: {
        externalId,
        title: data.title as string,
        department: data.department as string | null,
        location: data.location as string | null,
        country: data.country as string | null,
        sourceUrl: data.sourceUrl as string | null,
        description: data.description as string | null,
        status: "OPEN",
      },
    });
    return { job, created: true };
  }

  async upsertMatch(
    jobId: string,
    candidateId: string,
    matchScore: number,
    breakdown: any
  ) {
    return this.prisma.jobMatch.upsert({
      where: {
        jobId_candidateId: { jobId, candidateId },
      },
      update: { matchScore, breakdown },
      create: { jobId, candidateId, matchScore, breakdown },
    });
  }
}
