/**
 * requireHr — Unit Tests
 *
 * The inline HR-only guard used by API routes that sit under non-HR path
 * prefixes (e.g. /api/jobs/[id]/shortlist). Mirrors resolve-caller.test.ts:
 * the Supabase server client is mocked so no network/DB is touched.
 */
import { describe, it, expect, vi, beforeEach } from "vitest";

const authState = vi.hoisted(() => ({
  user: null as
    | null
    | {
        id: string;
        email?: string | null;
        app_metadata?: Record<string, unknown>;
        user_metadata?: Record<string, unknown>;
      },
}));

vi.mock("@/lib/supabase/server", () => ({
  createClient: async () => ({
    auth: { getUser: async () => ({ data: { user: authState.user } }) },
  }),
}));

import { requireHr } from "@/lib/auth/require-hr";

beforeEach(() => {
  authState.user = null;
});

describe("requireHr", () => {
  it("returns a 401 response when there is no authenticated user", async () => {
    const result = await requireHr();
    expect(result.user).toBeUndefined();
    expect(result.response?.status).toBe(401);
  });

  it("returns a 403 response when the user is not an HR role", async () => {
    authState.user = { id: "u-1", app_metadata: { role: "candidate" } };
    const result = await requireHr();
    expect(result.user).toBeUndefined();
    expect(result.response?.status).toBe(403);
  });

  it("returns a 403 response when the user has no role at all", async () => {
    authState.user = { id: "u-2", app_metadata: {} };
    const result = await requireHr();
    expect(result.response?.status).toBe(403);
  });

  it("returns the HR identity and prefers the email as display name", async () => {
    authState.user = {
      id: "u-3",
      email: "hr@x.com",
      app_metadata: { role: "hr" },
      user_metadata: { name: "Ignored Name" },
    };
    const result = await requireHr();
    expect(result.response).toBeUndefined();
    expect(result.user).toEqual({
      id: "u-3",
      email: "hr@x.com",
      displayName: "hr@x.com",
    });
  });

  it("falls back to user_metadata.name for display name when email is absent", async () => {
    authState.user = {
      id: "u-4",
      email: null,
      app_metadata: { role: "hr" },
      user_metadata: { name: "Ana HR" },
    };
    const result = await requireHr();
    expect(result.user).toMatchObject({ id: "u-4", email: undefined, displayName: "Ana HR" });
  });

  it("falls back to user_metadata.full_name when name is absent", async () => {
    authState.user = {
      id: "u-5",
      email: null,
      app_metadata: { role: "hr" },
      user_metadata: { full_name: "Bruno Full" },
    };
    const result = await requireHr();
    expect(result.user?.displayName).toBe("Bruno Full");
  });

  it("leaves display name undefined when no email or metadata name exists", async () => {
    authState.user = { id: "u-6", email: null, app_metadata: { role: "hr" } };
    const result = await requireHr();
    expect(result.user).toMatchObject({ id: "u-6", displayName: undefined });
  });
});
