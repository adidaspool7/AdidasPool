/**
 * GET /api/notifications  — scoped listing (candidate or HR)
 * PATCH /api/notifications — mark as read / mark all as read
 *
 * ONION LAYER: Presentation (thin controller)
 * Delegates to: NotificationUseCases
 *
 * Query params:
 *   role=candidate|hr  (required for scoping)
 *   candidateId=...    (required when role=candidate)
 *   unread=true        (optional — filter unread only)
 *   type=JOB_POSTED    (optional — filter by type)
 *   limit=50           (optional)
 *   offset=0           (optional)
 */

import { NextRequest, NextResponse } from "next/server";
import { notificationUseCases } from "@server/application";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = request.nextUrl;
    const role = searchParams.get("role");
    const candidateId = searchParams.get("candidateId");
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
      if (role === "candidate" && candidateId) {
        const unreadCount = await notificationUseCases.countUnread(candidateId, "CANDIDATE");
        return NextResponse.json({ unreadCount });
      }
      if (role === "hr") {
        const unreadCount = await notificationUseCases.countUnread(undefined, "HR");
        return NextResponse.json({ unreadCount });
      }
      return NextResponse.json({ unreadCount: 0 });
    }

    const filters: Record<string, unknown> = { unread: unread || undefined, type, limit, offset };
    if (archived !== null) filters.archived = archived === "true";

    if (role === "candidate") {
      if (!candidateId) {
        return NextResponse.json(
          { error: "candidateId is required when role=candidate" },
          { status: 400 }
        );
      }
      const notifications = await notificationUseCases.listForCandidate(candidateId, filters);
      const unreadCount = await notificationUseCases.countUnread(candidateId, "CANDIDATE");
      // Enrich promotional notifications with isPinned from their campaign
      const campaignIds = [...new Set(notifications.filter((n: any) => n.campaignId).map((n: any) => n.campaignId))];
      const pinnedSet = new Set<string>();
      const archivedSet = new Set<string>();
      // Parallel fetch instead of sequential await loop (prototype-friendly N+1 fix)
      const campaigns = await Promise.all(
        campaignIds.map((cid) => notificationUseCases.getCampaign(cid as string))
      );
      campaignIds.forEach((cid, i) => {
        const campaign = campaigns[i];
        if (campaign?.isPinned) pinnedSet.add(cid as string);
        if (campaign?.status === "ARCHIVED") archivedSet.add(cid as string);
      });
      // Filter out notifications from archived campaigns
      const visible = notifications.filter((n: any) => !n.campaignId || !archivedSet.has(n.campaignId));
      const enriched = visible.map((n: any) => ({
        ...n,
        isPinned: n.campaignId ? pinnedSet.has(n.campaignId) : false,
      }));
      // Sort: pinned first, then by createdAt desc
      enriched.sort((a: any, b: any) => {
        if (a.isPinned && !b.isPinned) return -1;
        if (!a.isPinned && b.isPinned) return 1;
        return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      });
      return NextResponse.json({ notifications: enriched, unreadCount });
    }

    if (role === "hr") {
      const notifications = await notificationUseCases.listForHR(filters);
      const unreadCount = await notificationUseCases.countUnread(undefined, "HR");
      return NextResponse.json({ notifications, unreadCount });
    }

    // Fallback: return all (legacy)
    const notifications = await notificationUseCases.listAll();
    return NextResponse.json(notifications);
  } catch (error) {
    console.error("Error fetching notifications:", error);
    return NextResponse.json(
      { error: "Failed to fetch notifications" },
      { status: 500 }
    );
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json();
    const { id, markAllRead, candidateId, targetRole, archive, archiveIds } = body;

    // Archive a single notification
    if (archive && id) {
      const updated = await notificationUseCases.archiveNotification(id);
      return NextResponse.json(updated);
    }

    // Archive multiple notifications
    if (archiveIds && Array.isArray(archiveIds)) {
      const count = await notificationUseCases.archiveMany(archiveIds);
      return NextResponse.json({ success: true, archived: count });
    }

    if (markAllRead) {
      await notificationUseCases.markAllAsRead(candidateId, targetRole);
      return NextResponse.json({ success: true });
    }

    if (!id) {
      return NextResponse.json(
        { error: "id is required" },
        { status: 400 }
      );
    }

    const updated = await notificationUseCases.markAsRead(id);
    return NextResponse.json(updated);
  } catch (error) {
    console.error("Error updating notification:", error);
    return NextResponse.json(
      { error: "Failed to update notification" },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = request.nextUrl;
    const id = searchParams.get("id");
    if (!id) {
      return NextResponse.json({ error: "id is required" }, { status: 400 });
    }
    await notificationUseCases.deleteNotification(id);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting notification:", error);
    return NextResponse.json(
      { error: "Failed to delete notification" },
      { status: 500 }
    );
  }
}
