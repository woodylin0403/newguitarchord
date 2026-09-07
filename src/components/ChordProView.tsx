"use client";

import {
  useCallback,
  useMemo,
  useState,
  useSyncExternalStore,
  type CSSProperties,
} from "react";

import {
  collectChords,
  suggestCapo,
  transposeChordToken,
  transposeKeyName,
  type ChordProDocument,
} from "@/lib/music";
import { Button } from "@/components/ui/button";
import { ChordDiagram } from "./ChordDiagram";
import { SongLine } from "./SongLine";

const SECTION_LABELS: Record<string, string> = {
  chorus: "副歌",
  bridge: "橋段",
  verse: "",
  none: "",
};

const SCALES = [0.9, 1, 1.15, 1.35, 1.6];
const DEFAULT_SCALE_INDEX = 1;
const SCALE_STORAGE_KEY = "hymnbook.songScale";
const SCALE_EVENT = "hymnbook:songScale";

function readScaleIndex(): number {
  try {
    const saved = Number(localStorage.getItem(SCALE_STORAGE_KEY));
    if (Number.isInteger(saved) && saved >= 0 && saved < SCALES.length) {
      return saved;
    }
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

/** Reader-controlled chart text size, persisted per browser via localStorage. */
function useSongScale() {
  const index = useSyncExternalStore(
    subscribeScale,
    readScaleIndex,
    () => DEFAULT_SCALE_INDEX,
  );

  // Read the live stored value so rapid clicks compound correctly.
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

/**
 * Renders a parsed ChordPro document with interactive transpose, capo hints,
 * a chord-diagram strip and reader-adjustable text size. The un-transposed
 * default state is fully server-rendered; the client takes over on interaction.
 */
export function ChordProView({
  document,
  originalKey,
}: {
  document: ChordProDocument;
  originalKey: string;
}) {
  const [semitones, setSemitones] = useState(0);
  const text = useSongScale();

  const currentKey = useMemo(
    () => transposeKeyName(originalKey, semitones),
    [originalKey, semitones],
  );
  const capo = useMemo(() => suggestCapo(currentKey).slice(0, 3), [currentKey]);

  const chordSymbols = useMemo(() => {
    const seen = new Set<string>();
    const out: string[] = [];
    for (const raw of collectChords(document)) {
      const t = transposeChordToken(raw, { semitones, targetKey: currentKey });
      if (!seen.has(t)) {
        seen.add(t);
        out.push(t);
      }
    }
    return out;
  }, [document, semitones, currentKey]);

  const shift = (delta: number) =>
    setSemitones((s) => Math.max(-11, Math.min(11, s + delta)));

  return (
    <div>
      <div className="sticky top-[53px] z-10 -mx-4 mb-4 space-y-2 border-b border-border bg-background/85 px-4 py-3 backdrop-blur-md">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-baseline gap-2">
            <span className="font-mono text-2xl font-bold tracking-tight text-accent">
              {currentKey}
            </span>
            {semitones !== 0 && (
              <span className="text-xs text-muted">
                原 {originalKey} · {semitones > 0 ? "+" : ""}
                {semitones}
              </span>
            )}
          </div>
          <div className="flex items-center gap-1.5">
            <Button
              type="button"
              variant="outline"
              size="icon"
              onClick={() => shift(-1)}
              className="size-10 text-xl active:bg-accent-soft"
              aria-label="降半音"
            >
              −
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={() => setSemitones(0)}
              disabled={semitones === 0}
              className="h-10 px-3 text-xs disabled:opacity-35"
            >
              原調
            </Button>
            <Button
              type="button"
              variant="outline"
              size="icon"
              onClick={() => shift(1)}
              className="size-10 text-xl active:bg-accent-soft"
              aria-label="升半音"
            >
              +
            </Button>
          </div>
        </div>

        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-1.5">
            <Button
              type="button"
              variant="outline"
              size="icon"
              onClick={text.decrease}
              disabled={!text.canDecrease}
              className="size-8 text-xs disabled:opacity-35"
              aria-label="縮小字級"
            >
              A<span className="text-[9px]">−</span>
            </Button>
            <Button
              type="button"
              variant="outline"
              size="icon"
              onClick={text.increase}
              disabled={!text.canIncrease}
              className="size-8 text-sm disabled:opacity-35"
              aria-label="放大字級"
            >
              A<span className="text-[10px]">+</span>
            </Button>
          </div>
          {capo.length > 0 && (
            <p className="flex flex-1 flex-wrap justify-end gap-x-3 gap-y-0.5 text-xs text-muted">
              <span className="font-medium text-foreground">Capo</span>
              {capo.map((option) => (
                <span key={option.capo}>
                  {option.capo === 0
                    ? `不夾 → ${option.shapeKey}`
                    : `${option.capo} 格 → ${option.shapeKey}`}
                </span>
              ))}
            </p>
          )}
        </div>
      </div>

      {chordSymbols.length > 0 && (
        <div className="-mx-4 mb-5 overflow-x-auto px-4">
          <div className="flex gap-1">
            {chordSymbols.map((sym) => (
              <ChordDiagram key={sym} symbol={sym} />
            ))}
          </div>
        </div>
      )}

      <div
        className="chart space-y-7"
        style={{ "--song-scale": text.scale } as CSSProperties}
      >
        {document.sections.map((section, si) => {
          const heading = section.label || SECTION_LABELS[section.type] || null;
          return (
            <section key={si}>
              {heading && (
                <h3 className="mb-2 inline-block rounded-md bg-accent-soft px-2 py-0.5 text-[11px] font-semibold uppercase tracking-[0.12em] text-accent">
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
  );
}
