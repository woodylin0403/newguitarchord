"use client";

import { useState, useTransition } from "react";

import { setSongScan } from "@/app/songs/[slug]/edit/actions";

/**
 * Admin control to pin a song to ONE crop image from its hymnal page, so the
 * song page shows just that song's scan instead of the whole page.
 * Click a thumbnail to pin it; click "用整頁掃描" to unpin.
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
  const [pending, startTransition] = useTransition();

  if (crops.length === 0) return null;

  const pin = (crop: string | null) => {
    setMsg(null);
    startTransition(async () => {
      const res = await setSongScan(slug, crop);
      if (res.ok) {
        setCurrent(crop);
        setMsg(crop ? "已設定為這首的掃描圖。" : "已改回整頁掃描。");
      } else {
        setMsg(res.error ?? "設定失敗");
      }
    });
  };

  return (
    <section className="space-y-2 rounded-xl border border-border bg-surface p-3">
      <div className="flex items-center justify-between">
        <span className="text-[11px] font-semibold uppercase tracking-[0.15em] text-muted">
          這首的掃描圖
        </span>
        <button
          type="button"
          onClick={() => pin(null)}
          disabled={pending || current === null}
          className="rounded-full border border-border px-3 py-1 text-xs disabled:opacity-40"
        >
          用整頁掃描
        </button>
      </div>

      <p className="text-xs text-muted">
        點一張裁切圖，把它設成這首歌自己的掃描圖（否則顯示整頁）。
      </p>

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
              className={`overflow-hidden rounded-lg border-2 bg-white transition disabled:opacity-50 ${
                active
                  ? "border-accent"
                  : "border-transparent hover:border-border-strong"
              }`}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={`/scans/${crop}`}
                alt={crop}
                loading="lazy"
                className="w-full"
              />
              <span className="block px-1 py-0.5 text-center font-mono text-[10px] text-muted">
                {crop.replace(/\.png$/, "")}
              </span>
            </button>
          );
        })}
      </div>

      {msg && (
        <p className="rounded-lg bg-accent-soft px-3 py-2 text-xs text-accent">
          {msg}
        </p>
      )}
    </section>
  );
}
