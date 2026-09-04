"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

/** "新增歌曲" link, shown only to admins. Fetches /api/me so the page stays SSG. */
export function AdminNewSongLink() {
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    let alive = true;
    fetch("/api/me")
      .then((r) => r.json())
      .then((me: { isAdmin?: boolean }) => {
        if (alive) setIsAdmin(Boolean(me.isAdmin));
      })
      .catch(() => {});
    return () => {
      alive = false;
    };
  }, []);

  if (!isAdmin) return null;

  return (
    <Link
      href="/songs/new"
      className="rounded-full border border-border px-3 py-1 text-xs hover:bg-surface-2"
    >
      + 新增歌曲
    </Link>
  );
}
