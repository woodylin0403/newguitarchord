"use client";

import { useState, useTransition } from "react";
import { CheckIcon, ImageIcon, Loader2Icon } from "lucide-react";

import { setSongScan } from "@/app/songs/[slug]/edit/actions";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { cn } from "@/lib/utils";

/**
 * Admin control to pin a song to ONE crop image from its hymnal page, so the
 * song page shows just that song's scan instead of the whole page.
 * Click a thumbnail to pin it; "用整頁掃描" unpins.
 */
export function ScanPicker({
  slug,
  crops,
  pinned,
}: {
  slug: string;
  /** every crop filename on this song's page, e.g. "P16_L1.png" */
  crops: string[];
  /** the crop filename currently pinned to this song, or null */
  pinned: string | null;
}) {
  const [current, setCurrent] = useState<string | null>(pinned);
  const [msg, setMsg] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  if (crops.length === 0) return null;

  const pin = (crop: string | null) => {
    setMsg(null);
    setBusy(crop ?? "__page__");
    startTransition(async () => {
      const res = await setSongScan(slug, crop);
      setBusy(null);
      if (res.ok) {
        setCurrent(crop);
        setMsg(crop ? "已設為這首的掃描圖。" : "已改回整頁掃描。");
      } else {
        setMsg(res.error ?? "設定失敗");
      }
    });
  };

  return (
    <Card>
      <CardHeader className="flex-row items-start justify-between gap-3 space-y-0">
        <div className="space-y-1">
          <CardTitle className="flex items-center gap-1.5">
            <ImageIcon className="size-3.5 text-muted" />
            這首的掃描圖
          </CardTitle>
          <CardDescription>
            點一張裁切圖設成這首自己的掃描圖，否則顯示整頁。
          </CardDescription>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => pin(null)}
          disabled={pending || current === null}
        >
          {busy === "__page__" && (
            <Loader2Icon className="size-3.5 animate-spin" />
          )}
          用整頁掃描
        </Button>
      </CardHeader>

      <CardContent className="space-y-3">
        <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
          {crops.map((crop) => {
            const active = crop === current;
            return (
              <button
                key={crop}
                type="button"
                onClick={() => pin(crop)}
                disabled={pending}
                aria-pressed={active}
                className={cn(
                  "group relative overflow-hidden rounded-lg border-2 bg-white transition disabled:opacity-50",
                  active
                    ? "border-accent ring-2 ring-ring/30"
                    : "border-transparent hover:border-border-strong",
                )}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={`/scans/${crop}`} alt={crop} loading="lazy" className="w-full" />
                <span className="block px-1 py-0.5 text-center font-mono text-[10px] text-muted">
                  {crop.replace(/\.png$/, "")}
                </span>
                {active && (
                  <span className="absolute right-1 top-1 flex size-4 items-center justify-center rounded-full bg-accent text-accent-contrast">
                    <CheckIcon className="size-3" strokeWidth={3} />
                  </span>
                )}
                {busy === crop && (
                  <span className="absolute inset-0 flex items-center justify-center bg-surface/60">
                    <Loader2Icon className="size-4 animate-spin text-accent" />
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {msg && <p className="text-xs text-accent">{msg}</p>}
      </CardContent>
    </Card>
  );
}
