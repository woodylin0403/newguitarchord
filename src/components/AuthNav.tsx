"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import type { User } from "@supabase/supabase-js";
import { LogOutIcon, ShieldIcon } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { getBrowserSupabase } from "@/lib/supabase/browser";
import type { Role } from "@/lib/roles";

function displayName(user: User): string {
  const m = user.user_metadata ?? {};
  return (
    (m.full_name as string) ||
    (m.name as string) ||
    user.email?.split("@")[0] ||
    "使用者"
  );
}

/** Header auth control: Google sign-in / signed-in menu. Client-only so the
 *  rest of the site stays statically rendered. */
export function AuthNav() {
  const supabase = useMemo(() => getBrowserSupabase(), []);
  const pathname = usePathname();
  const [user, setUser] = useState<User | null>(null);
  const [role, setRole] = useState<Role | null>(null);
  // When Supabase isn't configured there is nothing to load, so start ready.
  const [ready, setReady] = useState(() => !getBrowserSupabase());

  useEffect(() => {
    if (!supabase) return;
    // onAuthStateChange emits INITIAL_SESSION immediately, then again on
    // sign-in / sign-out. State updates happen from this async listener, not
    // synchronously in the effect body.
    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      const nextUser = session?.user ?? null;
      setUser(nextUser);
      setReady(true);
      // `profiles.role` isn't in the auth session — fetch it from our own
      // route once we know who's signed in.
      if (!nextUser) {
        setRole(null);
        return;
      }
      fetch("/api/me")
        .then((r) => r.json())
        .then((me: { role?: Role | null }) => setRole(me.role ?? null))
        .catch(() => setRole(null));
    });
    return () => sub.subscription.unsubscribe();
  }, [supabase]);

  if (!supabase || !ready) {
    return <span className="w-16" aria-hidden />;
  }

  if (!user) {
    return (
      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={() =>
          supabase.auth.signInWithOAuth({
            provider: "google",
            options: {
              redirectTo: `${window.location.origin}/auth/callback?next=${encodeURIComponent(
                pathname || "/",
              )}`,
            },
          })
        }
      >
        用 Google 登入
      </Button>
    );
  }

  const name = displayName(user);
  const avatar = (user.user_metadata?.avatar_url ??
    user.user_metadata?.picture) as string | undefined;
  const canEdit = role === "editor" || role === "admin";
  const isAdmin = role === "admin";

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          className="flex items-center gap-1.5 rounded-full border border-border py-0.5 pl-0.5 pr-2 text-sm outline-none transition-colors hover:bg-surface-2 focus-visible:ring-2 focus-visible:ring-ring/40"
        >
          {avatar ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={avatar} alt="" className="size-6 rounded-full" />
          ) : (
            <span className="grid size-6 place-items-center rounded-full bg-accent-soft text-xs font-semibold text-accent">
              {name.slice(0, 1).toUpperCase()}
            </span>
          )}
          <span className="max-w-[7rem] truncate">{name}</span>
          {role === "pending" && (
            <span className="rounded-full bg-accent-soft px-1.5 py-0.5 text-[10px] font-medium text-accent">
              待核准
            </span>
          )}
        </button>
      </DropdownMenuTrigger>

      <DropdownMenuContent className="w-52">
        <DropdownMenuLabel className="truncate">{user.email}</DropdownMenuLabel>
        {role === "pending" && (
          <p className="px-2.5 pb-1.5 text-xs text-muted">
            帳號等待管理員核准，核准後才能編輯歌譜。
          </p>
        )}
        <DropdownMenuSeparator />
        {canEdit && (
          <DropdownMenuItem asChild>
            <Link href="/songs/new">新增歌曲</Link>
          </DropdownMenuItem>
        )}
        {isAdmin && (
          <DropdownMenuItem asChild>
            <Link href="/admin/users">
              <ShieldIcon />
              使用者管理
            </Link>
          </DropdownMenuItem>
        )}
        {(canEdit || isAdmin) && <DropdownMenuSeparator />}
        <DropdownMenuItem
          onSelect={async () => {
            await supabase.auth.signOut();
            window.location.reload();
          }}
        >
          <LogOutIcon />
          登出
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
