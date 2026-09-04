import { createClient, type SupabaseClient } from "@supabase/supabase-js";

/**
 * Stateless anon client for reading public data (RLS `select using (true)`).
 * Safe in any context — build, RSC, route handlers. Returns null when Supabase
 * env vars are absent so the site keeps working file-only.
 */
let cached: SupabaseClient | null | undefined;

export function getPublicSupabase(): SupabaseClient | null {
  if (cached !== undefined) return cached;

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) {
    cached = null;
    return cached;
  }

  cached = createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  return cached;
}
