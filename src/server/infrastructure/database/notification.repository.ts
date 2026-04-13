/**
 * Notification Repository (Prisma)
 *
 * ONION LAYER: Infrastructure
 * IMPLEMENTS: INotificationRepository (domain port)
 */

import type { PrismaClient } from "@prisma/client";
import type {
  INotificationRepository,
  NotificationFilters,
  CreateNotificationData,
} from "@server/domain/ports/repositories";

const NOTIFICATION_INCLUDE = {
  job: {
    select: {
      id: true,
      title: true,
      department: true,
      location: true,
      country: true,
      type: true,
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
} as const;

export class PrismaNotificationRepository implements INotificationRepository {
  constructor(private readonly prisma: PrismaClient) {}

  // ── Scoped queries ──────────────────────────────────────

  async findForCandidate(candidateId: string, filters?: NotificationFilters) {
    const where: Record<string, unknown> = {
      candidateId,
      OR: [
        { targetRole: "CANDIDATE" },
        { targetRole: null },
      ],
    };
    if (filters?.unread) where.read = false;
    if (filters?.type) where.type = filters.type;
    if (filters?.archived !== undefined) where.archived = filters.archived;
    else where.archived = false; // default: hide archived

    return this.prisma.notification.findMany({
      where: where as any,
      include: NOTIFICATION_INCLUDE,
      orderBy: { createdAt: "desc" },
      take: filters?.limit ?? 100,
      skip: filters?.offset ?? 0,
    });
  }

  async findForHR(filters?: NotificationFilters) {
    const where: Record<string, unknown> = {
      OR: [
        { targetRole: "HR" },
        { targetRole: null },
      ],
    };
    if (filters?.unread) where.read = false;
    if (filters?.type) where.type = filters.type;
    if (filters?.archived !== undefined) where.archived = filters.archived;
    else where.archived = false; // default: hide archived

    return this.prisma.notification.findMany({
      where: where as any,
      include: NOTIFICATION_INCLUDE,
      orderBy: { createdAt: "desc" },
      take: filters?.limit ?? 100,
      skip: filters?.offset ?? 0,
    });
  }

  async countUnread(candidateId?: string, targetRole?: string) {
    const where: Record<string, unknown> = { read: false };
    if (candidateId) where.candidateId = candidateId;
    if (targetRole) {
      where.OR = [
        { targetRole },
        { targetRole: null },
      ];
    }
    return this.prisma.notification.count({ where: where as any });
  }

  // ── Legacy (backward compat) ────────────────────────────

  async findAll() {
    return this.prisma.notification.findMany({
      include: NOTIFICATION_INCLUDE,
      orderBy: { createdAt: "desc" },
    });
  }

  async findUnread() {
    return this.prisma.notification.findMany({
      where: { read: false },
      include: NOTIFICATION_INCLUDE,
      orderBy: { createdAt: "desc" },
    });
  }

  // ── Mutations ───────────────────────────────────────────

  async create(data: CreateNotificationData) {
    return this.prisma.notification.create({
      data: {
        type: data.type as any,
        message: data.message,
        targetRole: data.targetRole ?? null,
        jobId: data.jobId,
        candidateId: data.candidateId,
        applicationId: data.applicationId,
        campaignId: data.campaignId ?? null,
      },
    });
  }

  async createMany(data: CreateNotificationData[]) {
    const result = await this.prisma.notification.createMany({
      data: data.map((d) => ({
        type: d.type as any,
        message: d.message,
        targetRole: d.targetRole ?? null,
        jobId: d.jobId,
        candidateId: d.candidateId,
        applicationId: d.applicationId,
        campaignId: d.campaignId ?? null,
      })),
    });
    return result.count;
  }

  async markAsRead(id: string) {
    return this.prisma.notification.update({
      where: { id },
      data: { read: true },
    });
  }

  async markAllAsRead(candidateId?: string, targetRole?: string) {
    const where: Record<string, unknown> = { read: false };
    if (candidateId) where.candidateId = candidateId;
    if (targetRole) {
      where.OR = [
        { targetRole },
        { targetRole: null },
      ];
    }
    await this.prisma.notification.updateMany({
      where: where as any,
      data: { read: true },
    });
  }

  async archiveNotification(id: string) {
    return this.prisma.notification.update({
      where: { id },
      data: { archived: true, read: true },
    });
  }

  async archiveMany(ids: string[]) {
    const result = await this.prisma.notification.updateMany({
      where: { id: { in: ids } },
      data: { archived: true, read: true },
    });
    return result.count;
  }

  async deleteNotification(id: string) {
    await this.prisma.notification.delete({ where: { id } });
  }

  // ── Preferences ─────────────────────────────────────────

  async getPreferences(candidateId: string) {
    return this.prisma.notificationPreference.findUnique({
      where: { candidateId },
    });
  }

  async upsertPreferences(
    candidateId: string,
    prefs: {
      jobNotifications?: boolean;
      internshipNotifications?: boolean;
      onlyMyCountry?: boolean;
      fieldFilters?: string[];
      promotionalNotifications?: boolean;
    }
  ) {
    return this.prisma.notificationPreference.upsert({
      where: { candidateId },
      create: { candidateId, ...prefs },
      update: prefs,
    });
  }

  // ── Campaigns ───────────────────────────────────────────

  async createCampaign(data: any) {
    return this.prisma.promoCampaign.create({ data });
  }

  async findCampaigns() {
    return this.prisma.promoCampaign.findMany({
      orderBy: { createdAt: "desc" },
    });
  }

  async findCampaignById(id: string) {
    return this.prisma.promoCampaign.findUnique({ where: { id } });
  }

  async updateCampaign(id: string, data: any) {
    return this.prisma.promoCampaign.update({ where: { id }, data });
  }

  async deleteCampaign(id: string) {
    // Delete associated notification rows first, then the campaign
    await this.prisma.notification.deleteMany({ where: { campaignId: id } });
    await this.prisma.promoCampaign.delete({ where: { id } });
  }

  async getCampaignReadStats(campaignId: string) {
    const [total, read] = await Promise.all([
      this.prisma.notification.count({ where: { campaignId } }),
      this.prisma.notification.count({ where: { campaignId, read: true } }),
    ]);
    return { total, read };
  }
}
