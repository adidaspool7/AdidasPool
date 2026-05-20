/**
 * Ambassador Application — update status / delete
 *
 * PATCH  /api/ambassador/programs/[id]/applications/[appId]
 * DELETE /api/ambassador/programs/[id]/applications/[appId]
 *
 * HR-only via middleware prefix.
 */

import { NextRequest, NextResponse } from "next/server";
import { ambassadorUseCases } from "@server/application";
import { createLogger } from "@server/infrastructure/logging/logger";

const log = createLogger("api/ambassador/programs/[id]/applications/[appId]");

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; appId: string }> }
) {
  const { id, appId } = await params;
  try {
    const body = (await request.json()) as { status?: string };
    if (!body.status) {
      return NextResponse.json(
        { error: "status field is required" },
        { status: 400 }
      );
    }
    const updated = await ambassadorUseCases.updateApplicationStatus(
      appId,
      body.status
    );
    return NextResponse.json(updated);
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Unknown error";
    const name = error instanceof Error ? error.name : "";
    if (name === "ValidationError")
      return NextResponse.json({ error: message }, { status: 400 });
    log.error(
      `[PATCH /api/ambassador/programs/${id}/applications/${appId}]`,
      message
    );
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
