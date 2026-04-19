/**
 * GET    /api/notifications/campaigns/[id]  — Get single campaign
 * PATCH  /api/notifications/campaigns/[id]  — Update campaign (DRAFT only)
 * DELETE /api/notifications/campaigns/[id]  — Delete campaign
 */

import { NextRequest, NextResponse } from "next/server";
import { notificationUseCases } from "@server/application";

type RouteContext = { params: Promise<{ id: string }> };

export async function GET(_request: NextRequest, context: RouteContext) {
  try {
    const { id } = await context.params;
    const campaign = await notificationUseCases.getCampaign(id);
    if (!campaign) {
      return NextResponse.json({ error: "Campaign not found" }, { status: 404 });
    }
    // Include read stats for sent/terminated/archived campaigns
    let readStats = null;
    if (campaign.status === "SENT" || campaign.status === "TERMINATED" || campaign.status === "ARCHIVED") {
      readStats = await notificationUseCases.getCampaignReadStats(id);
    }
    return NextResponse.json({ ...campaign, readStats });
  } catch (error) {
    console.error("Error fetching campaign:", error);
    return NextResponse.json({ error: "Failed to fetch campaign" }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest, context: RouteContext) {
  try {
    const { id } = await context.params;
    const body = await request.json();
    const campaign = await notificationUseCases.updateCampaign(id, body);
    return NextResponse.json(campaign);
  } catch (error: any) {
    console.error("Error updating campaign:", error);
    const message = error?.message || "Failed to update campaign";
    const status = message.includes("not found") ? 404 : message.includes("Cannot change") ? 400 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}

export async function DELETE(_request: NextRequest, context: RouteContext) {
  try {
    const { id } = await context.params;
    await notificationUseCases.deleteCampaign(id);
    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("Error deleting campaign:", error);
    const message = error?.message || "Failed to delete campaign";
    const status = message.includes("not found") ? 404 : message.includes("Only Draft") ? 400 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
