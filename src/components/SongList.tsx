import Link from "next/link";

import type { SongSummary } from "@/lib/songs/types";

/** Vertical list of songs linking to each song page. */
export function SongList({
  songs,
  showKey = false,
  transcribed,
}: {
  songs: SongSummary[];
  showKey?: boolean;
  /** slugs with a chord chart — shown with an accent dot */
  transcribed?: Set<string>;
}) {
  if (songs.length === 0) {
    return (
      <p className="rounded-2xl border border-border bg-surface py-10 text-center text-sm text-muted">
        沒有符合的歌曲。
      </p>
    );
  }

  return (
    <ul className="elevate divide-y divide-border overflow-hidden rounded-2xl border border-border bg-surface">
      {songs.map((song) => {
        const hasChart = transcribed?.has(song.slug) ?? false;
        return (
          <li key={song.slug}>
            <Link
              href={`/songs/${song.slug}`}
              className="flex items-center gap-3 px-4 py-3.5 transition-colors hover:bg-accent-soft"
            >
              <span className="w-6 shrink-0 text-right font-mono text-sm text-muted tabular-nums">
                {song.number}
              </span>
              <span className="min-w-0 flex-1 truncate text-[15px]">
                {song.title}
              </span>
              {hasChart && (
                <span
                  aria-label="已有和弦譜"
                  title="已有和弦譜"
                  className="h-1.5 w-1.5 shrink-0 rounded-full bg-accent"
                />
              )}
              <span className="flex shrink-0 items-center gap-2 font-mono text-xs text-muted">
                {showKey && <span>{song.key}</span>}
                {song.timeSignature && <span>{song.timeSignature}</span>}
              </span>
              <svg
                aria-hidden
                className="shrink-0 text-border-strong"
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="m9 18 6-6-6-6" />
              </svg>
            </Link>
          </li>
        );
      })}
    </ul>
  );
}
