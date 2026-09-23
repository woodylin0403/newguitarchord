import type { SupabaseClient, User } from "@supabase/supabase-js";

import type { Role } from "@/lib/roles";
import { getServerSupabase } from "@/lib/supabase/server";

/**
 * Shared "am I allowed to do this" check for server actions. Returns the
 * caller's own session-bound client on success — use IT for the write, not
 * `getAdminSupabase()`. The real gate is the database's RLS policy
 * (`can_edit()` / `is_admin()`); this only exists to short-circuit with a
 * clear Chinese error message before bothering the database.
 */
interface AuthzResult {
  user: User | null;
  supabase: SupabaseClient | null;
  error: string | null;
}

async function requireRole(min: "editor" | "admin"): Promise<AuthzResult> {
  const supabase = await getServerSupabase();
  if (!supabase) {
    return { user: null, supabase: null, error: "伺服器未設定 Supabase。" };
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return { user: null, supabase: null, error: "請先登入。" };
  }

  const { data } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .maybeSingle();
  const role = (data?.role as Role | undefined) ?? null;

  const ok = min === "admin" ? role === "admin" : role === "editor" || role === "admin";
  if (!ok) {
    const error =
      role === "pending" || role === null
        ? "帳號還在等待管理員核准，核准後才能使用這個功能。"
        : min === "admin"
          ? "沒有權限（需要管理員）。"
          : "沒有編輯權限。";
    return { user: null, supabase: null, error };
  }

  return { user, supabase, error: null };
}

/** editor or admin */
export function requireEditor() {
  return requireRole("editor");
}

/** admin only */
export function requireAdmin() {
  return requireRole("admin");
}
