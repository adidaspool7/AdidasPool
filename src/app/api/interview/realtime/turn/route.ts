import { NextRequest, NextResponse } from "next/server";
import prisma from "@server/infrastructure/database/prisma-client";
import {
  hashInterviewToken,
  verifyInterviewRuntimeToken,
} from "@server/infrastructure/security/interview-token";

function getInterviewBackendUrl(): string {
  const url = process.env.INTERVIEW_BACKEND_URL;
  if (!url) {
    throw new Error(
      "INTERVIEW_BACKEND_URL is not configured. Set it to your deployed interview backend base URL."
    );
  }
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
  rationale: {
    technical: string;
    integrity: string;
    final: string;
  };
  raw?: unknown;
};

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

    const interview = await prisma.interviewSession.findUnique({
      where: { id: body.interviewId },
      select: {
        id: true,
        candidateId: true,
        status: true,
        tokenExpiresAt: true,
        signedTokenHash: true,
      },
    });
    if (!interview || interview.id !== tokenPayload.interviewId) {
      return NextResponse.json({ error: "Interview not found" }, { status: 404 });
    }
    if (interview.candidateId !== tokenPayload.candidateId) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
    if (interview.tokenExpiresAt.getTime() < Date.now()) {
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

    const sequenceBase = await prisma.interviewTranscriptTurn.count({
      where: { interviewId: interview.id },
    });
    const turnEntries = [
      {
        interviewId: interview.id,
        role: "user",
        rawText: (turnResult.transcript_user as string) || body.userText || "",
        normalizedText: (turnResult.transcript_user as string) || body.userText || "",
        sequence: sequenceBase + 1,
      },
      {
        interviewId: interview.id,
        role: "assistant",
        rawText: (turnResult.assistant_reply as string) || "",
        normalizedText: (turnResult.assistant_reply as string) || "",
        sequence: sequenceBase + 2,
      },
    ];

    await prisma.interviewTranscriptTurn.createMany({ data: turnEntries });

    let evaluation: EvaluatorResult = DEFAULT_EVALUATION;
    if (turnResult.should_end === true) {
      const rows = await prisma.interviewTranscriptTurn.findMany({
        where: { interviewId: interview.id },
        orderBy: { sequence: "asc" },
      });

      const transcript = rows.map((r) => ({
        role: r.role === "assistant" ? "assistant" : "user",
        content: r.normalizedText || r.rawText,
      }));

      let evaluatorCandidate: {
        candidate_id: string;
        full_name?: string;
        target_skill?: string;
        skills?: Array<{ name: string; category?: string | null }>;
        projects?: Array<{
          title?: string | null;
          description: string;
          technologies: string[];
        }>;
      } = {
        candidate_id: interview.candidateId,
      };

      try {
        const candidate = await prisma.candidate.findUnique({
          where: { id: interview.candidateId },
          include: { skills: true, experiences: true },
        });

        if (candidate) {
          evaluatorCandidate = {
            candidate_id: candidate.id,
            full_name: `${candidate.firstName} ${candidate.lastName}`,
            skills: candidate.skills.map((s) => ({ name: s.name, category: s.category })),
            projects: candidate.experiences.slice(0, 5).map((e) => ({
              title: e.jobTitle,
              description: e.description || e.jobTitle || "No project details",
              technologies: [],
            })),
          };
        }
      } catch {
        // keep fallback minimal candidate payload
      }

      try {
        evaluation = await callPython("/interview/evaluate", {
          candidate: evaluatorCandidate,
          transcript,
        });
      } catch {
        evaluation = DEFAULT_EVALUATION;
      }

      const finalDecision = evaluation.final ? "PASS" : "FAIL";
      const technicalDecision = evaluation.technical.passed ? "PASS" : "FAIL";
      const integrityStatus = evaluation.integrity.status || "REVIEW";

      await prisma.interviewSession.update({
        where: { id: interview.id },
        data: {
          status: "EVALUATED",
          endedAt: new Date(),
          evaluatedAt: new Date(),
          technicalDecision,
          integrityDecision: integrityStatus,
          finalDecision,
          evaluationRationale: evaluation.rationale ?? {},
        },
      });
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
