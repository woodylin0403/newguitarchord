import type { Metadata } from "next";
import Link from "next/link";

import { NewSongForm } from "@/components/NewSongForm";
import { getSessionInfo } from "@/lib/supabase/server";

export const metadata: Metadata = { robots: { index: false } };

// The embedded 和弦圖轉譜 panel calls a Claude-vision server action.
export const maxDuration = 60;

export default async function NewSongPage() {
  const { isAdmin, authenticated } = await getSessionInfo();

  if (!isAdmin) {
    return (
      <div className="space-y-3 py-10 text-center">
        <p className="text-sm text-muted">
          {authenticated
            ? "這個帳號不是管理員，無法新增歌曲。"
            : "請先用管理員 Google 帳號登入。"}
        </p>
        <Link href="/" className="inline-block text-sm text-accent underline">
          回首頁
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <nav className="flex items-center gap-1.5 text-xs text-muted">
        <Link href="/" className="hover:text-foreground">
          全部
        </Link>
        <span>/</span>
        <span>新增歌曲</span>
      </nav>
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h1 className="font-display text-2xl font-semibold tracking-tight">
          新增歌曲
        </h1>
        <Link
          href="/tools/ocr"
          className="text-xs text-accent underline underline-offset-2"
        >
          從和弦圖轉入 →
        </Link>
      </div>
      <NewSongForm />
    </div>
  );
}
