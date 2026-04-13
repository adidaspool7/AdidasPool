/**
 * Prisma Parsing Job Repository
 *
 * ONION LAYER: Infrastructure
 * IMPLEMENTS: IParsingJobRepository (domain port)
 *
 * Tracks bulk CV upload jobs — creation, progress, error logging.
 */

import type { PrismaClient } from "@prisma/client";
import type {
  IParsingJobRepository,
  ParsingJobErrorEntry,
} from "@server/domain/ports/repositories";

export class PrismaParsingJobRepository implements IParsingJobRepository {
  constructor(private readonly prisma: PrismaClient) {}

  async create(data: {
    totalFiles: number;
    uploadedBy?: string;
    fileName?: string;
  }) {
    return this.prisma.parsingJob.create({
      data: {
        totalFiles: data.totalFiles,
        uploadedBy: data.uploadedBy ?? null,
        fileName: data.fileName ?? null,
        status: "QUEUED",
        parsedFiles: 0,
        failedFiles: 0,
        errorLog: [],
      },
    });
  }

  async findById(id: string) {
    return this.prisma.parsingJob.findUnique({ where: { id } });
  }

  async findRecent(limit = 20) {
    return this.prisma.parsingJob.findMany({
      orderBy: { createdAt: "desc" },
      take: limit,
    });
  }

  async updateStatus(id: string, status: string) {
    await this.prisma.parsingJob.update({
      where: { id },
      data: { status: status as any },
    });
  }

  async incrementParsed(id: string) {
    await this.prisma.parsingJob.update({
      where: { id },
      data: { parsedFiles: { increment: 1 } },
    });
  }

  async incrementFailed(id: string) {
    await this.prisma.parsingJob.update({
      where: { id },
      data: { failedFiles: { increment: 1 } },
    });
  }

  async appendError(id: string, entry: ParsingJobErrorEntry) {
    // Read current error log, append new entry, write back
    const job = await this.prisma.parsingJob.findUnique({ where: { id } });
    const currentErrors = (job?.errorLog as unknown as ParsingJobErrorEntry[]) ?? [];
    await this.prisma.parsingJob.update({
      where: { id },
      data: { errorLog: [...currentErrors, entry] as any },
    });
  }

  async recoverStaleJobs(staleMinutes = 10): Promise<number> {
    const cutoff = new Date(Date.now() - staleMinutes * 60 * 1000);
    const result = await this.prisma.parsingJob.updateMany({
      where: {
        status: "PROCESSING",
        updatedAt: { lt: cutoff },
      },
      data: { status: "FAILED" },
    });
    if (result.count > 0) {
      console.log(`[ParsingJob] Recovered ${result.count} stale PROCESSING job(s) → FAILED`);
    }
    return result.count;
  }
}
