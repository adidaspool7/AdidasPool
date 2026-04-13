/**
 * GET /api/interview/results
 * Returns recent evaluated interview sessions for the current candidate.
 */

import { NextResponse } from "next/server";
import db from "@server/infrastructure/database/supabase-client";
import { camelizeKeys } from "@server/infrastructure/database/db-utils";
import { profileUseCases } from "@server/application";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const candidate = await profileUseCases.getCurrentProfile();
    if (!candidate) {
      return NextResponse.json({ results: [] });
    }

    const { data, error } = await db
      .from("interview_sessions")
      .select(`
        id,
        created_at,
        started_at,
        ended_at,
        evaluated_at,
        target_skill,
        final_decision,
        technical_decision,
        integrity_decision,
        evaluation_rationale,
        termination_reason
      `)
      .eq("candidate_id", candidate.id)
      .eq("status", "EVALUATED")
      .order("evaluated_at", { ascending: false })
      .limit(10);

    if (error) {
      console.error("Error fetching interview results:", error);
      return NextResponse.json({ results: [] });
    }

    const results = (data ?? []).map((r: Record<string, unknown>) =>
      camelizeKeys<any>(r)
    );

    return NextResponse.json({ results });
  } catch (error) {
    console.error("Error fetching interview results:", error);
    return NextResponse.json(
      { error: "Failed to fetch interview results" },
      { status: 500 }
    );
  }
}
