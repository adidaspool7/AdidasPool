import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

/**
 * OAuth callback handler.
 * Supabase redirects here after Google sign-in with a `code` param.
 * Exchanges the code for a session, then:
 *   - Sets the role from the `role` query param (passed from landing page)
 *   - Redirects to /dashboard
 *   - Falls back to /auth/select-role if no role param is present
 */
export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const role = searchParams.get("role") as "candidate" | "hr" | null;
  const next = searchParams.get("next") ?? "/dashboard";

  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);

    if (!error) {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (user) {
        // Set or update role from URL param (landing page flow)
        if (role && (role === "candidate" || role === "hr")) {
          await supabase.auth.updateUser({ data: { role } });
          return NextResponse.redirect(`${origin}${next}`);
        }

        // No role param and no role in metadata → fallback to select-role
        if (!user.user_metadata?.role) {
          return NextResponse.redirect(`${origin}/auth/select-role`);
        }
      }

      return NextResponse.redirect(`${origin}${next}`);
    }
  }

  return NextResponse.redirect(`${origin}/auth/error`);
}
