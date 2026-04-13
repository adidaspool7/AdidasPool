import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

/**
 * Supabase session middleware.
 *
 * Responsibilities:
 * 1. Refresh the Supabase session on every request (keeps JWT alive).
 * 2. Protect /dashboard/* — redirect unauthenticated users to /auth/login.
 * 3. Redirect authenticated users away from /auth/login to /dashboard.
 * 4. Redirect authenticated users without a role to /auth/select-role.
 * 5. Redirect / to /dashboard if authenticated.
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
        setAll(cookiesToSet) {
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

  // 1. Protect /dashboard — redirect to login if not authenticated
  if (pathname.startsWith("/dashboard") && !user) {
    return NextResponse.redirect(new URL("/auth/login", request.url));
  }

  // 2. Redirect logged-in users away from login page
  if (pathname === "/auth/login" && user) {
    return NextResponse.redirect(new URL("/dashboard", request.url));
  }

  // 3. First-time login — no role set yet
  if (
    user &&
    pathname.startsWith("/dashboard") &&
    !user.user_metadata?.role &&
    pathname !== "/auth/select-role"
  ) {
    return NextResponse.redirect(new URL("/auth/select-role", request.url));
  }

  // 4. Redirect root to dashboard if already authenticated
  if (pathname === "/" && user) {
    return NextResponse.redirect(new URL("/dashboard", request.url));
  }

  return supabaseResponse;
}

export const config = {
  matcher: [
    // Skip Next.js internals and static files
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
