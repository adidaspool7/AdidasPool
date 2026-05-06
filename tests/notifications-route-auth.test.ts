/**
 * Auth tests for /api/notifications (audit C1 fix).
 *
 * Validates the new authorization model:
 *  - Unauthenticated callers get 401.
 *  - Cross-tenant mutations (candidate touching another candidate's
 *    notification, or candidate touching an HR notification) get 403.
 *  - markAllRead derives scope from the session, never from request body.
 *  - Owner mutations succeed.
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest, NextResponse } from "next/server";

// ── Mocks ────────────────────────────────────────────────────────────
type Caller =
  | { kind: "hr"; user: { id: string; email?: string } }
  | { kind: "candidate"; user: { id: string; email?: string }; candidateId: string | null };

const resolveCallerMock = vi.fn<
  () => Promise<{ caller: Caller; response?: undefined } | { caller?: undefined; response: NextResponse }>
>();

vi.mock("@/lib/auth/resolve-caller", () => ({
  resolveCaller: () => resolveCallerMock(),
}));

const notificationUseCases = {
  getById: vi.fn(),
  countUnread: vi.fn().mockResolvedValue(0),
  listForCandidate: vi.fn().mockResolvedValue([]),
  listForHR: vi.fn().mockResolvedValue([]),
  markAsRead: vi.fn().mockResolvedValue({ id: "n1", read: true }),
  markAllAsRead: vi.fn().mockResolvedValue(undefined),
  archiveNotification: vi.fn().mockResolvedValue({ id: "n1", archived: true }),
  archiveMany: vi.fn().mockResolvedValue(0),
  deleteNotification: vi.fn().mockResolvedValue(undefined),
  getCampaign: vi.fn().mockResolvedValue(null),
};

vi.mock("@server/application", () => ({
  notificationUseCases,
}));

// Import AFTER mocks are registered.
const { GET, PATCH, DELETE } = await import("../src/app/api/notifications/route");

function makeRequest(url: string, init?: RequestInit) {
  return new NextRequest(url, init as any);
}

const HR_CALLER: Caller = { kind: "hr", user: { id: "hr-user-1", email: "hr@x" } };
const CAND_A: Caller = {
  kind: "candidate",
  user: { id: "auth-A", email: "a@x" },
  candidateId: "cand-A",
};
const CAND_B: Caller = {
  kind: "candidate",
  user: { id: "auth-B", email: "b@x" },
  candidateId: "cand-B",
};

beforeEach(() => {
  vi.clearAllMocks();
  notificationUseCases.countUnread.mockResolvedValue(0);
  notificationUseCases.listForCandidate.mockResolvedValue([]);
  notificationUseCases.listForHR.mockResolvedValue([]);
  notificationUseCases.markAsRead.mockResolvedValue({ id: "n1", read: true });
  notificationUseCases.markAllAsRead.mockResolvedValue(undefined);
  notificationUseCases.archiveNotification.mockResolvedValue({ id: "n1", archived: true });
  notificationUseCases.archiveMany.mockResolvedValue(0);
  notificationUseCases.deleteNotification.mockResolvedValue(undefined);
  notificationUseCases.getCampaign.mockResolvedValue(null);
});

describe("/api/notifications — unauthenticated", () => {
  it("GET returns 401 when no session", async () => {
    resolveCallerMock.mockResolvedValueOnce({
      response: NextResponse.json({ error: "Unauthorized" }, { status: 401 }),
    });
    const res = await GET(makeRequest("http://x/api/notifications"));
    expect(res.status).toBe(401);
  });

  it("PATCH returns 401 when no session", async () => {
    resolveCallerMock.mockResolvedValueOnce({
      response: NextResponse.json({ error: "Unauthorized" }, { status: 401 }),
    });
    const res = await PATCH(
      makeRequest("http://x/api/notifications", {
        method: "PATCH",
        body: JSON.stringify({ id: "n1" }),
      })
    );
    expect(res.status).toBe(401);
  });

  it("DELETE returns 401 when no session", async () => {
    resolveCallerMock.mockResolvedValueOnce({
      response: NextResponse.json({ error: "Unauthorized" }, { status: 401 }),
    });
    const res = await DELETE(makeRequest("http://x/api/notifications?id=n1", { method: "DELETE" }));
    expect(res.status).toBe(401);
  });
});

describe("/api/notifications — candidate ownership", () => {
  it("PATCH mark-as-read 403 when candidate targets another candidate's notification", async () => {
    resolveCallerMock.mockResolvedValueOnce({ caller: CAND_A });
    notificationUseCases.getById.mockResolvedValueOnce({
      id: "n1",
      candidateId: "cand-B",
      targetRole: "CANDIDATE",
    });
    const res = await PATCH(
      makeRequest("http://x/api/notifications", {
        method: "PATCH",
        body: JSON.stringify({ id: "n1" }),
      })
    );
    expect(res.status).toBe(403);
    expect(notificationUseCases.markAsRead).not.toHaveBeenCalled();
  });

  it("PATCH mark-as-read 403 when candidate targets HR-only notification", async () => {
    resolveCallerMock.mockResolvedValueOnce({ caller: CAND_A });
    notificationUseCases.getById.mockResolvedValueOnce({
      id: "n1",
      candidateId: null,
      targetRole: "HR",
    });
    const res = await PATCH(
      makeRequest("http://x/api/notifications", {
        method: "PATCH",
        body: JSON.stringify({ id: "n1" }),
      })
    );
    expect(res.status).toBe(403);
    expect(notificationUseCases.markAsRead).not.toHaveBeenCalled();
  });

  it("PATCH mark-as-read 200 when candidate targets their own notification", async () => {
    resolveCallerMock.mockResolvedValueOnce({ caller: CAND_A });
    notificationUseCases.getById.mockResolvedValueOnce({
      id: "n1",
      candidateId: "cand-A",
      targetRole: "CANDIDATE",
    });
    const res = await PATCH(
      makeRequest("http://x/api/notifications", {
        method: "PATCH",
        body: JSON.stringify({ id: "n1" }),
      })
    );
    expect(res.status).toBe(200);
    expect(notificationUseCases.markAsRead).toHaveBeenCalledWith("n1");
  });

  it("DELETE 403 when candidate targets another candidate's notification", async () => {
    resolveCallerMock.mockResolvedValueOnce({ caller: CAND_A });
    notificationUseCases.getById.mockResolvedValueOnce({
      id: "n1",
      candidateId: "cand-B",
      targetRole: "CANDIDATE",
    });
    const res = await DELETE(
      makeRequest("http://x/api/notifications?id=n1", { method: "DELETE" })
    );
    expect(res.status).toBe(403);
    expect(notificationUseCases.deleteNotification).not.toHaveBeenCalled();
  });

  it("DELETE 200 when candidate targets their own notification", async () => {
    resolveCallerMock.mockResolvedValueOnce({ caller: CAND_B });
    notificationUseCases.getById.mockResolvedValueOnce({
      id: "n1",
      candidateId: "cand-B",
      targetRole: null,
    });
    const res = await DELETE(
      makeRequest("http://x/api/notifications?id=n1", { method: "DELETE" })
    );
    expect(res.status).toBe(200);
    expect(notificationUseCases.deleteNotification).toHaveBeenCalledWith("n1");
  });
});

describe("/api/notifications — HR ownership", () => {
  it("PATCH mark-as-read 200 for HR notification", async () => {
    resolveCallerMock.mockResolvedValueOnce({ caller: HR_CALLER });
    notificationUseCases.getById.mockResolvedValueOnce({
      id: "n2",
      candidateId: null,
      targetRole: "HR",
    });
    const res = await PATCH(
      makeRequest("http://x/api/notifications", {
        method: "PATCH",
        body: JSON.stringify({ id: "n2" }),
      })
    );
    expect(res.status).toBe(200);
    expect(notificationUseCases.markAsRead).toHaveBeenCalledWith("n2");
  });

  it("PATCH mark-as-read 403 when HR tries to read a CANDIDATE-only notification", async () => {
    resolveCallerMock.mockResolvedValueOnce({ caller: HR_CALLER });
    notificationUseCases.getById.mockResolvedValueOnce({
      id: "n3",
      candidateId: "cand-A",
      targetRole: "CANDIDATE",
    });
    const res = await PATCH(
      makeRequest("http://x/api/notifications", {
        method: "PATCH",
        body: JSON.stringify({ id: "n3" }),
      })
    );
    expect(res.status).toBe(403);
    expect(notificationUseCases.markAsRead).not.toHaveBeenCalled();
  });
});

describe("/api/notifications — markAllRead derives scope from session", () => {
  it("candidate markAllRead uses caller candidateId, ignoring body", async () => {
    resolveCallerMock.mockResolvedValueOnce({ caller: CAND_A });
    const res = await PATCH(
      makeRequest("http://x/api/notifications", {
        method: "PATCH",
        // Attempt to spoof another candidate's id in body — must be ignored.
        body: JSON.stringify({
          markAllRead: true,
          candidateId: "cand-B",
          targetRole: "HR",
        }),
      })
    );
    expect(res.status).toBe(200);
    expect(notificationUseCases.markAllAsRead).toHaveBeenCalledWith(
      "cand-A",
      "CANDIDATE"
    );
  });

  it("HR markAllRead targets HR scope only", async () => {
    resolveCallerMock.mockResolvedValueOnce({ caller: HR_CALLER });
    const res = await PATCH(
      makeRequest("http://x/api/notifications", {
        method: "PATCH",
        body: JSON.stringify({
          markAllRead: true,
          candidateId: "cand-A",
          targetRole: "CANDIDATE",
        }),
      })
    );
    expect(res.status).toBe(200);
    expect(notificationUseCases.markAllAsRead).toHaveBeenCalledWith(
      undefined,
      "HR"
    );
  });
});

describe("/api/notifications — GET ignores client role/candidateId", () => {
  it("candidate GET listing uses caller candidateId, ignores ?candidateId=other", async () => {
    resolveCallerMock.mockResolvedValueOnce({ caller: CAND_A });
    notificationUseCases.listForCandidate.mockResolvedValueOnce([]);
    const res = await GET(
      makeRequest("http://x/api/notifications?role=hr&candidateId=cand-B")
    );
    expect(res.status).toBe(200);
    expect(notificationUseCases.listForCandidate).toHaveBeenCalled();
    const passedId = notificationUseCases.listForCandidate.mock.calls[0][0];
    expect(passedId).toBe("cand-A");
    expect(notificationUseCases.listForHR).not.toHaveBeenCalled();
  });

  it("HR GET countOnly ignores ?candidateId", async () => {
    resolveCallerMock.mockResolvedValueOnce({ caller: HR_CALLER });
    notificationUseCases.countUnread.mockResolvedValueOnce(7);
    const res = await GET(
      makeRequest("http://x/api/notifications?countOnly=true&candidateId=cand-A")
    );
    const body = (await res.json()) as { unreadCount: number };
    expect(body.unreadCount).toBe(7);
    expect(notificationUseCases.countUnread).toHaveBeenCalledWith(undefined, "HR");
  });
});

describe("/api/notifications — bulk archive ownership", () => {
  it("filters out non-owned ids; archives only owned ones", async () => {
    resolveCallerMock.mockResolvedValueOnce({ caller: CAND_A });
    notificationUseCases.getById
      .mockResolvedValueOnce({ id: "n1", candidateId: "cand-A", targetRole: "CANDIDATE" })
      .mockResolvedValueOnce({ id: "n2", candidateId: "cand-B", targetRole: "CANDIDATE" })
      .mockResolvedValueOnce({ id: "n3", candidateId: "cand-A", targetRole: null });
    notificationUseCases.archiveMany.mockResolvedValueOnce(2);

    const res = await PATCH(
      makeRequest("http://x/api/notifications", {
        method: "PATCH",
        body: JSON.stringify({ archiveIds: ["n1", "n2", "n3"] }),
      })
    );
    expect(res.status).toBe(200);
    expect(notificationUseCases.archiveMany).toHaveBeenCalledWith(["n1", "n3"]);
  });

  it("returns 403 when none of the ids are owned", async () => {
    resolveCallerMock.mockResolvedValueOnce({ caller: CAND_A });
    notificationUseCases.getById
      .mockResolvedValueOnce({ id: "n1", candidateId: "cand-B", targetRole: "CANDIDATE" })
      .mockResolvedValueOnce({ id: "n2", candidateId: "cand-B", targetRole: "CANDIDATE" });
    const res = await PATCH(
      makeRequest("http://x/api/notifications", {
        method: "PATCH",
        body: JSON.stringify({ archiveIds: ["n1", "n2"] }),
      })
    );
    expect(res.status).toBe(403);
    expect(notificationUseCases.archiveMany).not.toHaveBeenCalled();
  });
});
