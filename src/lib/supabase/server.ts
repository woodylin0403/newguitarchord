import { createServerClient, type CookieOptions } from "@supabase/ssr";
import type { SupabaseClient } from "@supabase/supabase-js";
import { cookies } from "next/headers";

import type { Role } from "@/lib/roles";

export type { Role };

/**
 * Cookie-bound Supabase client for Server Components, route handlers and server
 * actions — carries the signed-in user's session. Returns null when Supabase
 * env vars are absent.
 *
 * Writes to `song_contents` and `profiles.role` go through THIS client, never
 * the service-role one — RLS (`can_edit()` / `is_admin()`) is the real gate,
 * not an app-level check.
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

/** This user's `profiles.role`, or null if signed out / no row / Supabase off. */
export async function getCurrentRole(): Promise<Role | null> {
  const supabase = await getServerSupabase();
  if (!supabase) return null;
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data, error } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .maybeSingle();
  if (error || !data?.role) return null;
  return data.role as Role;
}

export interface SessionInfo {
  authenticated: boolean;
  userId: string | null;
  email: string | null;
  name: string | null;
  avatarUrl: string | null;
  /** null when signed out, or signed in with no profiles row yet. */
  role: Role | null;
  /** role === "editor" || role === "admin" */
  canEdit: boolean;
  isAdmin: boolean;
}

/** Current session distilled to what the UI needs. */
export async function getSessionInfo(): Promise<SessionInfo> {
  const supabase = await getServerSupabase();
  if (!supabase) {
    return {
      authenticated: false,
      userId: null,
      email: null,
      name: null,
      avatarUrl: null,
      role: null,
      canEdit: false,
      isAdmin: false,
    };
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();
  const meta = (user?.user_metadata ?? {}) as Record<string, unknown>;

  let role: Role | null = null;
  if (user) {
    const { data } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .maybeSingle();
    role = (data?.role as Role | undefined) ?? null;
  }

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
    role,
    canEdit: role === "editor" || role === "admin",
    isAdmin: role === "admin",
  };
}
