/**
 * PATCH  /api/segments/[id] — rename / update a segment (HR only)
 * DELETE /api/segments/[id] — delete a segment (HR only)
 */

import { NextRequest, NextResponse } from "next/server";
import { segmentUseCases } from "@server/application";
import { requireHr } from "@/lib/auth/require-hr";

export const dynamic = "force-dynamic";

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireHr();
  if (auth.response) return auth.response;

  const { id } = await params;
  const body = await request.json().catch(() => ({}));

  const patch: { name?: string; description?: string | null } = {};
  if (body.name !== undefined) patch.name = body.name;
  if (body.description !== undefined) patch.description = body.description || null;

  try {
    const updated = await segmentUseCases.renameSegment(id, patch);
    return NextResponse.json(updated);
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Failed to update segment" },
      { status: 400 }
    );
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireHr();
  if (auth.response) return auth.response;

  const { id } = await params;
  await segmentUseCases.deleteSegment(id);
  return new NextResponse(null, { status: 204 });
}
