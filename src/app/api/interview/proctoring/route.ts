import { NextRequest, NextResponse } from "next/server";
import { InterviewProctoringEventSchema } from "@server/application/dtos";
import db from "@server/infrastructure/database/supabase-client";
import { camelizeKeys, generateId } from "@server/infrastructure/database/db-utils";
import {
  hashInterviewToken,
  verifyInterviewRuntimeToken,
} from "@server/infrastructure/security/interview-token";

export async function POST(request: NextRequest) {
  try {
    const authHeader = request.headers.get("authorization");
    const token = authHeader?.startsWith("Bearer ")
      ? authHeader.slice("Bearer ".length)
      : null;

    if (!token) {
      return NextResponse.json({ error: "Missing bearer token" }, { status: 401 });
    }

    const payload = verifyInterviewRuntimeToken(token);
    const body = await request.json();
    const parsed = InterviewProctoringEventSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validation failed", details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const { data: sessionRow, error: sessionError } = await db
      .from("interview_sessions")
      .select("id, candidate_id, signed_token_hash, token_expires_at")
      .eq("id", payload.interviewId)
      .single();

    if (sessionError || !sessionRow) {
      return NextResponse.json({ error: "Interview not found" }, { status: 404 });
    }

    const interview = camelizeKeys<any>(sessionRow as Record<string, unknown>);

    if (interview.candidateId !== payload.candidateId) {
      return NextResponse.json({ error: "Interview not found" }, { status: 404 });
    }
    if (interview.signedTokenHash !== hashInterviewToken(token)) {
      return NextResponse.json({ error: "Invalid token" }, { status: 401 });
    }
    if (new Date(interview.tokenExpiresAt).getTime() < Date.now()) {
      return NextResponse.json({ error: "Token expired" }, { status: 401 });
    }

    const occurredAt = parsed.data.occurredAt
      ? new Date(parsed.data.occurredAt).toISOString()
      : new Date().toISOString();

    const { error: insertError } = await db
      .from("interview_proctoring_events")
      .insert({
        id: generateId(),
        interview_id: interview.id,
        event_type: parsed.data.eventType,
        severity: parsed.data.severity,
        details: parsed.data.details ?? {},
        occurred_at: occurredAt,
      });

    if (insertError) {
      console.error("Error inserting proctoring event:", insertError);
      return NextResponse.json(
        { error: "Failed to store proctoring event" },
        { status: 500 }
      );
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("Error ingesting proctoring event:", error);
    return NextResponse.json(
      { error: "Failed to ingest proctoring event" },
      { status: 500 }
    );
  }
}
