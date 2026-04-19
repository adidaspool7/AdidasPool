/**
 * Supabase Admin Client Singleton
 *
 * ONION LAYER: Infrastructure
 *
 * Uses the service role key — bypasses RLS.
 * Never expose this client to the browser.
 * Replaces the Prisma client singleton.
 */

// eslint-disable-next-line @typescript-eslint/no-explicit-any
import { createClient, SupabaseClient } from "@supabase/supabase-js";

// Typed as SupabaseClient<any> so all .from() calls accept arbitrary table
// names and row shapes without generated database types.
const globalForSupabase = globalThis as unknown as {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  supabaseAdmin: SupabaseClient<any> | undefined;
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const supabaseAdmin: SupabaseClient<any> =
  globalForSupabase.supabaseAdmin ??
  createClient<any>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    {
      auth: { autoRefreshToken: false, persistSession: false },
    }
  );

if (process.env.NODE_ENV !== "production") {
  globalForSupabase.supabaseAdmin = supabaseAdmin;
}

export default supabaseAdmin;
