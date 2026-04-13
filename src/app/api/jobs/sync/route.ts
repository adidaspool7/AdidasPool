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
import db from "@server/infrastructure/database/supabase-client";
import { generateId, camelizeKeys } from "@server/infrastructure/database/db-utils";

export const dynamic = "force-dynamic";
export const maxDuration = 300; // 5 minutes max for scraping

export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}));
    const maxPages = typeof body.maxPages === "number" ? body.maxPages : 0;

    // Check if a sync is already running
    const { data: running } = await db
      .from("sync_jobs")
      .select("id, status")
      .eq("type", "jobs")
      .eq("status", "running")
      .limit(1)
      .single();

    if (running) {
      return NextResponse.json(
        { syncId: running.id, status: "already_running" },
        { status: 202 }
      );
    }

    // Create sync record
    const syncId = generateId();
    const { data: syncJob, error } = await db
      .from("sync_jobs")
      .insert({ id: syncId, type: "jobs", status: "running" })
      .select()
      .single();

    if (error || !syncJob) {
      throw new Error("Failed to create sync job record");
    }

    console.log(`[JobSync] Starting background sync (id: ${syncId}, maxPages: ${maxPages})`);

    // Process in background after response is sent
    after(async () => {
      try {
        const result = await jobUseCases.syncJobsFromCareerSite(maxPages);
        await db.from("sync_jobs").update({
          status: "completed",
          result: JSON.parse(JSON.stringify(result)),
          completed_at: new Date().toISOString(),
        }).eq("id", syncId);
        console.log(
          `[JobSync] Sync complete: ${result.created} created, ${result.updated} updated (${result.durationMs}ms)`
        );
      } catch (error) {
        console.error("[JobSync] Background sync failed:", error);
        await db.from("sync_jobs").update({
          status: "failed",
          result: { error: error instanceof Error ? error.message : "Unknown error" },
          completed_at: new Date().toISOString(),
        }).eq("id", syncId);
      }
    });

    return NextResponse.json(
      { syncId, status: "started" },
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
  const { data: latest } = await db
    .from("sync_jobs")
    .select("*")
    .eq("type", "jobs")
    .order("started_at", { ascending: false })
    .limit(1)
    .single();

  if (!latest) {
    return NextResponse.json({ status: "none" });
  }

  const job = camelizeKeys<any>(latest as Record<string, unknown>);

  return NextResponse.json({
    syncId: job.id,
    status: job.status,
    result: job.result,
    startedAt: job.startedAt,
    completedAt: job.completedAt,
  });
}
