"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

import { Button } from "@/components/ui/button";

/** "編輯" link shown to editor/admin. Fetches /api/me so the song page stays SSG. */
export function AdminEditLink({ slug }: { slug: string }) {
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
      <Link href={`/songs/${slug}/edit`}>編輯</Link>
    </Button>
  );
}
