/**
 * Supabase Notification Repository
 *
 * ONION LAYER: Infrastructure
 * REPLACES: PrismaNotificationRepository
 */

import db from "./supabase-client";
import { camelizeKeys, snakeifyKeys, generateId, assertNoError } from "./db-utils";
import type {
  INotificationRepository,
  NotificationFilters,
  CreateNotificationData,
} from "@server/domain/ports/repositories";

const NOTIFICATION_SELECT = `
  *,
  job:jobs(id, title, department, location, country, type),
  candidate:candidates(id, first_name, last_name, email)
` as const;

export class SupabaseNotificationRepository implements INotificationRepository {
  async findForCandidate(candidateId: string, filters?: NotificationFilters) {
    let query = db
      .from("notifications")
      .select(NOTIFICATION_SELECT)
      .eq("candidate_id", candidateId)
      .or("target_role.eq.CANDIDATE,target_role.is.null");

    if (filters?.unread) query = query.eq("read", false);
    if (filters?.type) query = query.eq("type", filters.type);
    query = query.eq(
      "archived",
      filters?.archived !== undefined ? filters.archived : false
    );

    const { data, error } = await query
      .order("created_at", { ascending: false })
      .range(filters?.offset ?? 0, (filters?.offset ?? 0) + (filters?.limit ?? 100) - 1);
    assertNoError(error, "notification.findForCandidate");
    return (data ?? []).map((r: Record<string, unknown>) => camelizeKeys<any>(r));
  }

  async findForHR(filters?: NotificationFilters) {
    let query = db
      .from("notifications")
      .select(NOTIFICATION_SELECT)
      .or("target_role.eq.HR,target_role.is.null");

    if (filters?.unread) query = query.eq("read", false);
    if (filters?.type) query = query.eq("type", filters.type);
    query = query.eq(
      "archived",
      filters?.archived !== undefined ? filters.archived : false
    );

    const { data, error } = await query
      .order("created_at", { ascending: false })
      .range(filters?.offset ?? 0, (filters?.offset ?? 0) + (filters?.limit ?? 100) - 1);
    assertNoError(error, "notification.findForHR");
    return (data ?? []).map((r: Record<string, unknown>) => camelizeKeys<any>(r));
  }

  async countUnread(candidateId?: string, targetRole?: string) {
    let query = db
      .from("notifications")
      .select("*", { count: "exact", head: true })
      .eq("read", false);

    if (candidateId) query = query.eq("candidate_id", candidateId);
    if (targetRole)
      query = query.or(`target_role.eq.${targetRole},target_role.is.null`);

    const { count, error } = await query;
    assertNoError(error, "notification.countUnread");
    return count ?? 0;
  }

  async findAll() {
    const { data, error } = await db
      .from("notifications")
      .select(NOTIFICATION_SELECT)
      .order("created_at", { ascending: false });
    assertNoError(error, "notification.findAll");
    return (data ?? []).map((r: Record<string, unknown>) => camelizeKeys<any>(r));
  }

  async findUnread() {
    const { data, error } = await db
      .from("notifications")
      .select(NOTIFICATION_SELECT)
      .eq("read", false)
      .order("created_at", { ascending: false });
    assertNoError(error, "notification.findUnread");
    return (data ?? []).map((r: Record<string, unknown>) => camelizeKeys<any>(r));
  }

  async create(data: CreateNotificationData) {
    const { data: row, error } = await db
      .from("notifications")
      .insert({
        id: generateId(),
        type: data.type,
        message: data.message,
        target_role: data.targetRole ?? null,
        job_id: data.jobId ?? null,
        candidate_id: data.candidateId ?? null,
        application_id: data.applicationId ?? null,
        campaign_id: data.campaignId ?? null,
      })
      .select()
      .single();
    assertNoError(error, "notification.create");
    return camelizeKeys<any>(row as Record<string, unknown>);
  }

  async createMany(data: CreateNotificationData[]) {
    const { error, count } = await db.from("notifications").insert(
      data.map((d) => ({
        id: generateId(),
        type: d.type,
        message: d.message,
        target_role: d.targetRole ?? null,
        job_id: d.jobId ?? null,
        candidate_id: d.candidateId ?? null,
        application_id: d.applicationId ?? null,
        campaign_id: d.campaignId ?? null,
      }))
    );
    assertNoError(error, "notification.createMany");
    return data.length;
  }

  async markAsRead(id: string) {
    const { data, error } = await db
      .from("notifications")
      .update({ read: true })
      .eq("id", id)
      .select()
      .single();
    assertNoError(error, "notification.markAsRead");
    return camelizeKeys<any>(data as Record<string, unknown>);
  }

  async markAllAsRead(candidateId?: string, targetRole?: string) {
    let query = db
      .from("notifications")
      .update({ read: true })
      .eq("read", false);
    if (candidateId) query = query.eq("candidate_id", candidateId);
    if (targetRole)
      query = query.or(`target_role.eq.${targetRole},target_role.is.null`);
    const { error } = await query;
    assertNoError(error, "notification.markAllAsRead");
  }

  async archiveNotification(id: string) {
    const { data, error } = await db
      .from("notifications")
      .update({ archived: true, read: true })
      .eq("id", id)
      .select()
      .single();
    assertNoError(error, "notification.archive");
    return camelizeKeys<any>(data as Record<string, unknown>);
  }

  async archiveMany(ids: string[]) {
    const { error } = await db
      .from("notifications")
      .update({ archived: true, read: true })
      .in("id", ids);
    assertNoError(error, "notification.archiveMany");
    return ids.length;
  }

  async deleteNotification(id: string) {
    const { error } = await db.from("notifications").delete().eq("id", id);
    assertNoError(error, "notification.delete");
  }

  // ── Preferences ─────────────────────────────────────────

  async getPreferences(candidateId: string) {
    const { data, error } = await db
      .from("notification_preferences")
      .select("*")
      .eq("candidate_id", candidateId)
      .single();
    if (error) return null;
    return camelizeKeys<any>(data as Record<string, unknown>);
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
    const existing = await this.getPreferences(candidateId);
    const payload = {
      candidate_id: candidateId,
      ...snakeifyKeys(prefs as Record<string, unknown>),
    };

    if (existing) {
      const { data, error } = await db
        .from("notification_preferences")
        .update(payload)
        .eq("candidate_id", candidateId)
        .select()
        .single();
      assertNoError(error, "notification.upsertPreferences.update");
      return camelizeKeys<any>(data as Record<string, unknown>);
    }

    const { data, error } = await db
      .from("notification_preferences")
      .insert({ id: generateId(), ...payload })
      .select()
      .single();
    assertNoError(error, "notification.upsertPreferences.insert");
    return camelizeKeys<any>(data as Record<string, unknown>);
  }

  // ── Campaigns ───────────────────────────────────────────

  async createCampaign(data: any) {
    const { data: row, error } = await db
      .from("promo_campaigns")
      .insert({ id: generateId(), ...snakeifyKeys(data) })
      .select()
      .single();
    assertNoError(error, "notification.createCampaign");
    return camelizeKeys<any>(row as Record<string, unknown>);
  }

  async findCampaigns() {
    const { data, error } = await db
      .from("promo_campaigns")
      .select("*")
      .order("created_at", { ascending: false });
    assertNoError(error, "notification.findCampaigns");
    return (data ?? []).map((r: Record<string, unknown>) => camelizeKeys<any>(r));
  }

  async findCampaignById(id: string) {
    const { data, error } = await db
      .from("promo_campaigns")
      .select("*")
      .eq("id", id)
      .single();
    if (error) return null;
    return camelizeKeys<any>(data as Record<string, unknown>);
  }

  async updateCampaign(id: string, data: any) {
    const { data: row, error } = await db
      .from("promo_campaigns")
      .update(snakeifyKeys(data))
      .eq("id", id)
      .select()
      .single();
    assertNoError(error, "notification.updateCampaign");
    return camelizeKeys<any>(row as Record<string, unknown>);
  }

  async deleteCampaign(id: string) {
    await db.from("notifications").delete().eq("campaign_id", id);
    const { error } = await db.from("promo_campaigns").delete().eq("id", id);
    assertNoError(error, "notification.deleteCampaign");
  }

  async getCampaignReadStats(campaignId: string) {
    const [{ count: total }, { count: read }] = await Promise.all([
      db
        .from("notifications")
        .select("*", { count: "exact", head: true })
        .eq("campaign_id", campaignId),
      db
        .from("notifications")
        .select("*", { count: "exact", head: true })
        .eq("campaign_id", campaignId)
        .eq("read", true),
    ]);
    return { total: total ?? 0, read: read ?? 0 };
  }
}
