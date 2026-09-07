import type { Metadata } from "next";
import Link from "next/link";

import { ChordOcr } from "@/components/ChordOcr";
import { getSessionInfo } from "@/lib/supabase/server";

export const metadata: Metadata = { robots: { index: false } };

export default async function ChordOcrPage() {
  const { isAdmin, authenticated } = await getSessionInfo();

  if (!isAdmin) {
    return (
      <div className="space-y-3 py-10 text-center">
        <p className="text-sm text-muted">
          {authenticated
            ? "這個帳號不是管理員，無法使用轉譜工具。"
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
        <span>和弦圖轉譜</span>
      </nav>
      <h1 className="font-display text-2xl font-semibold tracking-tight">
        和弦圖轉譜
      </h1>
      <p className="text-sm text-muted">
        貼上一張和弦圖（和弦寫在歌詞上方），轉成{" "}
        <code className="font-mono">[和弦]歌詞</code> 的 ChordPro
        文字，可直接帶進「新增歌曲」。手寫或掃描不清時容易出錯，請對照原圖校對。
      </p>
      <ChordOcr />
    </div>
  );
}
