/**
 * POST /api/jobs/sync
 *
 * ONION LAYER: Presentation (thin controller)
 * Delegates to: JobUseCases.syncJobsFromCareerSite
 *
 * Manually triggered sync of job listings from the adidas careers portal.
 * Returns immediately with a syncId; processing continues in background.
 *
 * GET /api/jobs/sync
 *
 * Returns the latest sync job status for polling.
 */

import { NextRequest, NextResponse } from "next/server";
import { after } from "next/server";
import { jobUseCases } from "@server/application";
import prisma from "@server/infrastructure/database/prisma-client";

export const dynamic = "force-dynamic";
export const maxDuration = 300; // 5 minutes max for scraping

export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}));
    const maxPages = typeof body.maxPages === "number" ? body.maxPages : 0;

    // Check if a sync is already running
    const running = await prisma.syncJob.findFirst({
      where: { type: "jobs", status: "running" },
    });
    if (running) {
      return NextResponse.json(
        { syncId: running.id, status: "already_running" },
        { status: 202 }
      );
    }

    // Create sync record
    const syncJob = await prisma.syncJob.create({
      data: { type: "jobs", status: "running" },
    });

    console.log(`[JobSync] Starting background sync (id: ${syncJob.id}, maxPages: ${maxPages})`);

    // Process in background after response is sent
    after(async () => {
      try {
        const result = await jobUseCases.syncJobsFromCareerSite(maxPages);
        await prisma.syncJob.update({
          where: { id: syncJob.id },
          data: {
            status: "completed",
            result: JSON.parse(JSON.stringify(result)),
            completedAt: new Date(),
          },
        });
        console.log(
          `[JobSync] Sync complete: ${result.created} created, ${result.updated} updated (${result.durationMs}ms)`
        );
      } catch (error) {
        console.error("[JobSync] Background sync failed:", error);
        await prisma.syncJob.update({
          where: { id: syncJob.id },
          data: {
            status: "failed",
            result: { error: error instanceof Error ? error.message : "Unknown error" },
            completedAt: new Date(),
          },
        });
      }
    });

    return NextResponse.json(
      { syncId: syncJob.id, status: "started" },
      { status: 202 }
    );
  } catch (error) {
    console.error("[JobSync] Sync failed:", error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    );
  }
}

export async function GET() {
  const latest = await prisma.syncJob.findFirst({
    where: { type: "jobs" },
    orderBy: { startedAt: "desc" },
  });

  if (!latest) {
    return NextResponse.json({ status: "none" });
  }

  return NextResponse.json({
    syncId: latest.id,
    status: latest.status,
    result: latest.result,
    startedAt: latest.startedAt,
    completedAt: latest.completedAt,
  });
}
