/**
 * Ambassador Program — get / update / delete by ID
 *
 * GET    /api/ambassador/programs/[id]
 * PATCH  /api/ambassador/programs/[id]
 * DELETE /api/ambassador/programs/[id]
 *
 * HR-only via middleware prefix.
 */

import { NextRequest, NextResponse } from "next/server";
import { ambassadorUseCases } from "@server/application";
import { createLogger } from "@server/infrastructure/logging/logger";

const log = createLogger("api/ambassador/programs/[id]");

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  try {
    const program = await ambassadorUseCases.getProgramById(id);
    return NextResponse.json(program);
  } catch (error: unknown) {
    if (error instanceof Error && error.name === "NotFoundError") {
      return NextResponse.json({ error: error.message }, { status: 404 });
    }
    throw error;
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  try {
    const body = (await request.json()) as Record<string, unknown>;
    const updated = await ambassadorUseCases.updateProgram(id, body);
    return NextResponse.json(updated);
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Unknown error";
    const name = error instanceof Error ? error.name : "";
    if (name === "NotFoundError")
      return NextResponse.json({ error: message }, { status: 404 });
    if (name === "ValidationError")
      return NextResponse.json({ error: message }, { status: 400 });
    log.error(`[PATCH /api/ambassador/programs/${id}]`, message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  try {
    await ambassadorUseCases.deleteProgram(id);
    return new NextResponse(null, { status: 204 });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Unknown error";
    const name = error instanceof Error ? error.name : "";
    if (name === "NotFoundError")
      return NextResponse.json({ error: message }, { status: 404 });
    log.error(`[DELETE /api/ambassador/programs/${id}]`, message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
