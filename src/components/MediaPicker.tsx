"use client";

import { useState, useTransition } from "react";

import { setSongMedia } from "@/app/songs/[slug]/edit/actions";
import { YouTubeLite } from "@/components/YouTubeLite";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { parseYouTubeId } from "@/lib/youtube";

/**
 * Admin control to attach a YouTube reference video to a song. Paste any
 * YouTube link → the song page shows a player.
 */
export function MediaPicker({
  slug,
  initialId,
}: {
  slug: string;
  initialId: string | null;
}) {
  const [savedId, setSavedId] = useState<string | null>(initialId);
  const [url, setUrl] = useState("");
  const [msg, setMsg] = useState<string | null>(null);
  const [err, setErr] = useState(false);
  const [pending, startTransition] = useTransition();

  const run = (clear: boolean) => {
    setMsg(null);
    setErr(false);
    startTransition(async () => {
      const res = await setSongMedia(slug, clear ? "" : url);
      if (res.ok) {
        if (clear) {
          setSavedId(null);
          setUrl("");
          setMsg("已移除參考影片。");
        } else {
          setSavedId(parseYouTubeId(url));
          setUrl("");
          setMsg("已設定參考影片。");
        }
      } else {
        setErr(true);
        setMsg(res.error ?? "設定失敗");
      }
    });
  };

  return (
    <section className="space-y-2 rounded-xl border border-border bg-surface p-3">
      <span className="text-[11px] font-semibold uppercase tracking-[0.15em] text-muted">
        參考影片（YouTube）
      </span>

      {savedId && (
        <div className="max-w-sm">
          <YouTubeLite id={savedId} />
        </div>
      )}

      <div className="flex flex-wrap items-center gap-2">
        <Input
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          placeholder="貼上 YouTube 連結"
          className="min-w-0 flex-1"
        />
        <Button onClick={() => run(false)} disabled={pending || !url.trim()}>
          {savedId ? "換一部" : "設定"}
        </Button>
        {savedId && (
          <Button
            variant="destructive"
            onClick={() => run(true)}
            disabled={pending}
          >
            移除
          </Button>
        )}
      </div>

      {msg && (
        <p
          className={cn(
            "text-xs",
            err ? "text-red-600 dark:text-red-400" : "text-accent",
          )}
        >
          {msg}
        </p>
      )}
    </section>
  );
}
