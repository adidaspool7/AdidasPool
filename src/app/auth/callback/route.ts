import { createServerClient } from "@supabase/ssr";
import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/server";

/**
 * OAuth callback handler.
 *
 * Uses an IN-MEMORY cookie map (same pattern as middleware) instead of
 * cookies() from next/headers. This guarantees that getAll() always
 * returns fresh data after setAll(), so getUser() sees the tokens
 * that exchangeCodeForSession just stored.
 *
 * Role is set in app_metadata via the admin client (service role key).
 * app_metadata is immutable from the client — users cannot change their role.
 */
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const code = searchParams.get("code");
  const role = searchParams.get("role") as "candidate" | "hr" | null;
  const next = searchParams.get("next") ?? "/dashboard";

  // On Vercel the origin from URL may differ from what the browser sees.
  const forwardedHost = request.headers.get("x-forwarded-host");
  const forwardedProto = request.headers.get("x-forwarded-proto") ?? "https";
  const origin = forwardedHost
    ? `${forwardedProto}://${forwardedHost}`
    : new URL(request.url).origin;

  if (!code) {
    return NextResponse.redirect(`${origin}/auth/error`);
  }

  // ---- In-memory cookie store (mirrors the middleware pattern) ----
  const cookieMap = new Map<string, string>();

  // Seed from request cookies
  const rawCookies = request.headers.get("cookie") ?? "";
  rawCookies.split(";").forEach((c) => {
    const idx = c.indexOf("=");
    if (idx > 0) {
      cookieMap.set(c.slice(0, idx).trim(), c.slice(idx + 1).trim());
    }
  });

  // Track every cookie Supabase sets (with options) for the response
  const responseCookies: {
    name: string;
    value: string;
    options: Record<string, unknown>;
  }[] = [];

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return Array.from(cookieMap.entries()).map(([name, value]) => ({
            name,
            value,
          }));
        },
        setAll(
          cookiesToSet: {
            name: string;
            value: string;
            options?: Record<string, unknown>;
          }[]
        ) {
          cookiesToSet.forEach(({ name, value, options }) => {
            cookieMap.set(name, value); // keep in-memory map up-to-date
            responseCookies.push({
              name,
              value,
              options: (options as Record<string, unknown>) ?? {},
            });
          });
        },
      },
    }
  );

  // Exchange the OAuth code for a session (stores tokens via setAll)
  const { error } = await supabase.auth.exchangeCodeForSession(code);

  if (error) {
    return NextResponse.redirect(`${origin}/auth/error`);
  }

  // getUser makes a server call — it can now read the fresh tokens
  const {
    data: { user },
  } = await supabase.auth.getUser();

  let redirectUrl = `${origin}${next}`;

  if (user) {
    // app_metadata is the source of truth for roles (server-only, permanent)
    const appRole = user.app_metadata?.role;

    if (appRole === "candidate" || appRole === "hr") {
      // Role already set — keep it
    } else {
      // Determine the role: URL param → legacy user_metadata → fallback
      const newRole =
        role && (role === "candidate" || role === "hr")
          ? role
          : user.user_metadata?.role === "candidate" ||
              user.user_metadata?.role === "hr"
            ? (user.user_metadata.role as "candidate" | "hr")
            : null;

      if (newRole) {
        // Set in app_metadata via admin client (immutable from client)
        const admin = createAdminClient();
        await admin.auth.admin.updateUserById(user.id, {
          app_metadata: { role: newRole },
        });
      } else {
        redirectUrl = `${origin}/auth/select-role`;
      }
    }
  }

  // Build redirect and forward ALL session cookies
  const response = NextResponse.redirect(redirectUrl);
  responseCookies.forEach(({ name, value, options }) => {
    response.cookies.set(name, value, options);
  });

  return response;
}
