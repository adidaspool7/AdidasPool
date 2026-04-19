/**
 * Analytics API Route
 *
 * Returns aggregate statistics for the HR analytics dashboard:
 * - Candidate pipeline (count per status)
 * - Applications per job (top 10)
 * - Top skills
 * - Candidates by country
 * - Overview stats (totals)
 */

import { NextResponse } from "next/server";
import { analyticsUseCases } from "@server/application";

export async function GET() {
  try {
    const analytics = await analyticsUseCases.getDashboardAnalytics();
    return NextResponse.json(analytics);
  } catch (error) {
    console.error("Analytics error:", error);
    return NextResponse.json(
      { error: "Failed to fetch analytics" },
      { status: 500 }
    );
  }
}
