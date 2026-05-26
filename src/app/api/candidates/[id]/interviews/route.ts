/**
 * GET /api/candidates/[id]/interviews
 * HR-only: returns all interview sessions for a candidate,
 * each with its full transcript and evaluation reasoning.
 */

import { NextRequest, NextResponse } from "next/server";
import db from "@server/infrastructure/database/supabase-client";
import { camelizeKeys } from "@server/infrastructure/database/db-utils";
import { createClient } from "@/lib/supabase/server";
import { createLogger } from "@server/infrastructure/logging/logger";

const log = createLogger("api/candidates/[id]/interviews");

export const dynamic = "force-dynamic";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    if ((user.user_metadata?.role as string | undefined) !== "hr") {
      return NextResponse.json({ error: "Forbidden — HR only" }, { status: 403 });
    }

    const { id: candidateId } = await params;

    // Fetch sessions with evaluation data
    const { data: sessions, error: sessionsError } = await db
      .from("interview_sessions")
      .select(`
        id,
        created_at,
        started_at,
        ended_at,
        evaluated_at,
        status,
        target_skill,
        interview_mode,
        final_decision,
        technical_decision,
        integrity_decision,
        evaluation_rationale,
        termination_reason
      `)
      .eq("candidate_id", candidateId)
      .order("created_at", { ascending: false });

    if (sessionsError) {
      log.error("Error fetching interview sessions:", sessionsError);
      return NextResponse.json({ error: "Failed to fetch sessions" }, { status: 500 });
    }

    if (!sessions?.length) {
      return NextResponse.json({ interviews: [] });
    }

    // Fetch transcripts for all sessions in one query
    const sessionIds = sessions.map((s: Record<string, unknown>) => s.id as string);
    const { data: turns } = await db
      .from("interview_transcript_turns")
      .select("id, interview_id, role, raw_text, sequence, created_at")
      .in("interview_id", sessionIds)
      .order("sequence", { ascending: true });

    // Group transcript turns by session id
    const transcriptMap: Record<string, unknown[]> = {};
    for (const turn of turns ?? []) {
      const t = turn as Record<string, unknown>;
      const sid = t.interview_id as string;
      if (!transcriptMap[sid]) transcriptMap[sid] = [];
      transcriptMap[sid].push({
        role: t.role,
        text: t.raw_text,
        sequence: t.sequence,
        createdAt: t.created_at,
      });
    }

    const interviews = sessions.map((s: Record<string, unknown>) => {
      const session = camelizeKeys<Record<string, unknown>>(s);
      return {
        ...session,
        transcript: transcriptMap[session.id as string] ?? [],
      };
    });

    return NextResponse.json({ interviews });
  } catch (error) {
    log.error("Error fetching candidate interviews:", error);
    return NextResponse.json(
      { error: "Failed to fetch interviews" },
      { status: 500 }
    );
  }
}
