"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

import { Button } from "@/components/ui/button";

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
    <Button asChild variant="outline" size="sm">
      <Link href="/songs/new">+ 新增歌曲</Link>
    </Button>
  );
}
