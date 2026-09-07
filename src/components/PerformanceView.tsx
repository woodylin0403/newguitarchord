"use client";

import Link from "next/link";
import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  useSyncExternalStore,
  type CSSProperties,
} from "react";

import { transposeKeyName, type ChordProDocument } from "@/lib/music";
import { Button } from "@/components/ui/button";
import { SongLine } from "./SongLine";

const SECTION_LABELS: Record<string, string> = {
  chorus: "副歌",
  bridge: "橋段",
  verse: "",
  none: "",
};

// Larger range than the inline view — this is meant to be read from a stand.
const SCALES = [1, 1.2, 1.45, 1.75, 2.1, 2.5];
const DEFAULT_SCALE_INDEX = 2;
const SCALE_STORAGE_KEY = "hymnbook.perfScale";
const SCALE_EVENT = "hymnbook:perfScale";

function readScaleIndex(): number {
  try {
    const saved = Number(localStorage.getItem(SCALE_STORAGE_KEY));
    if (Number.isInteger(saved) && saved >= 0 && saved < SCALES.length) return saved;
  } catch {
    /* ignore */
  }
  return DEFAULT_SCALE_INDEX;
}

function subscribeScale(onChange: () => void) {
  window.addEventListener(SCALE_EVENT, onChange);
  window.addEventListener("storage", onChange);
  return () => {
    window.removeEventListener(SCALE_EVENT, onChange);
    window.removeEventListener("storage", onChange);
  };
}

function useScale() {
  const index = useSyncExternalStore(
    subscribeScale,
    readScaleIndex,
    () => DEFAULT_SCALE_INDEX,
  );
  const bump = useCallback((delta: number) => {
    const next = Math.max(
      0,
      Math.min(SCALES.length - 1, readScaleIndex() + delta),
    );
    try {
      localStorage.setItem(SCALE_STORAGE_KEY, String(next));
    } catch {
      /* ignore */
    }
    window.dispatchEvent(new Event(SCALE_EVENT));
  }, []);
  return {
    scale: SCALES[index],
    canDecrease: index > 0,
    canIncrease: index < SCALES.length - 1,
    decrease: () => bump(-1),
    increase: () => bump(1),
  };
}

interface WakeLockLike {
  release: () => Promise<void>;
}
interface WakeLockNavigator {
  wakeLock?: { request: (type: "screen") => Promise<WakeLockLike> };
}

/** Keep the screen awake while performing (best-effort; unsupported browsers no-op). */
function useWakeLock() {
  useEffect(() => {
    let lock: WakeLockLike | null = null;
    let cancelled = false;
    const request = async () => {
      try {
        const wl = (navigator as Navigator & WakeLockNavigator).wakeLock;
        if (wl) lock = await wl.request("screen");
      } catch {
        /* denied or unsupported */
      }
    };
    void request();
    const onVisible = () => {
      if (document.visibilityState === "visible" && !cancelled) void request();
    };
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      cancelled = true;
      document.removeEventListener("visibilitychange", onVisible);
      void lock?.release().catch(() => {});
    };
  }, []);
}

/**
 * Distraction-free full-screen view: just section labels, chords and lyrics,
 * with a large adjustable text size and quick transpose. Covers the app chrome.
 */
export function PerformanceView({
  slug,
  title,
  document: doc,
  originalKey,
}: {
  slug: string;
  title: string;
  document: ChordProDocument;
  originalKey: string;
}) {
  const [semitones, setSemitones] = useState(0);
  const text = useScale();
  useWakeLock();

  const currentKey = useMemo(
    () => transposeKeyName(originalKey, semitones),
    [originalKey, semitones],
  );
  const shift = (d: number) =>
    setSemitones((s) => Math.max(-11, Math.min(11, s + d)));

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-background text-foreground">
      <div className="flex items-center justify-between gap-2 border-b border-border px-3 py-2">
        <div className="flex min-w-0 items-baseline gap-2">
          <span className="truncate text-sm font-medium">{title}</span>
          <span className="shrink-0 font-mono text-sm font-bold text-accent">
            {currentKey}
          </span>
        </div>
        <div className="flex shrink-0 items-center gap-1.5">
          <Button
            type="button"
            variant="outline"
            size="icon"
            onClick={() => shift(-1)}
            className="text-lg"
            aria-label="降半音"
          >
            ♭
          </Button>
          <Button
            type="button"
            variant="outline"
            size="icon"
            onClick={() => shift(1)}
            className="text-lg"
            aria-label="升半音"
          >
            ♯
          </Button>
          <Button
            type="button"
            variant="outline"
            size="icon"
            onClick={text.decrease}
            disabled={!text.canDecrease}
            className="text-xs disabled:opacity-35"
            aria-label="縮小字級"
          >
            A−
          </Button>
          <Button
            type="button"
            variant="outline"
            size="icon"
            onClick={text.increase}
            disabled={!text.canIncrease}
            className="text-sm disabled:opacity-35"
            aria-label="放大字級"
          >
            A+
          </Button>
          <Button
            asChild
            variant="outline"
            size="icon"
            className="text-lg"
          >
            <Link href={`/songs/${slug}`} aria-label="離開演奏模式">
              ✕
            </Link>
          </Button>
        </div>
      </div>

      <div
        className="chart flex-1 overflow-y-auto px-4 py-5 [scrollbar-width:thin]"
        style={{ "--song-scale": text.scale } as CSSProperties}
      >
        <div className="space-y-6 pb-24">
          {doc.sections.map((section, si) => {
            const heading =
              section.label || SECTION_LABELS[section.type] || null;
            return (
              <section key={si}>
                {heading && (
                  <h3 className="mb-1.5 text-[0.7em] font-semibold uppercase tracking-[0.15em] text-accent">
                    {heading}
                  </h3>
                )}
                {section.lines.map((line, li) => (
                  <SongLine
                    key={li}
                    line={line}
                    semitones={semitones}
                    targetKey={currentKey}
                  />
                ))}
              </section>
            );
          })}
        </div>
      </div>
    </div>
  );
}
