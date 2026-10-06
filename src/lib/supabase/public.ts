import { createClient, type SupabaseClient } from "@supabase/supabase-js";

import type { CacheTag } from "@/lib/cache-tags";

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

const tagged = new Map<CacheTag, SupabaseClient>();

/**
 * Same anon client, but every request it makes is tagged in Next's data cache
 * so a server action can expire it with `updateTag(tag)` right after a write.
 * Use this for reads that render on ISR pages.
 *
 * Without this, these fetches were cached for a YEAR (static-page default),
 * so saved edits didn't show until a manual reload. The 5-minute revalidate
 * is a safety net for rows changed outside the app (Supabase dashboard,
 * seed script); app writes expire the tag immediately.
 */
export function getTaggedSupabase(tag: CacheTag): SupabaseClient | null {
  const existing = tagged.get(tag);
  if (existing) return existing;

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) return null;

  const client = createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
    global: {
      fetch: (input, init) =>
        fetch(input, {
          ...init,
          next: { tags: [tag], revalidate: 300 },
        } as RequestInit),
    },
  });
  tagged.set(tag, client);
  return client;
}
