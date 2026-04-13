/**
 * GET /api/interview/results
 * Returns recent evaluated interview sessions for the current candidate.
 */

import { NextResponse } from "next/server";
import prisma from "@server/infrastructure/database/prisma-client";
import { profileUseCases } from "@server/application";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const candidate = await profileUseCases.getCurrentProfile();
    if (!candidate) {
      return NextResponse.json({ results: [] });
    }

    const sessions = await prisma.interviewSession.findMany({
      where: {
        candidateId: candidate.id,
        status: "EVALUATED",
      },
      orderBy: { evaluatedAt: "desc" },
      take: 10,
      select: {
        id: true,
        createdAt: true,
        startedAt: true,
        endedAt: true,
        evaluatedAt: true,
        targetSkill: true,
        finalDecision: true,
        technicalDecision: true,
        integrityDecision: true,
        evaluationRationale: true,
        terminationReason: true,
      },
    });

    return NextResponse.json({ results: sessions });
  } catch (error) {
    console.error("Error fetching interview results:", error);
    return NextResponse.json(
      { error: "Failed to fetch interview results" },
      { status: 500 }
    );
  }
}
