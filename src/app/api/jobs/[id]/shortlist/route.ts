/**
 * GET  /api/jobs/[id]/shortlist  — HR-only — list shortlist for this job
 * POST /api/jobs/[id]/shortlist  — HR-only — add candidate to shortlist
 */

import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { shortlistUseCases, NotFoundError } from "@server/application";
import { requireHr } from "@/lib/auth/require-hr";
import { createLogger } from "@server/infrastructure/logging/logger";

const log = createLogger("api/jobs/[id]/shortlist");

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireHr();
  if (auth.response) return auth.response;
  try {
    const { id } = await params;
    const entries = await shortlistUseCases.listByJob(id);
    return NextResponse.json({ entries, count: entries.length });
  } catch (error) {
    log.error("Error listing shortlist:", error);
    return NextResponse.json(
      { error: "Failed to list shortlist" },
      { status: 500 }
    );
  }
}

const PostBodySchema = z.object({
  candidateId: z.string().min(1),
  notes: z.string().max(2000).optional().nullable(),
});

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireHr();
  if (auth.response) return auth.response;
  try {
    const { id } = await params;
    const body = await request.json();
    const parsed = PostBodySchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validation failed", details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const result = await shortlistUseCases.add(
      id,
      parsed.data.candidateId,
      auth.user.displayName ?? null,
      parsed.data.notes ?? null
    );

    return NextResponse.json(result, { status: result.created ? 201 : 200 });
  } catch (error) {
    if (error instanceof NotFoundError) {
      return NextResponse.json({ error: error.message }, { status: 404 });
    }
    log.error("Error adding to shortlist:", error);
    return NextResponse.json(
      { error: "Failed to add to shortlist" },
      { status: 500 }
    );
  }
}
