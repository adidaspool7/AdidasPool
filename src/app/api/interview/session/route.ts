import { NextRequest, NextResponse } from "next/server";
import { randomUUID } from "crypto";
import { StartInterviewRuntimeSchema } from "@server/application/dtos";
import db from "@server/infrastructure/database/supabase-client";
import { camelizeKeys } from "@server/infrastructure/database/db-utils";
import { createClient } from "@/lib/supabase/server";
import {
  createInterviewRuntimeToken,
  hashInterviewToken,
} from "@server/infrastructure/security/interview-token";
import { createLogger } from "@server/infrastructure/logging/logger";

const log = createLogger("api/interview/session");

export async function POST(request: NextRequest) {
  try {
    // Audit H5: bind the runtime token to the authenticated user so a
    // leaked token cannot be replayed from another browser/session.
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const parsed = StartInterviewRuntimeSchema.safeParse(await request.json());
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validation failed", details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const { data: candidateRow, error: candidateError } = await db
      .from("candidates")
      .select("id, first_name, last_name, user_id")
      .eq("id", parsed.data.candidateId)
      .single();

    if (candidateError || !candidateRow) {
      return NextResponse.json({ error: "Candidate not found" }, { status: 404 });
    }

    const candidate = camelizeKeys<any>(candidateRow as Record<string, unknown>);

    // Only the candidate themselves may launch their interview runtime.
    if (candidate.userId && candidate.userId !== user.id) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const interviewId = randomUUID();
    const { token, expiresAt } = createInterviewRuntimeToken({
      interviewId,
      candidateId: candidate.id,
      userId: user.id,
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
      log.error("Error creating interview session:", insertError);
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
    log.error("Error creating interview runtime session:", error);
    return NextResponse.json(
      { error: "Failed to create interview runtime session" },
      { status: 500 }
    );
  }
}
