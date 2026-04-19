import { NextRequest, NextResponse } from "next/server";
import db from "@server/infrastructure/database/supabase-client";
import { camelizeKeys, generateId } from "@server/infrastructure/database/db-utils";
import {
  hashInterviewToken,
  verifyInterviewRuntimeToken,
} from "@server/infrastructure/security/interview-token";

function getInterviewBackendUrl(): string {
  const url = process.env.INTERVIEW_BACKEND_URL;
  if (!url) throw new Error("INTERVIEW_BACKEND_URL is not configured.");
  return url.replace(/\/+$/, "");
}

const DEFAULT_EVALUATION = {
  technical: { passed: false },
  integrity: { status: "REVIEW" as const },
  final: false,
  rationale: {
    technical: "Evaluation unavailable",
    integrity: "Evaluation unavailable",
    final: "Fallback decision",
  },
};

type EvaluatorResult = {
  technical: { passed: boolean; cefr_level?: string; grammar?: string; vocabulary?: string; fluency?: string };
  integrity: { status: "CLEAR" | "REVIEW" | "FAIL" };
  final: boolean;
  evidence?: string[];
  turn_count?: number;
  rationale: { technical: string; integrity: string; final: string };
  raw?: unknown;
};

/**
 * After a TECHNICAL interview is evaluated, update the matching skill row
 * on the candidate's profile with the AI decision.
 * Silently no-ops if the skill row is not found or the column doesn't exist yet.
 */
async function syncSkillVerification({
  candidateId,
  skillName,
  decision,
}: {
  candidateId: string;
  skillName: string;
  decision: "PASS" | "FAIL";
}): Promise<void> {
  try {
    const newStatus = decision === "PASS" ? "PASSED" : "FAILED";
    // Find the skill row by candidate + case-insensitive name match
    const { data: rows } = await db
      .from("skills")
      .select("id")
      .eq("candidate_id", candidateId)
      .ilike("name", skillName)
      .limit(1);

    if (!rows?.length) return;

    await db
      .from("skills")
      .update({
        verification_status: newStatus,
        verified_at: new Date().toISOString(),
        verified_by: "AI",
      })
      .eq("id", rows[0].id)
      .then(() => null, () => null); // silent if column missing before migration
  } catch {
    // best-effort — never block interview result from saving
  }
}

async function callPython(path: string, payload: unknown) {
  const baseUrl = getInterviewBackendUrl();
  const targetUrl = `${baseUrl}${path}`;
  let response: Response;
  try {
    response = await fetch(targetUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
      cache: "no-store",
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown network error";
    throw new Error(`Interview backend unreachable at ${targetUrl}: ${message}`);
  }
  if (!response.ok) {
    const text = await response.text().catch(() => "");
    throw new Error(`Interview backend call failed (${response.status}): ${text}`);
  }
  return response.json();
}

export async function POST(request: NextRequest) {
  try {
    const authHeader = request.headers.get("authorization");
    const token = authHeader?.startsWith("Bearer ")
      ? authHeader.slice("Bearer ".length)
      : null;
    if (!token) {
      return NextResponse.json({ error: "Missing bearer token" }, { status: 401 });
    }

    const tokenPayload = verifyInterviewRuntimeToken(token);
    const body = (await request.json()) as {
      interviewId?: string;
      aiSessionId?: string;
      userText?: string;
      userAudioBase64?: string;
      mode?: "text" | "voice";
    };

    if (!body.interviewId || !body.aiSessionId) {
      return NextResponse.json(
        { error: "interviewId and aiSessionId are required" },
        { status: 400 }
      );
    }
    if (!body.userText && !body.userAudioBase64) {
      return NextResponse.json(
        { error: "userText or userAudioBase64 is required" },
        { status: 400 }
      );
    }

    const { data: sessionRow, error: sessionError } = await db
      .from("interview_sessions")
      .select("id, candidate_id, status, token_expires_at, signed_token_hash, target_skill")
      .eq("id", body.interviewId)
      .single();

    if (sessionError || !sessionRow) {
      return NextResponse.json({ error: "Interview not found" }, { status: 404 });
    }

    const interview = camelizeKeys<any>(sessionRow as Record<string, unknown>);

    if (interview.id !== tokenPayload.interviewId) {
      return NextResponse.json({ error: "Interview not found" }, { status: 404 });
    }
    if (interview.candidateId !== tokenPayload.candidateId) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
    if (new Date(interview.tokenExpiresAt).getTime() < Date.now()) {
      return NextResponse.json({ error: "Token expired" }, { status: 401 });
    }
    if (interview.signedTokenHash !== hashInterviewToken(token)) {
      return NextResponse.json({ error: "Invalid token" }, { status: 401 });
    }

    const turnResult = await callPython("/interview/turn", {
      session_id: body.aiSessionId,
      user_text: body.userText,
      user_audio_base64: body.userAudioBase64,
    });

    // Get current sequence count
    const { count: sequenceBase } = await db
      .from("interview_transcript_turns")
      .select("*", { count: "exact", head: true })
      .eq("interview_id", interview.id);

    const base = sequenceBase ?? 0;

    await db.from("interview_transcript_turns").insert([
      {
        id: generateId(),
        interview_id: interview.id,
        role: "user",
        raw_text: (turnResult.transcript_user as string) || body.userText || "",
        normalized_text: (turnResult.transcript_user as string) || body.userText || "",
        sequence: base + 1,
      },
      {
        id: generateId(),
        interview_id: interview.id,
        role: "assistant",
        raw_text: (turnResult.assistant_reply as string) || "",
        normalized_text: (turnResult.assistant_reply as string) || "",
        sequence: base + 2,
      },
    ]);

    let evaluation: EvaluatorResult = DEFAULT_EVALUATION;

    if (turnResult.should_end === true) {
      const { data: rows } = await db
        .from("interview_transcript_turns")
        .select("role, normalized_text, raw_text")
        .eq("interview_id", interview.id)
        .order("sequence", { ascending: true });

      const transcript = (rows ?? []).map((r: any) => ({
        role: r.role === "assistant" ? "assistant" : "user",
        content: (r.normalized_text || r.raw_text) as string,
      }));

      let evaluatorCandidate: Record<string, unknown> = {
        candidate_id: interview.candidateId,
      };

      try {
        const { data: candidateRow } = await db
          .from("candidates")
          .select("id, first_name, last_name, skills(*), experiences(*)")
          .eq("id", interview.candidateId)
          .single();

        if (candidateRow) {
          const c = camelizeKeys<any>(candidateRow as Record<string, unknown>);
          evaluatorCandidate = {
            candidate_id: c.id,
            full_name: `${c.firstName} ${c.lastName}`,
            skills: (c.skills ?? []).map((s: any) => ({
              name: s.name,
              category: s.category,
            })),
            projects: (c.experiences ?? []).slice(0, 5).map((e: any) => ({
              title: e.jobTitle,
              description: e.description || e.jobTitle || "No project details",
              technologies: [],
            })),
          };
        }
      } catch {
        // keep fallback minimal payload
      }

      const sessionMode = (interview as { interviewMode?: string }).interviewMode === "LANGUAGE"
        ? "LANGUAGE"
        : "TECHNICAL";

      try {
        evaluation = await callPython("/interview/evaluate", {
          candidate: evaluatorCandidate,
          transcript,
          mode: sessionMode,
        });
      } catch {
        evaluation = DEFAULT_EVALUATION;
      }

      const finalDecision = evaluation.final ? "PASS" : "FAIL";
      const technicalDecision = evaluation.technical.passed ? "PASS" : "FAIL";
      const integrityStatus = evaluation.integrity.status || "REVIEW";

      const rationaleWithMeta: Record<string, unknown> = { ...(evaluation.rationale ?? {}) };
      if (evaluation.technical.cefr_level) rationaleWithMeta.cefr_level = evaluation.technical.cefr_level;
      if (evaluation.technical.grammar) rationaleWithMeta.grammar = evaluation.technical.grammar;
      if (evaluation.technical.vocabulary) rationaleWithMeta.vocabulary = evaluation.technical.vocabulary;
      if (evaluation.technical.fluency) rationaleWithMeta.fluency = evaluation.technical.fluency;
      if (evaluation.turn_count !== undefined) rationaleWithMeta.turn_count = evaluation.turn_count;
      if (evaluation.evidence?.length) rationaleWithMeta.evidence = evaluation.evidence;

      await db.from("interview_sessions").update({
        status: "EVALUATED",
        ended_at: new Date().toISOString(),
        evaluated_at: new Date().toISOString(),
        technical_decision: technicalDecision,
        integrity_decision: integrityStatus,
        final_decision: finalDecision,
        evaluation_rationale: rationaleWithMeta,
      }).eq("id", interview.id);

      // Sync skill verification status for TECHNICAL mode with a target skill
      if (interview.targetSkill) {
        await syncSkillVerification({
          candidateId: interview.candidateId as string,
          skillName: interview.targetSkill as string,
          decision: finalDecision,
        });
      }
    }

    return NextResponse.json({
      ...turnResult,
      evaluation: turnResult.should_end === true ? evaluation : null,
      mode: body.mode ?? "text",
      voiceFallback:
        body.mode === "voice" && !turnResult.audio_base64 ? "text-only" : null,
    });
  } catch (error) {
    console.error("Error handling realtime interview turn:", error);
    const message =
      error instanceof Error ? error.message : "Failed to process interview turn";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
