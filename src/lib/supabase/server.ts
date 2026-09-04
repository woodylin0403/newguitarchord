import { createServerClient, type CookieOptions } from "@supabase/ssr";
import type { SupabaseClient } from "@supabase/supabase-js";
import { cookies } from "next/headers";

/**
 * Cookie-bound Supabase client for Server Components, route handlers and server
 * actions — carries the signed-in user's session. Returns null when Supabase
 * env vars are absent.
 */
export async function getServerSupabase(): Promise<SupabaseClient | null> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) return null;

  const cookieStore = await cookies();

  return createServerClient(url, key, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(
        cookiesToSet: { name: string; value: string; options: CookieOptions }[],
      ) {
        try {
          for (const { name, value, options } of cookiesToSet) {
            cookieStore.set(name, value, options);
          }
        } catch {
          // Called from a Server Component render — cookies are read-only here.
          // Session refresh is handled by proxy.ts instead.
        }
      },
    },
  });
}

/** The signed-in user, or null. */
export async function getCurrentUser() {
  const supabase = await getServerSupabase();
  if (!supabase) return null;
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return user;
}

export interface SessionInfo {
  authenticated: boolean;
  userId: string | null;
  email: string | null;
  name: string | null;
  avatarUrl: string | null;
  isAdmin: boolean;
}

/** Current session distilled to what the UI needs. */
export async function getSessionInfo(): Promise<SessionInfo> {
  const user = await getCurrentUser();
  const meta = (user?.user_metadata ?? {}) as Record<string, unknown>;
  return {
    authenticated: Boolean(user),
    userId: user?.id ?? null,
    email: user?.email ?? null,
    name:
      (meta.full_name as string) ??
      (meta.name as string) ??
      user?.email?.split("@")[0] ??
      null,
    avatarUrl: (meta.avatar_url as string) ?? (meta.picture as string) ?? null,
    isAdmin: isAdminEmail(user?.email),
  };
}

/** Comma-separated ADMIN_EMAILS env var, lower-cased. */
export function isAdminEmail(email: string | null | undefined): boolean {
  if (!email) return false;
  const list = (process.env.ADMIN_EMAILS ?? "")
    .split(",")
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);
  return list.includes(email.toLowerCase());
}
