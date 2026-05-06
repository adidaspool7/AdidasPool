/**
 * Supabase Admin Client Singleton
 *
 * ONION LAYER: Infrastructure
 *
 * Uses the service role key — bypasses RLS.
 * Never expose this client to the browser.
 *
 * NOTE: `SupabaseClient<any>` is used deliberately at this SDK boundary so
 * `.from()` accepts arbitrary table names and row shapes without generated
 * database types. Repositories on top of this singleton then re-narrow with
 * the row interfaces in `@server/domain/ports/repositories.ts`.
 */
/* eslint-disable @typescript-eslint/no-explicit-any */
import { createClient, SupabaseClient } from "@supabase/supabase-js";

const globalForSupabase = globalThis as unknown as {
  supabaseAdmin: SupabaseClient<any> | undefined;
};

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
