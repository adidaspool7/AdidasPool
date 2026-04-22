import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

/**
 * Supabase session middleware.
 *
 * Responsibilities:
 * 1. Refresh the Supabase session on every request (keeps JWT alive).
 * 2. Gate /api/* — unauthenticated 401, non-HR 403 on HR_ONLY_API_PREFIXES.
 * 3. Protect /dashboard/* — redirect unauthenticated users to landing.
 * 4. Redirect authenticated users away from /auth/login to /dashboard.
 * 5. Redirect authenticated users without a role back to landing to pick one.
 * 6. Redirect / to /dashboard if authenticated and already has a role.
 *
 * IMPORTANT: Every redirect copies cookies from supabaseResponse so that
 * token refreshes are not lost when the middleware returns a redirect
 * instead of the normal NextResponse.next().
 */
export async function middleware(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet: { name: string; value: string; options?: Record<string, unknown> }[]) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          );
          supabaseResponse = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  // IMPORTANT: do not add code between createServerClient and getUser()
  // as it can cause session refresh issues.
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { pathname } = request.nextUrl;
  const role = user?.app_metadata?.role as "hr" | "candidate" | undefined;

  /** Helper: create a redirect that carries all Supabase session cookies */
  function redirect(url: URL) {
    const r = NextResponse.redirect(url);
    supabaseResponse.cookies.getAll().forEach((c) => {
      r.cookies.set(c.name, c.value);
    });
    return r;
  }

  /**
   * 0. API protection — prototype-friendly: one guard for all /api/*.
   *
   * Rules:
   *  - Everything under /api/* requires an authenticated session, except the
   *    public allowlist below (auth callback, webhook-style endpoints, etc.).
   *  - Paths in HR_ONLY_API_PREFIXES additionally require app_metadata.role === "hr".
   *
   * Keep auth logic here instead of duplicating it in every route handler —
   * cheaper for a prototype and impossible to forget when adding new routes.
   */
  const PUBLIC_API_PREFIXES = [
    "/api/auth/", // supabase callback, if any
  ];
  const HR_ONLY_API_PREFIXES = [
    "/api/candidates/rescore",
    "/api/candidates/rerank",
    "/api/scoring/",
    "/api/export/",
    "/api/notifications/campaigns",
    "/api/jobs/sync",
    "/api/upload/bulk",
    "/api/analytics",
  ];

  if (pathname.startsWith("/api/")) {
    const isPublic = PUBLIC_API_PREFIXES.some((p) => pathname.startsWith(p));
    if (!isPublic) {
      if (!user) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
      }
      const isHrOnly = HR_ONLY_API_PREFIXES.some((p) => pathname.startsWith(p));
      if (isHrOnly && role !== "hr") {
        return NextResponse.json({ error: "Forbidden — HR only" }, { status: 403 });
      }
    }
  }

  // 1. Protect /dashboard — redirect to landing if not authenticated
  if (pathname.startsWith("/dashboard") && !user) {
    return redirect(new URL("/", request.url));
  }

  // 2. Redirect /auth/login to landing page (login flow is now on /)
  if (pathname === "/auth/login") {
    if (user) return redirect(new URL("/dashboard", request.url));
    return redirect(new URL("/", request.url));
  }

  // 3. Redirect logged-in users WITH a role from landing to dashboard
  // (users without a role stay on landing to pick one via OAuth)
  if (pathname === "/" && user && user.app_metadata?.role) {
    return redirect(new URL("/dashboard", request.url));
  }

  // 4. First-time login — no role set yet → send back to landing to pick one
  if (
    user &&
    pathname.startsWith("/dashboard") &&
    !user.app_metadata?.role
  ) {
    return redirect(new URL("/", request.url));
  }

  return supabaseResponse;
}

export const config = {
  matcher: [
    // Skip Next.js internals and static files
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
