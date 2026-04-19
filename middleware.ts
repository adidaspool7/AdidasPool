import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

/**
 * Supabase session middleware.
 *
 * Responsibilities:
 * 1. Refresh the Supabase session on every request (keeps JWT alive).
 * 2. Protect /dashboard/* — redirect unauthenticated users to landing.
 * 3. Redirect authenticated users away from /auth/login to /dashboard.
 * 4. Redirect authenticated users without a role to /auth/select-role.
 * 5. Redirect / to /dashboard if authenticated.
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

  /** Helper: create a redirect that carries all Supabase session cookies */
  function redirect(url: URL) {
    const r = NextResponse.redirect(url);
    supabaseResponse.cookies.getAll().forEach((c) => {
      r.cookies.set(c.name, c.value);
    });
    return r;
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

  // 3. Redirect logged-in users from landing to dashboard
  if (pathname === "/" && user) {
    return redirect(new URL("/dashboard", request.url));
  }

  // 4. First-time login — no role set yet
  if (
    user &&
    pathname.startsWith("/dashboard") &&
    !user.user_metadata?.role &&
    pathname !== "/auth/select-role"
  ) {
    return redirect(new URL("/auth/select-role", request.url));
  }

  return supabaseResponse;
}

export const config = {
  matcher: [
    // Skip Next.js internals and static files
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
