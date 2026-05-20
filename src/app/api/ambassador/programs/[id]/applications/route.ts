/**
 * Ambassador Program Applications — list
 *
 * GET /api/ambassador/programs/[id]/applications
 *
 * HR-only via middleware prefix.
 */

import { NextRequest, NextResponse } from "next/server";
import { ambassadorUseCases } from "@server/application";
import { createLogger } from "@server/infrastructure/logging/logger";

const log = createLogger("api/ambassador/programs/[id]/applications");

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  try {
    const applications = await ambassadorUseCases.listApplications(id);
    return NextResponse.json(applications);
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Unknown error";
    const name = error instanceof Error ? error.name : "";
    if (name === "NotFoundError")
      return NextResponse.json({ error: message }, { status: 404 });
    log.error(`[GET /api/ambassador/programs/${id}/applications]`, message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
