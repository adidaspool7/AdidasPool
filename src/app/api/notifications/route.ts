/**
 * GET /api/notifications     — scoped listing (auth-derived role/candidateId)
 * PATCH /api/notifications   — mark as read / mark all as read / archive
 * DELETE /api/notifications  — delete a single notification by id
 *
 * ONION LAYER: Presentation (thin controller)
 * Delegates to: NotificationUseCases
 *
 * AUTH MODEL (post-audit C1, 2026-05):
 *   - Caller resolved server-side via Supabase session cookie.
 *   - Client query params `role` / `candidateId` / `targetRole` are IGNORED
 *     for authorization — they are no longer trusted. Any mutation requires
 *     the caller to own the target row:
 *       * HR can only mutate notifications targeted to HR (target_role = 'HR'
 *         or null).
 *       * Candidates can only mutate notifications belonging to their
 *         candidateId AND targeted to candidates (target_role = 'CANDIDATE'
 *         or null).
 *
 * Query params (GET):
 *   countOnly=true      (optional — fast path for sidebar badge)
 *   unread=true         (optional — filter unread only)
 *   archived=true|false (optional — filter archived state)
 *   type=JOB_POSTED     (optional — filter by type)
 *   limit=50            (optional)
 *   offset=0            (optional)
 */

import { NextRequest, NextResponse } from "next/server";
import { notificationUseCases } from "@server/application";
import { resolveCaller, type AuthenticatedCaller } from "@/lib/auth/resolve-caller";
import { createLogger } from "@server/infrastructure/logging/logger";

const log = createLogger("api/notifications");

/**
 * Returns true iff the caller is allowed to mutate (read/archive/delete)
 * the given notification row. A row with target_role=null is considered
 * a system notification visible to whoever owns the candidate_id.
 */
function callerOwnsNotification(
  caller: AuthenticatedCaller,
  notification: { candidateId?: string | null; targetRole?: string | null }
): boolean {
  const targetRole = notification.targetRole ?? null;

  if (caller.kind === "hr") {
    return targetRole === "HR" || targetRole === null;
  }

  // Candidate: must match candidateId AND target must be candidate-scoped.
  if (!caller.candidateId) return false;
  if (notification.candidateId !== caller.candidateId) return false;
  return targetRole === "CANDIDATE" || targetRole === null;
}

export async function GET(request: NextRequest) {
  const auth = await resolveCaller();
  if (auth.response) return auth.response;
  const caller = auth.caller;

  try {
    const { searchParams } = request.nextUrl;
    const countOnly = searchParams.get("countOnly") === "true";
    const unread = searchParams.get("unread") === "true";
    const archived = searchParams.get("archived");
    const type = searchParams.get("type") || undefined;
    const rawLimit = parseInt(searchParams.get("limit") || "100", 10);
    const rawOffset = parseInt(searchParams.get("offset") || "0", 10);
    const limit = Number.isNaN(rawLimit) ? 100 : rawLimit;
    const offset = Number.isNaN(rawOffset) ? 0 : rawOffset;

    // Fast path: only return unread count (for sidebar badge)
    if (countOnly) {
      if (caller.kind === "candidate") {
        if (!caller.candidateId) return NextResponse.json({ unreadCount: 0 });
        const unreadCount = await notificationUseCases.countUnread(
          caller.candidateId,
          "CANDIDATE"
        );
        return NextResponse.json({ unreadCount });
      }
      const unreadCount = await notificationUseCases.countUnread(undefined, "HR");
      return NextResponse.json({ unreadCount });
    }

    const filters: Record<string, unknown> = { unread: unread || undefined, type, limit, offset };
    if (archived !== null) filters.archived = archived === "true";

    if (caller.kind === "candidate") {
      if (!caller.candidateId) {
        return NextResponse.json({ notifications: [], unreadCount: 0 });
      }
      const notifications = await notificationUseCases.listForCandidate(
        caller.candidateId,
        filters
      );
      const unreadCount = await notificationUseCases.countUnread(
        caller.candidateId,
        "CANDIDATE"
      );
      // Enrich promotional notifications with isPinned from their campaign
      type NotificationRow = {
        campaignId?: string | null;
        createdAt: string;
        [key: string]: unknown;
      };
      const list = notifications as NotificationRow[];
      const campaignIds = [
        ...new Set(
          list.filter((n) => n.campaignId).map((n) => n.campaignId as string)
        ),
      ];
      const pinnedSet = new Set<string>();
      const archivedSet = new Set<string>();
      const campaigns = await Promise.all(
        campaignIds.map((cid) => notificationUseCases.getCampaign(cid))
      );
      campaignIds.forEach((cid, i) => {
        const campaign = campaigns[i];
        if (campaign?.isPinned) pinnedSet.add(cid);
        if (campaign?.status === "ARCHIVED") archivedSet.add(cid);
      });
      const visible = list.filter(
        (n) => !n.campaignId || !archivedSet.has(n.campaignId)
      );
      const enriched = visible.map((n) => ({
        ...n,
        isPinned: n.campaignId ? pinnedSet.has(n.campaignId) : false,
      }));
      enriched.sort((a, b) => {
        if (a.isPinned && !b.isPinned) return -1;
        if (!a.isPinned && b.isPinned) return 1;
        return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      });
      return NextResponse.json({ notifications: enriched, unreadCount });
    }

    // HR
    const notifications = await notificationUseCases.listForHR(filters);
    const unreadCount = await notificationUseCases.countUnread(undefined, "HR");
    return NextResponse.json({ notifications, unreadCount });
  } catch (error) {
    log.error("Error fetching notifications:", error);
    return NextResponse.json(
      { error: "Failed to fetch notifications" },
      { status: 500 }
    );
  }
}

export async function PATCH(request: NextRequest) {
  const auth = await resolveCaller();
  if (auth.response) return auth.response;
  const caller = auth.caller;

  try {
    const body = await request.json();
    const { id, markAllRead, archive, archiveIds } = body as {
      id?: string;
      markAllRead?: boolean;
      archive?: boolean;
      archiveIds?: unknown;
    };

    // Archive a single notification
    if (archive && id) {
      const existing = await notificationUseCases.getById(id);
      if (!existing) {
        return NextResponse.json({ error: "Not found" }, { status: 404 });
      }
      if (!callerOwnsNotification(caller, existing)) {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
      }
      const updated = await notificationUseCases.archiveNotification(id);
      return NextResponse.json(updated);
    }

    // Archive multiple notifications — verify each is owned by the caller.
    if (Array.isArray(archiveIds)) {
      const ids = archiveIds.filter((x): x is string => typeof x === "string");
      if (ids.length === 0) {
        return NextResponse.json({ success: true, archived: 0 });
      }
      const owned: string[] = [];
      for (const nid of ids) {
        const existing = await notificationUseCases.getById(nid);
        if (existing && callerOwnsNotification(caller, existing)) {
          owned.push(nid);
        }
      }
      if (owned.length === 0) {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
      }
      const count = await notificationUseCases.archiveMany(owned);
      return NextResponse.json({ success: true, archived: count });
    }

    if (markAllRead) {
      // Caller-derived only — body candidateId/targetRole no longer trusted.
      if (caller.kind === "candidate") {
        if (!caller.candidateId) return NextResponse.json({ success: true });
        await notificationUseCases.markAllAsRead(caller.candidateId, "CANDIDATE");
      } else {
        await notificationUseCases.markAllAsRead(undefined, "HR");
      }
      return NextResponse.json({ success: true });
    }

    if (!id) {
      return NextResponse.json({ error: "id is required" }, { status: 400 });
    }

    const existing = await notificationUseCases.getById(id);
    if (!existing) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }
    if (!callerOwnsNotification(caller, existing)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
    const updated = await notificationUseCases.markAsRead(id);
    return NextResponse.json(updated);
  } catch (error) {
    log.error("Error updating notification:", error);
    return NextResponse.json(
      { error: "Failed to update notification" },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  const auth = await resolveCaller();
  if (auth.response) return auth.response;
  const caller = auth.caller;

  try {
    const { searchParams } = request.nextUrl;
    const id = searchParams.get("id");
    if (!id) {
      return NextResponse.json({ error: "id is required" }, { status: 400 });
    }
    const existing = await notificationUseCases.getById(id);
    if (!existing) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }
    if (!callerOwnsNotification(caller, existing)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
    await notificationUseCases.deleteNotification(id);
    return NextResponse.json({ success: true });
  } catch (error) {
    log.error("Error deleting notification:", error);
    return NextResponse.json(
      { error: "Failed to delete notification" },
      { status: 500 }
    );
  }
}
