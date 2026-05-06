/**
 * Resolve the authenticated caller for API routes.
 *
 * Returns either:
 *   - { caller: { kind: "hr" | "candidate", user, candidateId? } }
 *   - { response: NextResponse(401|403) } that the caller should propagate.
 *
 * Used by routes that must NOT trust client-supplied role / candidateId
 * (e.g. /api/notifications). RLS is disabled on every table — this is the
 * only auth gate.
 */

import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { candidateUseCases } from "@server/application";

export type AuthenticatedCaller =
  | {
      kind: "hr";
      user: { id: string; email?: string };
    }
  | {
      kind: "candidate";
      user: { id: string; email?: string };
      /** May be null if the candidate has not yet had a profile created. */
      candidateId: string | null;
    };

export async function resolveCaller(): Promise<
  { caller: AuthenticatedCaller; response?: undefined }
  | { caller?: undefined; response: NextResponse }
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
  const baseUser = { id: user.id, email: user.email ?? undefined };

  if (role === "hr") {
    return { caller: { kind: "hr", user: baseUser } };
  }

  if (role === "candidate") {
    const candidate = await candidateUseCases.findByUserId(user.id);
    return {
      caller: {
        kind: "candidate",
        user: baseUser,
        candidateId: (candidate?.id as string | undefined) ?? null,
      },
    };
  }

  // Authenticated but no role assigned yet (pre /auth/select-role).
  return {
    response: NextResponse.json({ error: "Forbidden — no role assigned" }, { status: 403 }),
  };
}
