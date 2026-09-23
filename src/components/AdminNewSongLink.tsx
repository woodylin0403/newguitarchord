"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

import { Button } from "@/components/ui/button";

/** "新增歌曲" link, shown to editor/admin. Fetches /api/me so the page stays SSG. */
export function AdminNewSongLink() {
  const [canEdit, setCanEdit] = useState(false);

  useEffect(() => {
    let alive = true;
    fetch("/api/me")
      .then((r) => r.json())
      .then((me: { canEdit?: boolean }) => {
        if (alive) setCanEdit(Boolean(me.canEdit));
      })
      .catch(() => {});
    return () => {
      alive = false;
    };
  }, []);

  if (!canEdit) return null;

  return (
    <Button asChild variant="outline" size="sm">
      <Link href="/songs/new">+ 新增歌曲</Link>
    </Button>
  );
}
