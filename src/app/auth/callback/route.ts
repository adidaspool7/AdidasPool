import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";

/**
 * OAuth callback handler.
 * Supabase redirects here after Google sign-in with a `code` param.
 * Exchanges the code for a session, then:
 *   - Sets the role from the `role` query param (passed from landing page)
 *   - Redirects to /dashboard
 *   - Falls back to /auth/select-role if no role param is present
 *
 * IMPORTANT: We explicitly track every cookie Supabase sets and forward
 * them on the redirect response. Using only `cookies()` from next/headers
 * does NOT reliably include those cookies on NextResponse.redirect().
 */
export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const role = searchParams.get("role") as "candidate" | "hr" | null;
  const next = searchParams.get("next") ?? "/dashboard";

  if (!code) {
    return NextResponse.redirect(`${origin}/auth/error`);
  }

  const cookieStore = await cookies();

  // Collect every cookie Supabase sets so we can forward them on the redirect
  const pendingCookies: {
    name: string;
    value: string;
    options?: Record<string, unknown>;
  }[] = [];

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet: { name: string; value: string; options?: Record<string, unknown> }[]) {
          cookiesToSet.forEach(({ name, value, options }) => {
            try {
              cookieStore.set(name, value, options as Parameters<typeof cookieStore.set>[2]);
            } catch {
              // May throw if called from a read-only context
            }
            pendingCookies.push({ name, value, options: options as Record<string, unknown> });
          });
        },
      },
    }
  );

  const { error } = await supabase.auth.exchangeCodeForSession(code);

  if (error) {
    return NextResponse.redirect(`${origin}/auth/error`);
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();

  let redirectUrl = `${origin}${next}`;

  if (user) {
    const existingRole = user.user_metadata?.role;

    if (existingRole === "candidate" || existingRole === "hr") {
      // Role already set — keep it (roles are permanent)
    } else if (role && (role === "candidate" || role === "hr")) {
      // First login — set role from URL param
      await supabase.auth.updateUser({ data: { role } });
    } else if (!existingRole) {
      // No role param and no role in metadata → fallback
      redirectUrl = `${origin}/auth/select-role`;
    }
  }

  // Build redirect and explicitly forward ALL Supabase session cookies
  const response = NextResponse.redirect(redirectUrl);
  pendingCookies.forEach(({ name, value, options }) => {
    response.cookies.set(name, value, options);
  });

  return response;
}
