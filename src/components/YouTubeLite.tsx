"use client";

import { useState } from "react";

/**
 * Lightweight YouTube embed: shows the thumbnail until clicked, then swaps in
 * the real iframe. Keeps the song page fast and avoids loading YouTube on view.
 */
export function YouTubeLite({ id, title }: { id: string; title?: string }) {
  const [play, setPlay] = useState(false);

  return (
    <div className="relative aspect-video overflow-hidden rounded-xl border border-border bg-black">
      {play ? (
        <iframe
          src={`https://www.youtube-nocookie.com/embed/${id}?autoplay=1&rel=0`}
          title={title ?? "參考影片"}
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
          allowFullScreen
          className="absolute inset-0 h-full w-full"
        />
      ) : (
        <button
          type="button"
          onClick={() => setPlay(true)}
          aria-label="播放參考影片"
          className="group absolute inset-0 h-full w-full"
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={`https://i.ytimg.com/vi/${id}/hqdefault.jpg`}
            alt=""
            loading="lazy"
            className="h-full w-full object-cover opacity-85 transition group-hover:opacity-100"
          />
          <span className="absolute left-1/2 top-1/2 grid size-14 -translate-x-1/2 -translate-y-1/2 place-items-center rounded-full bg-black/55 text-white transition group-hover:bg-black/70">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor">
              <path d="M8 5v14l11-7z" />
            </svg>
          </span>
        </button>
      )}
    </div>
  );
}
