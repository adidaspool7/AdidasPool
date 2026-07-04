/**
 * resolveCaller — Unit Tests
 *
 * The server-side auth gate for API routes that must not trust client-supplied
 * role/candidateId (RLS is disabled). Verifies the 401 / 403 / hr / candidate
 * branches. The Supabase server client and the candidate use-case singleton
 * are mocked so no network or DB is touched.
 */
import { describe, it, expect, vi, beforeEach } from "vitest";

const authState = vi.hoisted(() => ({
  user: null as null | { id: string; email?: string; app_metadata?: Record<string, unknown> },
}));
const findByUserId = vi.hoisted(() => vi.fn());

vi.mock("@/lib/supabase/server", () => ({
  createClient: async () => ({
    auth: { getUser: async () => ({ data: { user: authState.user } }) },
  }),
}));

vi.mock("@server/application", () => ({
  candidateUseCases: { findByUserId },
}));

import { resolveCaller } from "@/lib/auth/resolve-caller";

beforeEach(() => {
  authState.user = null;
  findByUserId.mockReset();
});

describe("resolveCaller", () => {
  it("returns a 401 response when there is no authenticated user", async () => {
    const result = await resolveCaller();
    expect(result.caller).toBeUndefined();
    expect(result.response?.status).toBe(401);
  });

  it("returns an hr caller when the app_metadata role is hr", async () => {
    authState.user = { id: "u-1", email: "hr@x.com", app_metadata: { role: "hr" } };
    const result = await resolveCaller();
    expect(result.response).toBeUndefined();
    expect(result.caller).toMatchObject({ kind: "hr", user: { id: "u-1", email: "hr@x.com" } });
  });

  it("resolves the linked candidateId for a candidate role", async () => {
    authState.user = { id: "u-2", email: "cand@x.com", app_metadata: { role: "candidate" } };
    findByUserId.mockResolvedValue({ id: "c-99" });

    const result = await resolveCaller();
    expect(result.caller).toMatchObject({ kind: "candidate", candidateId: "c-99" });
    expect(findByUserId).toHaveBeenCalledWith("u-2");
  });

  it("returns candidateId null when the candidate has no profile yet", async () => {
    authState.user = { id: "u-3", app_metadata: { role: "candidate" } };
    findByUserId.mockResolvedValue(null);

    const result = await resolveCaller();
    expect(result.caller).toMatchObject({ kind: "candidate", candidateId: null });
  });

  it("returns a 403 response when authenticated but no role is assigned", async () => {
    authState.user = { id: "u-4", app_metadata: {} };
    const result = await resolveCaller();
    expect(result.caller).toBeUndefined();
    expect(result.response?.status).toBe(403);
  });
});
