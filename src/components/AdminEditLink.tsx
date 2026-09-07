"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

import { Button } from "@/components/ui/button";

/** "編輯" link shown only to admins. Fetches /api/me so the song page stays SSG. */
export function AdminEditLink({ slug }: { slug: string }) {
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
      <Link href={`/songs/${slug}/edit`}>編輯</Link>
    </Button>
  );
}
