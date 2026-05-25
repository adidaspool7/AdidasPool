/**
 * GET  /api/hr/me  — Returns the current HR user's profile (auto-creates on first call)
 * PATCH /api/hr/me — Updates HR profile fields
 */

import { NextRequest, NextResponse } from "next/server";
import { hrProfileUseCases } from "@server/application";
import { UpdateHrProfileSchema } from "@server/application/dtos";
import { requireHr } from "@/lib/auth/require-hr";
import { createLogger } from "@server/infrastructure/logging/logger";

const log = createLogger("api/hr/me");
export const dynamic = "force-dynamic";

export async function GET() {
  const { user, response } = await requireHr();
  if (response) return response;
  try {
    const profile = await hrProfileUseCases.getCurrentProfile(user.id);
    return NextResponse.json(profile);
  } catch (error) {
    log.error("Error fetching HR profile", error);
    return NextResponse.json(
      { error: "Failed to fetch HR profile" },
      { status: 500 }
    );
  }
}

export async function PATCH(request: NextRequest) {
  const { user, response } = await requireHr();
  if (response) return response;
  try {
    const body = await request.json();
    const parsed = UpdateHrProfileSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validation failed", details: parsed.error.flatten().fieldErrors },
        { status: 400 }
      );
    }
    const updated = await hrProfileUseCases.updateProfile(user.id, parsed.data);
    return NextResponse.json(updated);
  } catch (error) {
    log.error("Error updating HR profile", error);
    return NextResponse.json(
      { error: "Failed to update HR profile" },
      { status: 500 }
    );
  }
}
