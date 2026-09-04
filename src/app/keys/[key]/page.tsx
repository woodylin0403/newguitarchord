import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { SongList } from "@/components/SongList";
import { CATALOG_KEYS, getCatalogByKey } from "@/lib/songs/catalog";
import { getTranscribedSlugs } from "@/lib/songs/content";
import { keyLabel } from "@/lib/songs/labels";
import type { CatalogKey } from "@/lib/music";

/** `/keys/am` -> `Am`. */
function resolveKey(param: string): CatalogKey | null {
  return (
    CATALOG_KEYS.find((k) => k.toLowerCase() === param.toLowerCase()) ?? null
  );
}

export function generateStaticParams() {
  return CATALOG_KEYS.map((key) => ({ key: key.toLowerCase() }));
}

export async function generateMetadata({
  params,
}: PageProps<"/keys/[key]">): Promise<Metadata> {
  const { key } = await params;
  const resolved = resolveKey(key);
  if (!resolved) return {};
  return {
    title: `${keyLabel(resolved)}的詩歌`,
    description: `原調為 ${keyLabel(resolved)} 的教會詩歌吉他譜。`,
  };
}

export default async function KeyPage({ params }: PageProps<"/keys/[key]">) {
  const { key } = await params;
  const resolved = resolveKey(key);
  if (!resolved) notFound();

  const [byKey, transcribed] = await Promise.all([
    getCatalogByKey(),
    getTranscribedSlugs(),
  ]);
  const songs = byKey.get(resolved) ?? [];

  return (
    <div className="space-y-4">
      <nav className="flex items-center gap-1.5 text-xs text-muted">
        <Link href="/" className="hover:text-foreground">
          全部
        </Link>
        <span>/</span>
        <span>{keyLabel(resolved)}</span>
      </nav>

      <h1 className="font-display text-3xl font-semibold tracking-tight">
        {keyLabel(resolved)}
        <span className="ml-2 align-middle font-mono text-sm font-normal text-muted">
          {songs.length}
        </span>
      </h1>

      <SongList songs={songs} transcribed={transcribed} />
    </div>
  );
}
