/**
 * POST /api/notifications/campaigns/[id]/send
 *
 * Sends a DRAFT campaign: evaluates targeting, creates notification rows,
 * updates campaign status to SENT.
 */

import { NextRequest, NextResponse } from "next/server";
import { notificationUseCases } from "@server/application";

type RouteContext = { params: Promise<{ id: string }> };

export async function POST(request: NextRequest, context: RouteContext) {
  try {
    const { id } = await context.params;
    const body = await request.json().catch(() => ({}));
    const sentBy = body.sentBy || "HR";

    const result = await notificationUseCases.sendCampaign(id, sentBy);
    return NextResponse.json(result);
  } catch (error: any) {
    console.error("Error sending campaign:", error);
    const message = error?.message || "Failed to send campaign";
    const status = message.includes("not found") ? 404 : message.includes("already") ? 409 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
