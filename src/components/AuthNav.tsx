"use client";

import { usePathname } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import type { User } from "@supabase/supabase-js";

import { getBrowserSupabase } from "@/lib/supabase/browser";

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
  // When Supabase isn't configured there is nothing to load, so start ready.
  const [ready, setReady] = useState(() => !getBrowserSupabase());
  const [open, setOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!supabase) return;
    // onAuthStateChange emits INITIAL_SESSION immediately, then again on
    // sign-in / sign-out. State updates happen from this async listener, not
    // synchronously in the effect body.
    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
      setReady(true);
    });
    return () => sub.subscription.unsubscribe();
  }, [supabase]);

  useEffect(() => {
    if (!open) return;
    const onClick = (e: MouseEvent) => {
      if (!menuRef.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, [open]);

  if (!supabase || !ready) {
    return <span className="w-16" aria-hidden />;
  }

  if (!user) {
    return (
      <button
        type="button"
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
        className="rounded-lg border border-border px-2.5 py-1 text-sm hover:bg-surface-2"
      >
        登入
      </button>
    );
  }

  const name = displayName(user);
  const avatar = (user.user_metadata?.avatar_url ??
    user.user_metadata?.picture) as string | undefined;

  return (
    <div className="relative" ref={menuRef}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex items-center gap-1.5 rounded-lg border border-border py-0.5 pl-0.5 pr-2 text-sm hover:bg-surface-2"
      >
        {avatar ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={avatar} alt="" className="h-6 w-6 rounded-md" />
        ) : (
          <span className="grid h-6 w-6 place-items-center rounded-md bg-accent-soft text-xs font-semibold text-accent">
            {name.slice(0, 1).toUpperCase()}
          </span>
        )}
        <span className="max-w-[7rem] truncate">{name}</span>
      </button>

      {open && (
        <div className="absolute right-0 z-30 mt-1 w-44 overflow-hidden rounded-xl border border-border bg-surface py-1 text-sm shadow-lg">
          <div className="truncate px-3 py-1.5 text-xs text-muted">
            {user.email}
          </div>
          <button
            type="button"
            onClick={async () => {
              await supabase.auth.signOut();
              window.location.reload();
            }}
            className="block w-full px-3 py-1.5 text-left hover:bg-surface-2"
          >
            登出
          </button>
        </div>
      )}
    </div>
  );
}
