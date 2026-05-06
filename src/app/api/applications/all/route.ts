/**
 * GET /api/applications/all
 *
 * ONION LAYER: Presentation (thin controller)
 * Delegates to: ApplicationUseCases.listAll
 *
 * Returns all job applications (HR view) with candidate and job info.
 */

import { NextResponse } from "next/server";
import { applicationUseCases } from "@server/application";
import { createLogger } from "@server/infrastructure/logging/logger";

const log = createLogger("api/applications/all");

export async function GET() {
  try {
    const applications = await applicationUseCases.listAll();
    return NextResponse.json(applications);
  } catch (error) {
    log.error("Error fetching all applications:", error);
    return NextResponse.json(
      { error: "Failed to fetch applications" },
      { status: 500 }
    );
  }
}
