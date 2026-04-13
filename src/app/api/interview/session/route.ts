import { NextRequest, NextResponse } from "next/server";
import { randomUUID } from "crypto";
import { StartInterviewRuntimeSchema } from "@server/application/dtos";
import prisma from "@server/infrastructure/database/prisma-client";
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

    const candidate = await prisma.candidate.findUnique({
      where: { id: parsed.data.candidateId },
      select: {
        id: true,
        firstName: true,
        lastName: true,
      },
    });

    if (!candidate) {
      return NextResponse.json({ error: "Candidate not found" }, { status: 404 });
    }

    const interviewId = randomUUID();
    const { token, expiresAt } = createInterviewRuntimeToken({
      interviewId,
      candidateId: candidate.id,
    });

    const interview = await prisma.interviewSession.create({
      data: {
        id: interviewId,
        candidateId: candidate.id,
        targetSkill: parsed.data.targetSkill,
        status: "CREATED",
        signedTokenHash: hashInterviewToken(token),
        tokenExpiresAt: expiresAt,
      },
      select: { id: true, candidateId: true },
    });

    return NextResponse.json({
      interviewId: interview.id,
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
