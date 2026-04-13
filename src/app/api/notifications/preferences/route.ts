/**
 * GET  /api/notifications/preferences?candidateId=...
 * PUT  /api/notifications/preferences
 *
 * Candidate notification preferences (type toggles, country filter, field filters).
 */

import { NextRequest, NextResponse } from "next/server";
import { notificationUseCases } from "@server/application";

export async function GET(request: NextRequest) {
  try {
    const candidateId = request.nextUrl.searchParams.get("candidateId");
    if (!candidateId) {
      return NextResponse.json({ error: "candidateId required" }, { status: 400 });
    }

    const prefs = await notificationUseCases.getPreferences(candidateId);
    // Return defaults when no record exists yet
    return NextResponse.json(
      prefs ?? {
        jobNotifications: true,
        internshipNotifications: true,
        onlyMyCountry: false,
        fieldFilters: [],
        promotionalNotifications: true,
      }
    );
  } catch (error) {
    console.error("Error fetching preferences:", error);
    return NextResponse.json({ error: "Failed to fetch preferences" }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { candidateId, ...prefs } = body;

    if (!candidateId) {
      return NextResponse.json({ error: "candidateId required" }, { status: 400 });
    }

    const updated = await notificationUseCases.updatePreferences(candidateId, prefs);
    return NextResponse.json(updated);
  } catch (error) {
    console.error("Error updating preferences:", error);
    return NextResponse.json({ error: "Failed to update preferences" }, { status: 500 });
  }
}
