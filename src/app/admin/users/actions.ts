"use server";

import { revalidatePath } from "next/cache";

import { requireAdmin } from "@/lib/supabase/authz";

export interface AdminActionResult {
  ok: boolean;
  error?: string;
}

async function setRole(
  userId: string,
  from: "pending" | "editor",
  to: "editor" | "pending",
): Promise<AdminActionResult> {
  const { supabase, error } = await requireAdmin();
  if (error) return { ok: false, error };

  // The `from` filter is just a safety net against a stale/double click —
  // the real gate is the profiles.role UPDATE policy (admin only).
  const { error: dbError } = await supabase!
    .from("profiles")
    .update({ role: to })
    .eq("id", userId)
    .eq("role", from);
  if (dbError) return { ok: false, error: `設定失敗：${dbError.message}` };

  revalidatePath("/admin/users");
  return { ok: true };
}

/** pending → editor */
export async function approveUser(userId: string): Promise<AdminActionResult> {
  return setRole(userId, "pending", "editor");
}

/** editor → pending */
export async function revokeUser(userId: string): Promise<AdminActionResult> {
  return setRole(userId, "editor", "pending");
}
