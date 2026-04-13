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

async function callPython(path: string, payload: unknown): Promise<EvaluatorResult> {
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
      return NextResponse.json({ error: "interviewId is required" }, { status: 400 });
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
    if (interview.status === "EVALUATED") {
      return NextResponse.json({ error: "Interview already evaluated" }, { status: 409 });
    }

    // Fetch transcript for evaluation
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
    } catch (candidateError) {
      console.error("Error fetching candidate details for evaluation:", candidateError);
      // keep fallback minimal candidate payload
    }

    let evaluation: EvaluatorResult = DEFAULT_EVALUATION;
    // Only call evaluator if there is transcript content
    if (transcript.length > 0) {
      try {
        evaluation = await callPython("/interview/evaluate", {
          candidate: evaluatorCandidate,
          transcript,
        });
      } catch (evalError) {
        console.error("Evaluator call failed, using default evaluation:", evalError);
        evaluation = DEFAULT_EVALUATION;
      }
    }

    const finalDecision = evaluation.final ? "PASS" : "FAIL";
    const technicalDecision = evaluation.technical.passed ? "PASS" : "FAIL";
    const integrityStatus = evaluation.integrity.status || "REVIEW";
    const terminationReason = body.reason || "user_early_exit";

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
        terminationReason,
      },
    });

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
