import { createBrowserClient } from "@supabase/ssr";

/**
 * Supabase browser client.
 * Use in Client Components and client-side hooks.
 */
export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}
