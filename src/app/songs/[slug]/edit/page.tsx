import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { SongEditor } from "@/components/SongEditor";
import { getSong } from "@/lib/songs/catalog";
import {
  getSongSource,
  hasContentOverride,
} from "@/lib/songs/content";
import { getSessionInfo } from "@/lib/supabase/server";

export const metadata: Metadata = { robots: { index: false } };

const TEMPLATE = (title: string, key: string) =>
  `{title: ${title}}\n{key: ${key}}\n{time: 4/4}\n\n[${key}]第一行歌詞\n`;

export default async function EditSongPage({
  params,
}: PageProps<"/songs/[slug]/edit">) {
  const { slug } = await params;
  const song = await getSong(slug);
  if (!song) notFound();

  const { isAdmin, authenticated } = await getSessionInfo();
  if (!isAdmin) {
    return (
      <div className="space-y-3 py-10 text-center">
        <p className="text-sm text-muted">
          {authenticated
            ? "這個帳號不是管理員，無法編輯。"
            : "請先用管理員 Google 帳號登入。"}
        </p>
        <Link
          href={`/songs/${slug}`}
          className="inline-block text-sm text-accent underline"
        >
          回到歌曲頁
        </Link>
      </div>
    );
  }

  const [source, overridden] = await Promise.all([
    getSongSource(slug),
    hasContentOverride(slug),
  ]);

  return (
    <div className="space-y-4">
      <nav className="flex items-center gap-1.5 text-xs text-muted">
        <Link href={`/songs/${slug}`} className="hover:text-foreground">
          ← {song.title}
        </Link>
        <span>/</span>
        <span>編輯</span>
      </nav>

      <h1 className="text-2xl font-bold tracking-tight">
        編輯 · {song.title}
      </h1>

      <SongEditor
        slug={slug}
        songKey={song.key}
        initialSource={source ?? TEMPLATE(song.title, song.key)}
        isOverridden={overridden}
      />
    </div>
  );
}
