/**
 * GET /api/candidates/[id]/ambassador-applications
 *
 * Returns all ambassador program applications linked to this candidate,
 * including the program title/cohort/status for display on the profile page.
 *
 * HR-only (guarded by middleware prefix /api/candidates/).
 */

import { NextRequest, NextResponse } from "next/server";
import { ambassadorUseCases } from "@server/application";
import { createLogger } from "@server/infrastructure/logging/logger";

const log = createLogger("api/candidates/[id]/ambassador-applications");

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  try {
    const applications = await ambassadorUseCases.listApplicationsByCandidate(id);
    return NextResponse.json({ applications });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Unknown error";
    log.error(`[GET /api/candidates/${id}/ambassador-applications]`, message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
