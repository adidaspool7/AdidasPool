/**
 * GET /api/candidates/[id]/shortlists — HR-only —
 * list all jobs this candidate has been shortlisted on.
 */

import { NextRequest, NextResponse } from "next/server";
import { shortlistUseCases } from "@server/application";
import { requireHr } from "@/lib/auth/require-hr";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireHr();
  if (auth.response) return auth.response;
  try {
    const { id } = await params;
    const entries = await shortlistUseCases.listByCandidate(id);
    return NextResponse.json({ entries, count: entries.length });
  } catch (error) {
    console.error("Error listing candidate shortlists:", error);
    return NextResponse.json(
      { error: "Failed to list shortlists" },
      { status: 500 }
    );
  }
}
