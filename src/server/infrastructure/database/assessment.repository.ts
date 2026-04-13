/**
 * Prisma Assessment Repository
 *
 * ONION LAYER: Infrastructure
 * DEPENDENCIES: Prisma (external), domain ports (inward)
 *
 * Implements IAssessmentRepository using Prisma ORM.
 */

import { PrismaClient } from "@prisma/client";
import type { IAssessmentRepository } from "@server/domain/ports/repositories";

export class PrismaAssessmentRepository implements IAssessmentRepository {
  constructor(private readonly prisma: PrismaClient) {}

  async findMany(filters: { status?: string; candidateId?: string }) {
    const where: Record<string, unknown> = {};
    if (filters.status) where.status = filters.status;
    if (filters.candidateId) where.candidateId = filters.candidateId;

    return this.prisma.assessment.findMany({
      where,
      include: {
        candidate: {
          select: { firstName: true, lastName: true, email: true },
        },
        job: { select: { title: true } },
        template: { select: { name: true } },
        result: true,
      },
      orderBy: { createdAt: "desc" },
    });
  }

  async create(data: Record<string, unknown>) {
    return this.prisma.assessment.create({
      data: data as any,
      include: {
        candidate: {
          select: { firstName: true, lastName: true, email: true },
        },
      },
    });
  }

  async findByToken(token: string) {
    return this.prisma.assessment.findUnique({
      where: { magicToken: token },
      include: {
        candidate: true,
        job: true,
        template: true,
        result: true,
      },
    });
  }
}
