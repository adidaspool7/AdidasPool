import { NextRequest, NextResponse } from "next/server";
import db from "@server/infrastructure/database/supabase-client";
import { camelizeKeys } from "@server/infrastructure/database/db-utils";
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
  technical: { passed: boolean };
  integrity: { status: "CLEAR" | "REVIEW" | "FAIL" };
  final: boolean;
  rationale: { technical: string; integrity: string; final: string };
  raw?: unknown;
};

async function callPython(
  path: string,
  payload: unknown
): Promise<EvaluatorResult> {
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
  return response.json() as Promise<EvaluatorResult>;
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
      reason?: string;
    };

    if (!body.interviewId) {
      return NextResponse.json(
        { error: "interviewId is required" },
        { status: 400 }
      );
    }

    const { data: sessionRow, error: sessionError } = await db
      .from("interview_sessions")
      .select("id, candidate_id, status, token_expires_at, signed_token_hash")
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
    if (interview.status === "EVALUATED") {
      return NextResponse.json(
        { error: "Interview already evaluated" },
        { status: 409 }
      );
    }

    // Fetch transcript
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
    } catch (candidateError) {
      console.error("Error fetching candidate for evaluation:", candidateError);
    }

    let evaluation: EvaluatorResult = DEFAULT_EVALUATION;
    if (transcript.length > 0) {
      try {
        evaluation = await callPython("/interview/evaluate", {
          candidate: evaluatorCandidate,
          transcript,
        });
      } catch (evalError) {
        console.error("Evaluator call failed:", evalError);
        evaluation = DEFAULT_EVALUATION;
      }
    }

    const finalDecision = evaluation.final ? "PASS" : "FAIL";
    const technicalDecision = evaluation.technical.passed ? "PASS" : "FAIL";
    const integrityStatus = evaluation.integrity.status || "REVIEW";
    const terminationReason = body.reason || "user_early_exit";

    await db.from("interview_sessions").update({
      status: "EVALUATED",
      ended_at: new Date().toISOString(),
      evaluated_at: new Date().toISOString(),
      technical_decision: technicalDecision,
      integrity_decision: integrityStatus,
      final_decision: finalDecision,
      evaluation_rationale: evaluation.rationale ?? {},
      termination_reason: terminationReason,
    }).eq("id", interview.id);

    return NextResponse.json({
      terminated: true,
      evaluation,
      finalDecision,
      technicalDecision,
      integrityDecision: integrityStatus,
      rationale: evaluation.rationale,
    });
  } catch (error) {
    console.error("Error terminating interview:", error);
    const message =
      error instanceof Error ? error.message : "Failed to terminate interview";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
