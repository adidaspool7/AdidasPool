/**
 * Tiny helpers for API routes that need to enforce HR-only access.
 *
 * Why not use middleware? `middleware.ts` gates HR-only routes by static
 * path prefixes. Per-job shortlist routes are nested under
 * `/api/jobs/[id]/...` which is not an HR-only prefix (candidates need
 * /api/jobs/* for browsing). So we enforce inline.
 */

import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export interface HrUser {
  id: string;
  email?: string;
  /** Best-effort display name for audit attribution. */
  displayName?: string;
}

/**
 * Resolve the current user, verify they have role=HR, and return basic
 * identity. On failure, returns a NextResponse the caller should
 * propagate. On success, returns `{ user }`.
 *
 * Pattern matches the inline checks in src/app/api/candidates/[id]/route.ts.
 */
export async function requireHr(): Promise<
  { user: HrUser; response?: undefined } | { user?: undefined; response: NextResponse }
> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return {
      response: NextResponse.json({ error: "Unauthorized" }, { status: 401 }),
    };
  }

  const role = (user.app_metadata as { role?: string } | undefined)?.role;
  if (role !== "hr") {
    return {
      response: NextResponse.json({ error: "Forbidden" }, { status: 403 }),
    };
  }

  const meta = user.user_metadata as { name?: string; full_name?: string } | undefined;
  return {
    user: {
      id: user.id,
      email: user.email ?? undefined,
      displayName: user.email ?? meta?.name ?? meta?.full_name ?? undefined,
    },
  };
}
