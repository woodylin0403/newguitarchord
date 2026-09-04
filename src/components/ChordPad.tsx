"use client";

import { useState } from "react";

import { diatonicChords } from "@/lib/music";

const ROOTS = ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"];
const QUALITIES: { label: string; suffix: string }[] = [
  { label: "大", suffix: "" },
  { label: "小", suffix: "m" },
  { label: "7", suffix: "7" },
  { label: "m7", suffix: "m7" },
  { label: "maj7", suffix: "maj7" },
];

function Chip({
  label,
  onClick,
  strong = false,
}: {
  label: string;
  onClick: () => void;
  strong?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-md border px-2 py-1 font-mono text-xs leading-none transition-colors ${
        strong
          ? "border-accent bg-accent-soft text-accent"
          : "border-border hover:bg-surface-2"
      }`}
    >
      {label}
    </button>
  );
}

/**
 * Chord palette for the editor. Click a chord to drop `[X]` at the cursor.
 * "本曲" = chords already in the song, "此調" = diatonic chords for the key,
 * plus a build-your-own root × quality grid.
 */
export function ChordPad({
  songKey,
  usedChords,
  onInsert,
}: {
  songKey: string;
  usedChords: string[];
  onInsert: (text: string) => void;
}) {
  const [quality, setQuality] = useState("");
  const [open, setOpen] = useState(false);
  const diatonic = diatonicChords(songKey);

  const insertChord = (c: string) => onInsert(`[${c}]`);

  return (
    <div className="space-y-2 rounded-xl border border-border bg-surface p-2.5 text-sm">
      {usedChords.length > 0 && (
        <div className="flex flex-wrap items-center gap-1">
          <span className="mr-1 text-[11px] text-muted">本曲</span>
          {usedChords.map((c) => (
            <Chip key={c} label={c} onClick={() => insertChord(c)} />
          ))}
        </div>
      )}

      {diatonic.length > 0 && (
        <div className="flex flex-wrap items-center gap-1">
          <span className="mr-1 text-[11px] text-muted">此調</span>
          {diatonic.map((c) => (
            <Chip key={c} label={c} strong onClick={() => insertChord(c)} />
          ))}
        </div>
      )}

      <div className="flex flex-wrap items-center gap-1">
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          className="mr-1 text-[11px] text-muted hover:text-foreground"
        >
          其他 {open ? "▾" : "▸"}
        </button>
        <button
          type="button"
          onClick={() => onInsert(" ")}
          className="rounded-md border border-border px-2 py-1 text-xs leading-none hover:bg-surface-2"
          title="插入空白（讓和弦落在字之間）"
        >
          ␣ 空白
        </button>
      </div>

      {open && (
        <div className="space-y-1.5 border-t border-border pt-2">
          <div className="flex flex-wrap gap-1">
            {QUALITIES.map((q) => (
              <button
                key={q.suffix}
                type="button"
                onClick={() => setQuality(q.suffix)}
                className={`rounded-md border px-2 py-1 text-xs leading-none ${
                  quality === q.suffix
                    ? "border-accent bg-accent-soft text-accent"
                    : "border-border hover:bg-surface-2"
                }`}
              >
                {q.label}
              </button>
            ))}
          </div>
          <div className="flex flex-wrap gap-1">
            {ROOTS.map((r) => (
              <Chip
                key={r}
                label={`${r}${quality}`}
                onClick={() => insertChord(`${r}${quality}`)}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
