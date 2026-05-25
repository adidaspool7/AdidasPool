/**
 * GET /api/hr/me/activity
 * Returns all notifications triggered BY the current HR user, newest first.
 */

import { NextResponse } from "next/server";
import { hrProfileUseCases } from "@server/application";
import { requireHr } from "@/lib/auth/require-hr";
import { createLogger } from "@server/infrastructure/logging/logger";

const log = createLogger("api/hr/me/activity");
export const dynamic = "force-dynamic";

export async function GET() {
  const { user, response } = await requireHr();
  if (response) return response;
  try {
    const activity = await hrProfileUseCases.getActivity(user.email ?? "");
    return NextResponse.json(activity);
  } catch (error) {
    log.error("Error fetching HR activity", error);
    return NextResponse.json(
      { error: "Failed to fetch activity" },
      { status: 500 }
    );
  }
}
