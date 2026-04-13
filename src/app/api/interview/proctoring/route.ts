import { Prisma } from "@prisma/client";
import { NextRequest, NextResponse } from "next/server";
import { InterviewProctoringEventSchema } from "@server/application/dtos";
import prisma from "@server/infrastructure/database/prisma-client";
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

    const interview = await prisma.interviewSession.findUnique({
      where: { id: payload.interviewId },
      select: {
        id: true,
        candidateId: true,
        signedTokenHash: true,
        tokenExpiresAt: true,
      },
    });

    if (!interview || interview.candidateId !== payload.candidateId) {
      return NextResponse.json({ error: "Interview not found" }, { status: 404 });
    }
    if (interview.signedTokenHash !== hashInterviewToken(token)) {
      return NextResponse.json({ error: "Invalid token" }, { status: 401 });
    }
    if (interview.tokenExpiresAt.getTime() < Date.now()) {
      return NextResponse.json({ error: "Token expired" }, { status: 401 });
    }

    const occurredAt = parsed.data.occurredAt
      ? new Date(parsed.data.occurredAt)
      : new Date();

    await prisma.interviewProctoringEvent.create({
      data: {
        interviewId: interview.id,
        eventType: parsed.data.eventType,
        severity: parsed.data.severity,
        details: (parsed.data.details ?? {}) as Prisma.InputJsonValue,
        occurredAt,
      },
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("Error ingesting proctoring event:", error);
    return NextResponse.json(
      { error: "Failed to ingest proctoring event" },
      { status: 500 }
    );
  }
}
