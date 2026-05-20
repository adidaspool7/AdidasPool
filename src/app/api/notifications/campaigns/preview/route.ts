/**
 * POST /api/notifications/campaigns/preview
 *
 * Preview how many candidates would receive a campaign
 * without actually sending it. Used for audience estimation.
 */

import { NextRequest, NextResponse } from "next/server";
import { notificationUseCases } from "@server/application";
import { createLogger } from "@server/infrastructure/logging/logger";

const log = createLogger("api/notifications/campaigns/preview");

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      targetAll = true,
      targetInternshipsOnly = false,
      targetCountries = [],
      targetFields = [],
      targetEducation = [],
      segmentId = null,
    } = body;

    const count = await notificationUseCases.previewAudience({
      targetAll,
      targetInternshipsOnly,
      targetCountries,
      targetFields,
      targetEducation,
      segmentId,
    });

    return NextResponse.json({ audienceCount: count });
  } catch (error) {
    log.error("Error previewing audience:", error);
    return NextResponse.json({ error: "Failed to preview audience" }, { status: 500 });
  }
}
