/**
 * DELETE /api/segments/[id]/members/[candidateId]
 * Remove a candidate from a segment (HR only)
 */

import { NextRequest, NextResponse } from "next/server";
import { segmentUseCases } from "@server/application";
import { requireHr } from "@/lib/auth/require-hr";

export const dynamic = "force-dynamic";

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string; candidateId: string }> }
) {
  const auth = await requireHr();
  if (auth.response) return auth.response;

  const { id, candidateId } = await params;
  await segmentUseCases.removeMember(id, candidateId);
  return new NextResponse(null, { status: 204 });
}
