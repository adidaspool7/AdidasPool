/**
 * Ambassador Programs — HR list + create
 *
 * GET  /api/ambassador/programs   — list all programs (optional ?status=OPEN)
 * POST /api/ambassador/programs   — create a new program
 *
 * HR-only via middleware prefix.
 */

import { NextRequest, NextResponse } from "next/server";
import { ambassadorUseCases } from "@server/application";
import { createLogger } from "@server/infrastructure/logging/logger";

const log = createLogger("api/ambassador/programs");

export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const status = searchParams.get("status") ?? undefined;
  const programs = await ambassadorUseCases.listPrograms(
    status ? { status } : undefined
  );
  return NextResponse.json(programs);
}

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as Record<string, unknown>;
    const program = await ambassadorUseCases.createProgram({
      title: body.title as string,
      description: (body.description as string) ?? null,
      cohort: (body.cohort as string) ?? null,
      applicationDeadline: (body.applicationDeadline as string) ?? null,
      location: (body.location as string) ?? null,
      country: (body.country as string) ?? null,
      requirements: (body.requirements as string) ?? null,
      perks: (body.perks as string) ?? null,
      status: (body.status as string) ?? "DRAFT",
      maxApplicants: (body.maxApplicants as number) ?? null,
    });
    return NextResponse.json(program, { status: 201 });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Unknown error";
    const name = error instanceof Error ? error.name : "";
    if (name === "ValidationError") {
      return NextResponse.json({ error: message }, { status: 400 });
    }
    log.error("[POST /api/ambassador/programs]", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
