/**
 * Middleware auth-gate tests (audit M5).
 *
 * Every /api/* route is fronted by `middleware.ts`, which is the single
 * place that enforces:
 *   - 401 when no Supabase session
 *   - 403 when role !== "hr" on HR_ONLY_API_PREFIXES
 *
 * Per-route handlers can rely on the middleware having run first, so
 * exercising the middleware directly gives us auth-rejection coverage
 * for every API route in one place.
 *
 * We mock `@supabase/ssr.createServerClient` to control the user/role
 * the middleware sees, then assert the response status for representative
 * paths from each protection tier.
 */

import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock the Supabase SSR client BEFORE the middleware module is imported.
// Middleware uses getSession() (fast, no network round-trip); getUser() is
// used only in route handlers. The mock reflects that split.
const mockGetSession = vi.fn();
vi.mock("@supabase/ssr", () => ({
  createServerClient: () => ({
    auth: { getSession: mockGetSession },
  }),
}));

import { middleware } from "../middleware";
import { NextRequest } from "next/server";

function buildRequest(pathname: string): NextRequest {
  return new NextRequest(new URL(`https://example.test${pathname}`));
}

beforeEach(() => {
  mockGetSession.mockReset();
  // Required so the middleware can build its supabase client
  process.env.NEXT_PUBLIC_SUPABASE_URL = "https://test.supabase.co";
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = "anon-test-key";
});

describe("middleware /api/* auth gate (audit M5)", () => {
  describe("unauthenticated callers", () => {
    beforeEach(() => {
      mockGetSession.mockResolvedValue({ data: { session: null } });
    });

    const paths = [
      "/api/candidates",
      "/api/candidates/rerank",
      "/api/jobs",
      "/api/jobs/sync",
      "/api/applications",
      "/api/notifications",
      "/api/notifications/campaigns",
      "/api/scoring/weights",
      "/api/scoring/presets",
      "/api/analytics/widgets",
      "/api/analytics/query",
      "/api/export/candidates",
      "/api/upload/bulk",
      "/api/me",
      "/api/assessments",
      "/api/interview/session",
      "/api/interview/results",
    ];

    for (const path of paths) {
      it(`rejects ${path} with 401`, async () => {
        const res = await middleware(buildRequest(path));
        expect(res.status).toBe(401);
      });
    }
  });

  describe("authenticated candidate callers", () => {
    beforeEach(() => {
      mockGetSession.mockResolvedValue({
        data: {
          session: {
            user: {
              id: "user-1",
              email: "candidate@example.com",
              app_metadata: { role: "candidate" },
              user_metadata: {},
            },
          },
        },
      });
    });

    const hrOnlyPaths = [
      "/api/candidates/rescore",
      "/api/candidates/rerank",
      "/api/scoring/weights",
      "/api/scoring/presets",
      "/api/export/candidates",
      "/api/notifications/campaigns",
      "/api/upload/bulk",
      "/api/analytics/query",
      "/api/analytics/widgets",
    ];

    for (const path of hrOnlyPaths) {
      it(`rejects HR-only ${path} with 403`, async () => {
        const res = await middleware(buildRequest(path));
        expect(res.status).toBe(403);
      });
    }

    it("allows shared /api/notifications for candidates (no 401/403)", async () => {
      const res = await middleware(buildRequest("/api/notifications"));
      expect(res.status).not.toBe(401);
      expect(res.status).not.toBe(403);
    });

    it("allows shared /api/jobs for candidates (browse)", async () => {
      const res = await middleware(buildRequest("/api/jobs"));
      expect(res.status).not.toBe(401);
      expect(res.status).not.toBe(403);
    });
  });

  describe("authenticated HR callers", () => {
    beforeEach(() => {
      mockGetSession.mockResolvedValue({
        data: {
          session: {
            user: {
              id: "user-2",
              email: "hr@example.com",
              app_metadata: { role: "hr" },
              user_metadata: {},
            },
          },
        },
      });
    });

    const allPaths = [
      "/api/candidates/rescore",
      "/api/scoring/weights",
      "/api/notifications/campaigns",
      "/api/jobs/sync",
      "/api/analytics/query",
      "/api/notifications",
      "/api/jobs",
    ];

    for (const path of allPaths) {
      it(`allows HR on ${path}`, async () => {
        const res = await middleware(buildRequest(path));
        expect(res.status).not.toBe(401);
        expect(res.status).not.toBe(403);
      });
    }
  });
});

describe("requireHr() helper (audit M5 — secondary defence)", () => {
  beforeEach(() => {
    vi.resetModules();
  });

  it("returns 401 NextResponse when no user", async () => {
    vi.doMock("@/lib/supabase/server", () => ({
      createClient: async () => ({
        auth: { getUser: async () => ({ data: { user: null } }) },
      }),
    }));
    const { requireHr } = await import("@/lib/auth/require-hr");
    const result = await requireHr();
    expect(result.response).toBeDefined();
    expect(result.response!.status).toBe(401);
  });

  it("returns 403 NextResponse when role is candidate", async () => {
    vi.doMock("@/lib/supabase/server", () => ({
      createClient: async () => ({
        auth: {
          getUser: async () => ({
            data: {
              user: {
                id: "u1",
                email: "c@example.com",
                app_metadata: { role: "candidate" },
                user_metadata: {},
              },
            },
          }),
        },
      }),
    }));
    const { requireHr } = await import("@/lib/auth/require-hr");
    const result = await requireHr();
    expect(result.response).toBeDefined();
    expect(result.response!.status).toBe(403);
  });

  it("returns user when role is hr", async () => {
    vi.doMock("@/lib/supabase/server", () => ({
      createClient: async () => ({
        auth: {
          getUser: async () => ({
            data: {
              user: {
                id: "u2",
                email: "hr@example.com",
                app_metadata: { role: "hr" },
                user_metadata: { name: "Alice" },
              },
            },
          }),
        },
      }),
    }));
    const { requireHr } = await import("@/lib/auth/require-hr");
    const result = await requireHr();
    expect(result.response).toBeUndefined();
    expect(result.user).toBeDefined();
    expect(result.user!.id).toBe("u2");
    expect(result.user!.email).toBe("hr@example.com");
  });
});
