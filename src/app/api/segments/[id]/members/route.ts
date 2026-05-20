/**
 * GET  /api/segments/[id]/members — list members of a segment (HR only)
 * POST /api/segments/[id]/members — add candidates to a segment (HR only)
 *   Body: { candidateIds: string[] }
 */

import { NextRequest, NextResponse } from "next/server";
import { segmentUseCases } from "@server/application";
import { requireHr } from "@/lib/auth/require-hr";

export const dynamic = "force-dynamic";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireHr();
  if (auth.response) return auth.response;

  const { id } = await params;
  const members = await segmentUseCases.listMembers(id);
  return NextResponse.json(members);
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireHr();
  if (auth.response) return auth.response;

  const { id } = await params;
  const body = await request.json().catch(() => ({}));
  const candidateIds: string[] = Array.isArray(body.candidateIds) ? body.candidateIds : [];

  if (!candidateIds.length) {
    return NextResponse.json({ error: "candidateIds array is required" }, { status: 400 });
  }

  const added = await segmentUseCases.addMembers(id, candidateIds);
  return NextResponse.json({ added });
}
