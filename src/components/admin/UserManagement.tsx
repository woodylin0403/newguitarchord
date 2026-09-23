"use client";

import { useState, useTransition } from "react";

import { approveUser, revokeUser } from "@/app/admin/users/actions";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ROLE_LABEL, type Role } from "@/lib/roles";
import { cn } from "@/lib/utils";

export interface AdminUser {
  id: string;
  email: string | null;
  name: string | null;
  avatarUrl: string | null;
  role: Role;
  createdAt: string;
}

function fmt(iso: string): string {
  const d = new Date(iso);
  return `${d.getFullYear()}/${d.getMonth() + 1}/${d.getDate()}`;
}

export function UserManagement({ users: initial }: { users: AdminUser[] }) {
  const [users, setUsers] = useState(initial);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const run = (
    id: string,
    action: (id: string) => Promise<{ ok: boolean; error?: string }>,
    nextRole: Role,
  ) => {
    setErr(null);
    setBusyId(id);
    startTransition(async () => {
      const res = await action(id);
      if (res.ok) {
        setUsers((us) =>
          us.map((u) => (u.id === id ? { ...u, role: nextRole } : u)),
        );
      } else {
        setErr(res.error ?? "操作失敗");
      }
      setBusyId(null);
    });
  };

  if (users.length === 0) {
    return (
      <p className="rounded-2xl border border-border bg-surface py-10 text-center text-sm text-muted">
        還沒有任何使用者。
      </p>
    );
  }

  return (
    <div className="space-y-3">
      {err && (
        <p className="rounded-lg bg-accent-soft px-3 py-2 text-sm text-red-600 dark:text-red-400">
          {err}
        </p>
      )}
      <ul className="divide-y divide-border overflow-hidden rounded-2xl border border-border bg-surface">
        {users.map((u) => {
          const busy = pending && busyId === u.id;
          return (
            <li
              key={u.id}
              className="flex flex-wrap items-center gap-3 px-4 py-3"
            >
              {u.avatarUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={u.avatarUrl}
                  alt=""
                  className="size-8 shrink-0 rounded-full"
                />
              ) : (
                <span className="grid size-8 shrink-0 place-items-center rounded-full bg-accent-soft text-xs font-semibold text-accent">
                  {(u.name ?? u.email ?? "?").slice(0, 1).toUpperCase()}
                </span>
              )}

              <div className="min-w-0 flex-1">
                <div className="truncate text-sm font-medium">
                  {u.name ?? "（未設定名稱）"}
                </div>
                <div className="truncate text-xs text-muted">{u.email}</div>
              </div>

              <Badge variant={u.role === "admin" ? "accent" : "default"}>
                {ROLE_LABEL[u.role]}
              </Badge>

              <span className="shrink-0 font-mono text-xs text-muted tabular-nums">
                {fmt(u.createdAt)}
              </span>

              <div className={cn("shrink-0", busy && "opacity-60")}>
                {u.role === "pending" && (
                  <Button
                    type="button"
                    size="sm"
                    disabled={busy}
                    onClick={() => run(u.id, approveUser, "editor")}
                  >
                    核准
                  </Button>
                )}
                {u.role === "editor" && (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    disabled={busy}
                    onClick={() => run(u.id, revokeUser, "pending")}
                  >
                    撤銷
                  </Button>
                )}
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
