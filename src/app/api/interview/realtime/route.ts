import { NextRequest, NextResponse } from "next/server";
import prisma from "@server/infrastructure/database/prisma-client";
import { StartInterviewRealtimeSchema } from "@server/application/dtos";
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
    const interview = await prisma.interviewSession.findUnique({
      where: { id: tokenPayload.interviewId },
      select: {
        id: true,
        candidateId: true,
        status: true,
        signedTokenHash: true,
        tokenExpiresAt: true,
      },
    });

    if (!interview || interview.candidateId !== tokenPayload.candidateId) {
      return NextResponse.json({ error: "Interview not found" }, { status: 404 });
    }
    if (interview.signedTokenHash !== hashInterviewToken(token)) {
      return NextResponse.json({ error: "Invalid token" }, { status: 401 });
    }
    if (interview.tokenExpiresAt.getTime() < Date.now()) {
      return NextResponse.json({ error: "Token expired" }, { status: 401 });
    }

    const parsed = StartInterviewRealtimeSchema.safeParse(await request.json());
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validation failed", details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const startResult = await callPython("/interview/start", {
      candidate: parsed.data.candidate,
    });

    const transcriptPayload = [
      {
        interviewId: interview.id,
        role: "assistant",
        rawText: startResult.first_question as string,
        normalizedText: startResult.first_question as string,
        sequence: 1,
      },
    ];

    await prisma.$transaction([
      prisma.interviewSession.update({
        where: { id: interview.id },
        data: {
          status: "RUNNING",
          startedAt: new Date(),
        },
      }),
      prisma.interviewTranscriptTurn.createMany({
        data: transcriptPayload,
      }),
    ]);

    return NextResponse.json({
      transport: "websocket-planned",
      fallbackMode: parsed.data.mode,
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
