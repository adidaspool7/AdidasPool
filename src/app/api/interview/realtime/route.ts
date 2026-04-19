import { NextRequest, NextResponse } from "next/server";
import db from "@server/infrastructure/database/supabase-client";
import { camelizeKeys, generateId } from "@server/infrastructure/database/db-utils";
import { StartInterviewRealtimeSchema } from "@server/application/dtos";
import {
  hashInterviewToken,
  verifyInterviewRuntimeToken,
} from "@server/infrastructure/security/interview-token";

type InterviewSessionPayload = {
  id: string;
  candidateId: string;
  status: string;
  signedTokenHash: string;
  tokenExpiresAt: string;
  targetSkill: string | null;
  interviewMode?: string | null;
};

function getInterviewBackendUrl(): string {
  const url = process.env.INTERVIEW_BACKEND_URL;
  if (!url) {
    throw new Error(
      "INTERVIEW_BACKEND_URL is not configured. Set it to your deployed interview backend base URL."
    );
  }
  return url.replace(/\/+$/, "");
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
    throw new Error(
      `Interview backend call failed (${response.status}) at ${targetUrl}: ${text || "No response body"}`
    );
  }

  return response.json();
}

function normalizeSkillString(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
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

    const { data: sessionRow, error: sessionError } = await db
      .from("interview_sessions")
      .select("id, candidate_id, status, signed_token_hash, token_expires_at, target_skill")
      .eq("id", tokenPayload.interviewId)
      .single();

    if (sessionError || !sessionRow) {
      return NextResponse.json({ error: "Interview not found" }, { status: 404 });
    }

    const interview = camelizeKeys<InterviewSessionPayload>(
      sessionRow as Record<string, unknown>
    );

    if (interview.candidateId !== tokenPayload.candidateId) {
      return NextResponse.json({ error: "Interview not found" }, { status: 404 });
    }
    if (interview.signedTokenHash !== hashInterviewToken(token)) {
      return NextResponse.json({ error: "Invalid token" }, { status: 401 });
    }
    if (new Date(interview.tokenExpiresAt).getTime() < Date.now()) {
      return NextResponse.json({ error: "Token expired" }, { status: 401 });
    }

    const parsed = StartInterviewRealtimeSchema.safeParse(await request.json());
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validation failed", details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    // Enforce mode from session; default to TECHNICAL
    const enforcedMode = (interview.interviewMode === "LANGUAGE" ? "LANGUAGE" : "TECHNICAL") as
      | "TECHNICAL"
      | "LANGUAGE";

    // For LANGUAGE mode, skip skill scoping — there is no target skill
    let enforcedTargetSkill: string | null = null;
    let scopedCandidateSkills = parsed.data.candidate.skills;

    if (enforcedMode === "TECHNICAL") {
      const normalizedSessionTargetSkill = normalizeSkillString(interview.targetSkill);
      const normalizedRequestTargetSkill = normalizeSkillString(
        parsed.data.candidate.target_skill
      );
      enforcedTargetSkill = normalizedSessionTargetSkill ?? normalizedRequestTargetSkill;

      const normalizedCandidateSkills = parsed.data.candidate.skills.map((skill) => ({
        ...skill,
        normalizedName: normalizeSkillString(skill.name)?.toLowerCase() ?? null,
      }));

      if (enforcedTargetSkill) {
        const targetLower = enforcedTargetSkill.toLowerCase();
        const matchingSkills = normalizedCandidateSkills
          .filter((skill) => skill.normalizedName === targetLower)
          .map((skill) => ({ name: skill.name, category: skill.category }));
        scopedCandidateSkills =
          matchingSkills.length > 0
            ? matchingSkills
            : [{ name: enforcedTargetSkill, category: null }];
      }
    }

    const startResult = await callPython("/interview/start", {
      candidate: {
        ...parsed.data.candidate,
        target_skill: enforcedTargetSkill,
        skills: scopedCandidateSkills,
        mode: enforcedMode,
      },
    });

    // Update session status + insert first transcript turn
    await Promise.all([
      db
        .from("interview_sessions")
        .update({ status: "RUNNING", started_at: new Date().toISOString() })
        .eq("id", interview.id),
      db.from("interview_transcript_turns").insert({
        id: generateId(),
        interview_id: interview.id,
        role: "assistant",
        raw_text: startResult.first_question as string,
        normalized_text: startResult.first_question as string,
        sequence: 1,
      }),
    ]);

    return NextResponse.json({
      transport: "websocket-planned",
      fallbackMode: parsed.data.mode,
      interviewMode: enforcedMode,
      session: {
        interviewId: interview.id,
        aiSessionId: startResult.session_id,
        status: "running",
      },
      firstQuestion: startResult.first_question,
      audioBase64: startResult.audio_base64 ?? null,
      audioMimeType: startResult.audio_mime_type ?? null,
      next: {
        turnEndpoint: "/api/interview/realtime/turn",
      },
    });
  } catch (error) {
    console.error("Error starting realtime interview:", error);
    const message =
      error instanceof Error ? error.message : "Failed to start realtime interview";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
