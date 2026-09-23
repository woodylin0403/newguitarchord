import type { Metadata } from "next";
import Link from "next/link";

import { NoAccess } from "@/components/NoAccess";
import { UserManagement, type AdminUser } from "@/components/admin/UserManagement";
import type { Role } from "@/lib/roles";
import { getServerSupabase, getSessionInfo } from "@/lib/supabase/server";

export const metadata: Metadata = { robots: { index: false } };

export default async function AdminUsersPage() {
  const { isAdmin, authenticated, role } = await getSessionInfo();
  if (!isAdmin) {
    return <NoAccess authenticated={authenticated} role={role} need="admin" />;
  }

  const supabase = await getServerSupabase();
  const { data } = supabase
    ? await supabase
        .from("profiles")
        .select("id, email, name, avatar_url, role, created_at")
    : { data: null };

  const users: AdminUser[] = (data ?? [])
    .map((row) => ({
      id: row.id as string,
      email: row.email as string | null,
      name: row.name as string | null,
      avatarUrl: row.avatar_url as string | null,
      role: row.role as Role,
      createdAt: row.created_at as string,
    }))
    // pending first, then by signup order
    .sort((a, b) => {
      const pa = a.role === "pending" ? 0 : 1;
      const pb = b.role === "pending" ? 0 : 1;
      if (pa !== pb) return pa - pb;
      return (
        new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
      );
    });

  return (
    <div className="space-y-4">
      <nav className="flex items-center gap-1.5 text-xs text-muted">
        <Link href="/" className="hover:text-foreground">
          全部
        </Link>
        <span>/</span>
        <span>使用者管理</span>
      </nav>

      <div>
        <h1 className="font-display text-2xl font-semibold tracking-tight">
          使用者管理
        </h1>
        <p className="mt-1 text-sm text-muted">
          核准後帳號才能編輯歌譜。待審核的排在最上面。
        </p>
      </div>

      <UserManagement users={users} />
    </div>
  );
}
