import Link from "next/link";

import type { Role } from "@/lib/roles";

/** Shared "you can't be here" block for editor/admin-gated pages. */
export function NoAccess({
  authenticated,
  role,
  need = "editor",
  backHref = "/",
  backLabel = "回首頁",
}: {
  authenticated: boolean;
  role: Role | null;
  need?: "editor" | "admin";
  backHref?: string;
  backLabel?: string;
}) {
  const message = !authenticated
    ? "請先用 Google 帳號登入。"
    : role === "pending" || role === null
      ? "帳號還在等待管理員核准，核准後才能使用這個功能。"
      : need === "admin"
        ? "這個帳號不是管理員，沒有權限。"
        : "這個帳號沒有編輯權限。";

  return (
    <div className="space-y-3 py-10 text-center">
      <p className="text-sm text-muted">{message}</p>
      <Link href={backHref} className="inline-block text-sm text-accent underline">
        {backLabel}
      </Link>
    </div>
  );
}
