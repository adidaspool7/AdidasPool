/**
 * GET  /api/segments — list all candidate segments (HR only)
 * POST /api/segments — create a new segment (HR only)
 */

import { NextRequest, NextResponse } from "next/server";
import { segmentUseCases } from "@server/application";
import { requireHr } from "@/lib/auth/require-hr";

export const dynamic = "force-dynamic";

export async function GET() {
  const auth = await requireHr();
  if (auth.response) return auth.response;

  const segments = await segmentUseCases.listSegments();
  return NextResponse.json(segments);
}

export async function POST(request: NextRequest) {
  const auth = await requireHr();
  if (auth.response) return auth.response;

  const body = await request.json().catch(() => ({}));
  const name: string = (body.name ?? "").toString().trim();
  const description: string | null = body.description?.toString().trim() || null;

  if (!name) {
    return NextResponse.json({ error: "name is required" }, { status: 400 });
  }

  const segment = await segmentUseCases.createSegment({
    name,
    description,
    createdBy: auth.user.email ?? auth.user.id,
  });

  return NextResponse.json(segment, { status: 201 });
}
