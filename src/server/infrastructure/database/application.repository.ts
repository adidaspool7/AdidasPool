/**
 * Job Application Repository (Prisma)
 *
 * ONION LAYER: Infrastructure
 * IMPLEMENTS: IJobApplicationRepository (domain port)
 */

import type { PrismaClient } from "@prisma/client";
import type { IJobApplicationRepository } from "@server/domain/ports/repositories";

export class PrismaJobApplicationRepository
  implements IJobApplicationRepository
{
  constructor(private readonly prisma: PrismaClient) {}

  async findByCandidateId(candidateId: string) {
    return this.prisma.jobApplication.findMany({
      where: { candidateId },
      include: {
        job: {
          select: {
            id: true,
            title: true,
            department: true,
            location: true,
            country: true,
            status: true,
            sourceUrl: true,
            externalId: true,
          },
        },
      },
      orderBy: { createdAt: "desc" },
    });
  }

  async findAll() {
    return this.prisma.jobApplication.findMany({
      include: {
        job: {
          select: {
            id: true,
            title: true,
            type: true,
            department: true,
            location: true,
            country: true,
            status: true,
            sourceUrl: true,
            externalId: true,
          },
        },
        candidate: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
          },
        },
      },
      orderBy: { createdAt: "desc" },
    });
  }

  async findByJobAndCandidate(jobId: string, candidateId: string) {
    return this.prisma.jobApplication.findUnique({
      where: {
        jobId_candidateId: { jobId, candidateId },
      },
    });
  }

  async create(data: { jobId: string; candidateId: string }) {
    return this.prisma.jobApplication.create({
      data: {
        jobId: data.jobId,
        candidateId: data.candidateId,
        status: "SUBMITTED",
      },
      include: {
        job: {
          select: {
            id: true,
            title: true,
            department: true,
            location: true,
            country: true,
            status: true,
            sourceUrl: true,
          },
        },
      },
    });
  }

  async updateStatus(id: string, status: string) {
    return this.prisma.jobApplication.update({
      where: { id },
      data: { status: status as any },
    });
  }

  async update(id: string, data: Record<string, unknown>) {
    return this.prisma.jobApplication.update({
      where: { id },
      data: data as any,
    });
  }

  async delete(id: string) {
    await this.prisma.jobApplication.delete({ where: { id } });
  }
}
