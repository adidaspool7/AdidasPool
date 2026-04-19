import { NextRequest, NextResponse } from "next/server";
import { randomUUID } from "crypto";
import { StartInterviewRuntimeSchema } from "@server/application/dtos";
import db from "@server/infrastructure/database/supabase-client";
import { camelizeKeys } from "@server/infrastructure/database/db-utils";
import {
  createInterviewRuntimeToken,
  hashInterviewToken,
} from "@server/infrastructure/security/interview-token";

export async function POST(request: NextRequest) {
  try {
    const parsed = StartInterviewRuntimeSchema.safeParse(await request.json());
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validation failed", details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const { data: candidateRow, error: candidateError } = await db
      .from("candidates")
      .select("id, first_name, last_name")
      .eq("id", parsed.data.candidateId)
      .single();

    if (candidateError || !candidateRow) {
      return NextResponse.json({ error: "Candidate not found" }, { status: 404 });
    }

    const candidate = camelizeKeys<any>(candidateRow as Record<string, unknown>);

    const interviewId = randomUUID();
    const { token, expiresAt } = createInterviewRuntimeToken({
      interviewId,
      candidateId: candidate.id,
    });

    const { error: insertError } = await db.from("interview_sessions").insert({
      id: interviewId,
      candidate_id: candidate.id,
      target_skill: parsed.data.targetSkill ?? null,
      status: "CREATED",
      signed_token_hash: hashInterviewToken(token),
      token_expires_at: expiresAt.toISOString(),
    });

    if (insertError) {
      console.error("Error creating interview session:", insertError);
      return NextResponse.json(
        { error: "Failed to create interview session" },
        { status: 500 }
      );
    }

    // Set interview_mode separately — column added by Phase 4 migration.
    // If the migration has not been run yet, this update is silently skipped.
    if (parsed.data.interviewMode && parsed.data.interviewMode !== "TECHNICAL") {
      await db
        .from("interview_sessions")
        .update({ interview_mode: parsed.data.interviewMode })
        .eq("id", interviewId)
        .then(() => null, () => null);
    }

    return NextResponse.json({
      interviewId,
      token,
      expiresAt: expiresAt.toISOString(),
      candidateName: `${candidate.firstName} ${candidate.lastName}`,
    });
  } catch (error) {
    console.error("Error creating interview runtime session:", error);
    return NextResponse.json(
      { error: "Failed to create interview runtime session" },
      { status: 500 }
    );
  }
}
