import { NextRequest, NextResponse } from "next/server";
import { scoringPresetRepository } from "@server/application";
import { createLogger } from "@server/infrastructure/logging/logger";

const log = createLogger("api/scoring/presets/[id]");

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    await scoringPresetRepository.delete(id);
    return NextResponse.json({ ok: true });
  } catch (error) {
    log.error("Error deleting preset:", error);
    return NextResponse.json({ error: "Failed to delete preset" }, { status: 500 });
  }
}
