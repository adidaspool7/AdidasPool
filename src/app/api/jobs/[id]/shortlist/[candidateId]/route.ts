/**
 * DELETE /api/jobs/[id]/shortlist/[candidateId] — HR-only — remove from shortlist
 * PATCH  /api/jobs/[id]/shortlist/[candidateId] — HR-only — update note
 */

import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { shortlistUseCases } from "@server/application";
import { requireHr } from "@/lib/auth/require-hr";
import { createLogger } from "@server/infrastructure/logging/logger";

const log = createLogger("api/jobs/[id]/shortlist/[candidateId]");

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string; candidateId: string }> }
) {
  const auth = await requireHr();
  if (auth.response) return auth.response;
  try {
    const { id, candidateId } = await params;
    const removed = await shortlistUseCases.remove(id, candidateId);
    if (!removed) {
      return NextResponse.json({ error: "Not on shortlist" }, { status: 404 });
    }
    return NextResponse.json({ ok: true });
  } catch (error) {
    log.error("Error removing from shortlist:", error);
    return NextResponse.json(
      { error: "Failed to remove from shortlist" },
      { status: 500 }
    );
  }
}

const PatchBodySchema = z.object({
  notes: z.string().max(2000).nullable(),
});

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; candidateId: string }> }
) {
  const auth = await requireHr();
  if (auth.response) return auth.response;
  try {
    const { id, candidateId } = await params;
    const body = await request.json();
    const parsed = PatchBodySchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validation failed", details: parsed.error.flatten() },
        { status: 400 }
      );
    }
    const updated = await shortlistUseCases.updateNote(
      id,
      candidateId,
      parsed.data.notes
    );
    if (!updated) {
      return NextResponse.json({ error: "Not on shortlist" }, { status: 404 });
    }
    return NextResponse.json(updated);
  } catch (error) {
    log.error("Error updating shortlist note:", error);
    return NextResponse.json(
      { error: "Failed to update shortlist note" },
      { status: 500 }
    );
  }
}
