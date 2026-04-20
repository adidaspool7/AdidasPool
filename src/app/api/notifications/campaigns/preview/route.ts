/**
 * POST /api/notifications/campaigns/preview
 *
 * Preview how many candidates would receive a campaign
 * without actually sending it. Used for audience estimation.
 */

import { NextRequest, NextResponse } from "next/server";
import { notificationUseCases } from "@server/application";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      targetAll = true,
      targetInternshipsOnly = false,
      targetCountries = [],
      targetFields = [],
      targetEducation = [],
    } = body;

    const count = await notificationUseCases.previewAudience({
      targetAll,
      targetInternshipsOnly,
      targetCountries,
      targetFields,
      targetEducation,
    });

    return NextResponse.json({ audienceCount: count });
  } catch (error) {
    console.error("Error previewing audience:", error);
    return NextResponse.json({ error: "Failed to preview audience" }, { status: 500 });
  }
}
