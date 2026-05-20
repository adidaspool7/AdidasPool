/**
 * GET  /api/notifications/campaigns       — List all campaigns
 * POST /api/notifications/campaigns       — Create a new campaign (DRAFT)
 *
 * HR-only endpoints for promotional campaign management.
 */

import { NextRequest, NextResponse } from "next/server";
import { notificationUseCases } from "@server/application";
import { createLogger } from "@server/infrastructure/logging/logger";

const log = createLogger("api/notifications/campaigns");

export async function GET() {
  try {
    const campaigns = await notificationUseCases.listCampaigns();
    // Enrich sent/terminated campaigns with read stats
    const enriched = await Promise.all(
      campaigns.map(async (c: any) => {
        if (c.status === "SENT" || c.status === "TERMINATED" || c.status === "ARCHIVED") {
          const readStats = await notificationUseCases.getCampaignReadStats(c.id);
          return { ...c, readStats };
        }
        return { ...c, readStats: null };
      })
    );
    return NextResponse.json(enriched);
  } catch (error) {
    log.error("Error fetching campaigns:", error);
    return NextResponse.json({ error: "Failed to fetch campaigns" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      title,
      body: campaignBody,
      imageUrl,
      linkUrl,
      isPinned,
      targetAll,
      targetInternshipsOnly,
      targetCountries,
      targetFields,
      targetEducation,
      targetEmails,
      scheduledAt,
      segmentId,
    } = body;

    if (!title || !campaignBody) {
      return NextResponse.json(
        { error: "title and body are required" },
        { status: 400 }
      );
    }

    const campaign = await notificationUseCases.createCampaign({
      title,
      body: campaignBody,
      imageUrl,
      linkUrl,
      isPinned: isPinned ?? false,
      targetAll: targetAll ?? true,
      targetInternshipsOnly: targetInternshipsOnly ?? false,
      targetCountries: targetCountries ?? [],
      targetFields: targetFields ?? [],
      targetEducation: targetEducation ?? [],
      targetEmails: targetEmails ?? [],
      segmentId: segmentId ?? null,
      scheduledAt: scheduledAt ? new Date(scheduledAt) : undefined,
    });

    return NextResponse.json(campaign, { status: 201 });
  } catch (error) {
    log.error("Error creating campaign:", error);
    return NextResponse.json({ error: "Failed to create campaign" }, { status: 500 });
  }
}
