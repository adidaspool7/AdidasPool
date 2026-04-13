/**
 * Prisma Candidate Repository
 *
 * ONION LAYER: Infrastructure
 * DEPENDENCIES: Prisma (external), domain ports (inward)
 *
 * Implements ICandidateRepository using Prisma ORM.
 * The domain and application layers never see Prisma directly.
 */

import { Prisma, PrismaClient } from "@prisma/client";
import type {
  ICandidateRepository,
  CandidateFilters,
  CandidateRelationsInput,
  PaginatedResult,
} from "@server/domain/ports/repositories";

export class PrismaCandidateRepository implements ICandidateRepository {
  constructor(private readonly prisma: PrismaClient) {}

  async findMany(filters: CandidateFilters): Promise<PaginatedResult<any>> {
    const where: Record<string, unknown> = {};

    if (filters.search) {
      where.OR = [
        { firstName: { contains: filters.search, mode: "insensitive" } },
        { lastName: { contains: filters.search, mode: "insensitive" } },
        { email: { contains: filters.search, mode: "insensitive" } },
      ];
    }
    if (filters.status) where.status = filters.status;
    if (filters.country)
      where.country = { contains: filters.country, mode: "insensitive" };
    if (filters.locationSearch) {
      where.AND = [
        ...(Array.isArray(where.AND) ? (where.AND as Record<string, unknown>[]) : []),
        {
          OR: [
            { location: { contains: filters.locationSearch, mode: "insensitive" } },
            { country: { contains: filters.locationSearch, mode: "insensitive" } },
          ],
        },
      ];
    }
    if (filters.sourceType) {
      where.sourceType = filters.sourceType;
    } else {
      where.sourceType = { not: "PLATFORM" };
    }
    if (filters.minScore || filters.maxScore) {
      where.overallCvScore = {
        ...(filters.minScore && { gte: filters.minScore }),
        ...(filters.maxScore && { lte: filters.maxScore }),
      };
    }
    if (filters.businessArea) {
      where.primaryBusinessArea = filters.businessArea;
    }
    if (filters.needsReview !== undefined) {
      where.needsReview = filters.needsReview;
    }

    const [data, total] = await Promise.all([
      this.prisma.candidate.findMany({
        where,
        include: {
          languages: true,
          tags: true,
          _count: { select: { assessments: true, notes: true } },
        },
        orderBy: { [filters.sortBy || "createdAt"]: filters.sortOrder },
        skip: (filters.page - 1) * filters.pageSize,
        take: filters.pageSize,
      }),
      this.prisma.candidate.count({ where }),
    ]);

    return {
      data,
      pagination: {
        page: filters.page,
        pageSize: filters.pageSize,
        total,
        totalPages: Math.ceil(total / filters.pageSize),
      },
    };
  }

  async findById(id: string) {
    return this.prisma.candidate.findUnique({
      where: { id },
      include: {
        experiences: { orderBy: { startDate: "desc" } },
        education: { orderBy: { endDate: "desc" } },
        languages: true,
        skills: true,
        tags: true,
        notes: { orderBy: { createdAt: "desc" } },
        assessments: {
          include: { result: true, template: true },
          orderBy: { createdAt: "desc" },
        },
        improvementTracks: {
          include: { progress: { orderBy: { day: "asc" } } },
        },
        jobMatches: {
          include: { job: true },
          orderBy: { matchScore: "desc" },
        },
      },
    });
  }

  async findByIdWithSelect(id: string, select: Prisma.CandidateSelect) {
    return this.prisma.candidate.findUnique({
      where: { id },
      select,
    });
  }

  async update(id: string, data: Record<string, unknown>) {
    return this.prisma.candidate.update({ where: { id }, data });
  }

  /** FIXED: select now uses Prisma.CandidateSelect */
  async updateWithSelect(
    id: string,
    data: Record<string, unknown>,
    select: Prisma.CandidateSelect
  ) {
    return this.prisma.candidate.update({
      where: { id },
      data,
      select,
    });
  }

  /** FIXED: select now uses Prisma.CandidateSelect */
  async findFirstByCreation(select?: Prisma.CandidateSelect) {
    return this.prisma.candidate.findFirst({
      orderBy: { createdAt: "asc" },
      ...(select ? { select } : {}),
    });
  }

  /** FIXED: select now uses Prisma.CandidateSelect */
  async createDefault(data: Record<string, unknown>, select?: Prisma.CandidateSelect) {
    return this.prisma.candidate.create({
      data: data as any,
      ...(select ? { select } : {}),
    });
  }

  async addNote(candidateId: string, author: string, content: string) {
    return this.prisma.candidateNote.create({
      data: { candidateId, author, content },
    });
  }

  async updateStatus(candidateId: string, status: string) {
    await this.prisma.candidate.update({
      where: { id: candidateId },
      data: { status: status as any },
    });
  }

  async findForMatching() {
    return this.prisma.candidate.findMany({
      where: {
        status: { not: "NEW" },
        isDuplicate: false,
      },
      include: {
        languages: true,
        education: true,
      },
    });
  }

  async findForNotifications() {
    return this.prisma.candidate.findMany({
      where: { isDuplicate: false },
      select: {
        id: true,
        country: true,
        education: { select: { fieldOfStudy: true } },
      },
    });
  }

  async findForExport() {
    return this.prisma.candidate.findMany({
      include: {
        languages: true,
        tags: true,
      },
      orderBy: { overallCvScore: "desc" },
    });
  }

  async findForRescore() {
    return this.prisma.candidate.findMany({
      select: {
        id: true,
        yearsOfExperience: true,
        location: true,
        country: true,
        education: { select: { level: true }, orderBy: { startDate: "desc" } },
        languages: { select: { language: true, selfDeclaredLevel: true } },
      },
    });
  }

  async createWithRelations(
    data: Record<string, unknown>,
    relations: CandidateRelationsInput
  ) {
    return this.prisma.candidate.create({
      data: {
        ...(data as any),
        experiences: {
          create: relations.experiences,
        },
        education: {
          create: relations.education.map((edu) => ({
            ...edu,
            level: edu.level as any,
          })),
        },
        languages: {
          create: relations.languages.map((lang) => ({
            ...lang,
            selfDeclaredLevel: lang.selfDeclaredLevel as any,
          })),
        },
        skills: {
          create: relations.skills,
        },
      },
      include: {
        experiences: true,
        education: true,
        languages: true,
        skills: true,
      },
    });
  }

  async replaceRelatedRecords(
    candidateId: string,
    relations: CandidateRelationsInput
  ) {
    await this.prisma.$transaction([
      this.prisma.experience.deleteMany({ where: { candidateId } }),
      this.prisma.education.deleteMany({ where: { candidateId } }),
      this.prisma.candidateLanguage.deleteMany({ where: { candidateId } }),
      this.prisma.skill.deleteMany({ where: { candidateId } }),

      this.prisma.experience.createMany({
        data: relations.experiences.map((exp) => ({ ...exp, candidateId })),
      }),
      this.prisma.education.createMany({
        data: relations.education.map((edu) => ({
          ...edu,
          candidateId,
          level: edu.level as any,
        })),
      }),
      this.prisma.candidateLanguage.createMany({
        data: relations.languages.map((lang) => ({
          ...lang,
          candidateId,
          selfDeclaredLevel: lang.selfDeclaredLevel as any,
        })),
      }),
      this.prisma.skill.createMany({
        data: relations.skills.map((skill) => ({ ...skill, candidateId })),
      }),
    ]);
  }

  async delete(id: string) {
    await this.prisma.candidate.delete({
      where: { id },
    });
  }
}
