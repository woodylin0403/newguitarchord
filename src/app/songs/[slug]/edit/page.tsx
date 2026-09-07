import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { ScanPicker } from "@/components/ScanPicker";
import { SongEditor } from "@/components/SongEditor";
import { getSong } from "@/lib/songs/catalog";
import {
  getSongSource,
  hasContentOverride,
} from "@/lib/songs/content";
import { getSongScans, SCAN_URL_BASE } from "@/lib/songs/scans";
import { getSessionInfo } from "@/lib/supabase/server";

export const metadata: Metadata = { robots: { index: false } };

// The embedded 和弦圖轉譜 panel calls a Claude-vision server action.
export const maxDuration = 60;

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

  const [source, overridden, scans] = await Promise.all([
    getSongSource(slug),
    hasContentOverride(slug),
    getSongScans(slug),
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
        isCustom={song.source === "custom"}
        scanUrl={
          scans?.pinnedCrop ? `${SCAN_URL_BASE}/${scans.pinnedCrop}` : null
        }
      />

      {scans && scans.pageCrops.length > 0 &&
        (scans.pinnedCrop ? (
          <details className="rounded-xl border border-border bg-surface">
            <summary className="cursor-pointer list-none px-3 py-2 text-xs font-semibold uppercase tracking-[0.15em] text-muted">
              換一張掃描圖
            </summary>
            <div className="border-t border-border p-3">
              <ScanPicker
                slug={slug}
                crops={scans.pageCrops}
                pinned={scans.pinnedCrop}
              />
            </div>
          </details>
        ) : (
          <ScanPicker
            slug={slug}
            crops={scans.pageCrops}
            pinned={scans.pinnedCrop}
          />
        ))}
    </div>
  );
}
