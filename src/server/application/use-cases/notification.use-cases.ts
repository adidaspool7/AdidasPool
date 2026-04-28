/**
 * Notification Use Cases
 *
 * ONION LAYER: Application
 * DEPENDENCIES: Domain ports (inward only)
 *
 * Orchestrates notification operations for both HR and candidates:
 * - Scoped listing (candidate vs HR)
 * - Preference-aware targeting for system notifications
 * - Promotional campaign CRUD and send
 */

import type {
  INotificationRepository,
  ICandidateRepository,
  NotificationFilters,
  CreateNotificationData,
} from "@server/domain/ports/repositories";

export class NotificationUseCases {
  constructor(
    private readonly notificationRepo: INotificationRepository,
    private readonly candidateRepo?: ICandidateRepository
  ) {}

  // ── Scoped listing ──────────────────────────────────────

  async listForCandidate(candidateId: string, filters?: NotificationFilters) {
    return this.notificationRepo.findForCandidate(candidateId, filters);
  }

  async listForHR(filters?: NotificationFilters) {
    return this.notificationRepo.findForHR(filters);
  }

  async countUnread(candidateId?: string, targetRole?: string) {
    return this.notificationRepo.countUnread(candidateId, targetRole);
  }

  // Legacy — kept for backward compat
  async listAll() {
    return this.notificationRepo.findAll();
  }

  async listUnread() {
    return this.notificationRepo.findUnread();
  }

  // ── Create ──────────────────────────────────────────────

  async create(data: CreateNotificationData) {
    return this.notificationRepo.create(data);
  }

  async createMany(data: CreateNotificationData[]) {
    return this.notificationRepo.createMany(data);
  }

  /** Full interaction history for a candidate profile — all types, archived included. */
  async getInteractionHistory(candidateId: string) {
    return this.notificationRepo.findInteractionHistory(candidateId);
  }

  // ── Mark-as-read ────────────────────────────────────────

  async markAsRead(id: string) {
    return this.notificationRepo.markAsRead(id);
  }

  async markAllAsRead(candidateId?: string, targetRole?: string) {
    return this.notificationRepo.markAllAsRead(candidateId, targetRole);
  }

  // ── Archive / Delete ────────────────────────────────────

  async archiveNotification(id: string) {
    return this.notificationRepo.archiveNotification(id);
  }

  async archiveMany(ids: string[]) {
    return this.notificationRepo.archiveMany(ids);
  }

  async deleteNotification(id: string) {
    return this.notificationRepo.deleteNotification(id);
  }

  // ── Preferences ─────────────────────────────────────────

  async getPreferences(candidateId: string) {
    return this.notificationRepo.getPreferences(candidateId);
  }

  async updatePreferences(
    candidateId: string,
    prefs: {
      jobNotifications?: boolean;
      internshipNotifications?: boolean;
      onlyMyCountry?: boolean;
      fieldFilters?: string[];
      promotionalNotifications?: boolean;
    }
  ) {
    return this.notificationRepo.upsertPreferences(candidateId, prefs);
  }

  // ── Targeting (system notifications) ────────────────────

  /**
   * Given a newly created/published job or internship, compute the set of
   * candidate IDs who should receive a notification based on their preferences.
   */
  async getTargetCandidatesForJob(job: {
    id: string;
    type: string;
    country?: string | null;
    department?: string | null;
    internshipStatus?: string | null;
  }): Promise<string[]> {
    if (!this.candidateRepo) return [];

    const candidates = await this.candidateRepo.findForNotifications();
    if (!candidates.length) return [];

    // Bulk-load preferences
    const prefsMap = new Map<string, any>();
    for (const c of candidates) {
      const p = await this.notificationRepo.getPreferences(c.id);
      if (p) prefsMap.set(c.id, p);
    }

    const isInternship = job.type === "INTERNSHIP";
    const targets: string[] = [];

    for (const c of candidates) {
      const prefs = prefsMap.get(c.id);
      // No preferences → default: receive everything
      if (!prefs) {
        targets.push(c.id);
        continue;
      }
      // Type filter
      if (isInternship && !prefs.internshipNotifications) continue;
      if (!isInternship && !prefs.jobNotifications) continue;
      // Country filter
      if (prefs.onlyMyCountry && c.country && job.country && c.country !== job.country) continue;
      // Field filter
      if (prefs.fieldFilters && prefs.fieldFilters.length > 0 && job.department) {
        const match = prefs.fieldFilters.some(
          (f: string) => f.toLowerCase() === job.department!.toLowerCase()
        );
        if (!match) continue;
      }
      targets.push(c.id);
    }

    return targets;
  }

  // ── Campaigns ───────────────────────────────────────────

  async createCampaign(data: {
    title: string;
    body: string;
    imageUrl?: string;
    linkUrl?: string;
    isPinned?: boolean;
    scheduledAt?: Date;
    targetAll?: boolean;
    targetInternshipsOnly?: boolean;
    targetCountries?: string[];
    targetFields?: string[];
    targetEducation?: string[];
    targetEmails?: string[];
  }) {
    return this.notificationRepo.createCampaign(data);
  }

  async listCampaigns() {
    return this.notificationRepo.findCampaigns();
  }

  async getCampaign(id: string) {
    return this.notificationRepo.findCampaignById(id);
  }

  async updateCampaign(id: string, data: any) {
    // Validate status transitions if status is being changed
    if (data.status) {
      const campaign = await this.notificationRepo.findCampaignById(id);
      if (!campaign) throw new Error("Campaign not found");
      const allowed: Record<string, string[]> = {
        DRAFT: [],           // Draft can only go to Sent via sendCampaign
        SENT: ["TERMINATED"],
        TERMINATED: ["ARCHIVED"],
        ARCHIVED: [],
      };
      if (!allowed[campaign.status]?.includes(data.status)) {
        throw new Error(`Cannot change status from ${campaign.status} to ${data.status}`);
      }
    }
    return this.notificationRepo.updateCampaign(id, data);
  }

  async deleteCampaign(id: string) {
    const campaign = await this.notificationRepo.findCampaignById(id);
    if (!campaign) throw new Error("Campaign not found");
    if (campaign.status !== "DRAFT" && campaign.status !== "ARCHIVED") {
      throw new Error("Only Draft or Archived campaigns can be deleted");
    }
    return this.notificationRepo.deleteCampaign(id);
  }

  async getCampaignReadStats(campaignId: string) {
    return this.notificationRepo.getCampaignReadStats(campaignId);
  }

  /**
   * Send a campaign: evaluate targeting, create notification rows, update campaign status.
   */
  async sendCampaign(campaignId: string, sentBy: string) {
    const campaign = await this.notificationRepo.findCampaignById(campaignId);
    if (!campaign) throw new Error("Campaign not found");
    if (campaign.status !== "DRAFT") throw new Error("Campaign already sent or cancelled");

    if (!this.candidateRepo) throw new Error("Candidate repository required for sending");

    // Get all candidates (including NEW status)
    const candidates = await this.candidateRepo.findForNotifications();

    // If targeting internship candidates only, get the set of candidate IDs who applied to internships
    let internshipCandidateIds: Set<string> | null = null;
    if (campaign.targetInternshipsOnly) {
      internshipCandidateIds = await this.candidateRepo.findInternshipCandidateIds();
    }

    // Bulk-load preferences
    const prefsMap = new Map<string, any>();
    for (const c of candidates) {
      const p = await this.notificationRepo.getPreferences(c.id);
      if (p) prefsMap.set(c.id, p);
    }

    // Evaluate targeting
    const targetIds: string[] = [];
    for (const c of candidates) {
      const prefs = prefsMap.get(c.id);
      // Check opt-out
      if (prefs && !prefs.promotionalNotifications) continue;

      if (!campaign.targetAll) {
        // Internship candidates filter
        if (internshipCandidateIds && !internshipCandidateIds.has(c.id)) continue;
        // Country filter
        if (campaign.targetCountries?.length > 0 && c.country) {
          if (!campaign.targetCountries.includes(c.country)) continue;
        }
        // Field of study filter
        if (campaign.targetFields?.length > 0) {
          const candidateField = (c as any).fieldOfStudy || (c as any).department || "";
          if (candidateField) {
            const match = campaign.targetFields.some(
              (f: string) => f.toLowerCase() === candidateField.toLowerCase()
            );
            if (!match) continue;
          }
        }
      }

      // Individual email targeting: if targetEmails has entries, only include matching emails
      if (campaign.targetEmails?.length > 0) {
        const email = (c as any).email?.toLowerCase();
        if (!email || !campaign.targetEmails.some((e: string) => e.toLowerCase() === email)) continue;
      }

      targetIds.push(c.id);
    }

    // Create notification rows in batches
    const BATCH_SIZE = 500;
    let created = 0;
    for (let i = 0; i < targetIds.length; i += BATCH_SIZE) {
      const batch = targetIds.slice(i, i + BATCH_SIZE);
      const rows: CreateNotificationData[] = batch.map((candidateId) => ({
        type: "PROMOTIONAL",
        message: campaign.body,
        targetRole: "CANDIDATE",
        candidateId,
        campaignId: campaign.id,
      }));
      created += await this.notificationRepo.createMany(rows);
    }

    // Update campaign status
    await this.notificationRepo.updateCampaign(campaignId, {
      status: "SENT",
      sentAt: new Date(),
      sentBy,
      recipientCount: created,
    });

    return { recipientCount: created };
  }

  /**
   * Preview audience size for a campaign without sending.
   */
  async previewAudience(campaign: {
    targetAll: boolean;
    targetInternshipsOnly?: boolean;
    targetCountries?: string[];
    targetFields?: string[];
    targetEducation?: string[];
  }): Promise<number> {
    if (!this.candidateRepo) return 0;
    const candidates = await this.candidateRepo.findForNotifications();

    // If targeting internship candidates only, get the set of candidate IDs who applied to internships
    let internshipCandidateIds: Set<string> | null = null;
    if (campaign.targetInternshipsOnly) {
      internshipCandidateIds = await this.candidateRepo.findInternshipCandidateIds();
    }

    // Bulk-load preferences
    const prefsMap = new Map<string, any>();
    for (const c of candidates) {
      const p = await this.notificationRepo.getPreferences(c.id);
      if (p) prefsMap.set(c.id, p);
    }

    let count = 0;
    for (const c of candidates) {
      const prefs = prefsMap.get(c.id);
      if (prefs && !prefs.promotionalNotifications) continue;
      if (!campaign.targetAll) {
        if (internshipCandidateIds && !internshipCandidateIds.has(c.id)) continue;
        if (campaign.targetCountries?.length && c.country) {
          if (!campaign.targetCountries.includes(c.country)) continue;
        }
      }
      count++;
    }
    return count;
  }
}
