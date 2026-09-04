/**
 * Guitar fingering shapes for the simplified chord vocabulary (major, minor,
 * `7`, `m7`, `maj7`). Open/common shapes are tabulated; anything else is
 * generated as a movable barre chord (E-shape or A-shape, whichever sits
 * lower on the neck).
 *
 * `frets`: six entries, string 6 (low E) → string 1 (high E).
 *   null = muted (×), 0 = open, ≥1 = absolute fret number.
 */

import { parseChord, simplifyQuality, type SimpleQuality } from "@/lib/music";

export interface ChordShape {
  frets: (number | null)[];
  /** true when the shape is a generated movable barre rather than a known open voicing */
  movable: boolean;
}

const x = null;

// Keyed by pitch class (0 = C … 11 = B) within each quality.
const OPEN: Record<SimpleQuality, Partial<Record<number, (number | null)[]>>> = {
  "": {
    0: [x, 3, 2, 0, 1, 0], // C
    2: [x, x, 0, 2, 3, 2], // D
    4: [0, 2, 2, 1, 0, 0], // E
    5: [1, 3, 3, 2, 1, 1], // F
    7: [3, 2, 0, 0, 0, 3], // G
    9: [x, 0, 2, 2, 2, 0], // A
    11: [x, 2, 4, 4, 4, 2], // B
  },
  m: {
    0: [x, 3, 5, 5, 4, 3], // Cm
    2: [x, x, 0, 2, 3, 1], // Dm
    4: [0, 2, 2, 0, 0, 0], // Em
    5: [1, 3, 3, 1, 1, 1], // Fm
    7: [3, 5, 5, 3, 3, 3], // Gm
    9: [x, 0, 2, 2, 1, 0], // Am
    11: [x, 2, 4, 4, 3, 2], // Bm
  },
  "7": {
    0: [x, 3, 2, 3, 1, 0], // C7
    2: [x, x, 0, 2, 1, 2], // D7
    4: [0, 2, 0, 1, 0, 0], // E7
    5: [1, 3, 1, 2, 1, 1], // F7
    7: [3, 2, 0, 0, 0, 1], // G7
    9: [x, 0, 2, 0, 2, 0], // A7
    11: [x, 2, 1, 2, 0, 2], // B7
  },
  m7: {
    0: [x, 3, 5, 3, 4, 3], // Cm7
    2: [x, x, 0, 2, 1, 1], // Dm7
    4: [0, 2, 0, 0, 0, 0], // Em7
    5: [1, 3, 1, 1, 1, 1], // Fm7
    7: [3, 5, 3, 3, 3, 3], // Gm7
    9: [x, 0, 2, 0, 1, 0], // Am7
    11: [x, 2, 0, 2, 0, 2], // Bm7
  },
  maj7: {
    0: [x, 3, 2, 0, 0, 0], // Cmaj7
    2: [x, x, 0, 2, 2, 2], // Dmaj7
    4: [0, 2, 1, 1, 0, 0], // Emaj7
    5: [x, x, 3, 2, 1, 0], // Fmaj7
    7: [3, 2, 0, 0, 0, 2], // Gmaj7
    9: [x, 0, 2, 1, 2, 0], // Amaj7
  },
};

/** Movable barre shape when there is no open voicing for (pitch class, quality). */
function movableShape(pc: number, quality: SimpleQuality): (number | null)[] {
  const eFret = (((pc - 4) % 12) + 12) % 12 || 12; // root on string 6
  const aFret = (((pc - 9) % 12) + 12) % 12 || 12; // root on string 5
  const useA = aFret <= eFret;
  const n = useA ? aFret : eFret;

  const eShapes: Record<SimpleQuality, (number | null)[]> = {
    "": [n, n + 2, n + 2, n + 1, n, n],
    m: [n, n + 2, n + 2, n, n, n],
    "7": [n, n + 2, n, n + 1, n, n],
    m7: [n, n + 2, n, n, n, n],
    maj7: [n, n + 2, n + 1, n + 1, n, n],
  };
  const aShapes: Record<SimpleQuality, (number | null)[]> = {
    "": [x, n, n + 2, n + 2, n + 2, n],
    m: [x, n, n + 2, n + 2, n + 1, n],
    "7": [x, n, n + 2, n, n + 2, n],
    m7: [x, n, n + 2, n, n + 1, n],
    maj7: [x, n, n + 2, n + 1, n + 2, n],
  };
  return useA ? aShapes[quality] : eShapes[quality];
}

/**
 * Fingering for a chord symbol, reduced to the simplified vocabulary first.
 * Returns null only for non-chord tokens.
 */
export function getChordShape(symbol: string): ChordShape | null {
  const chord = parseChord(symbol);
  if (!chord) return null;

  const quality = simplifyQuality(chord.suffix);
  const open = OPEN[quality][chord.root];
  if (open) return { frets: open, movable: false };
  return { frets: movableShape(chord.root, quality), movable: true };
}

/** Lowest fret the diagram grid should start at (1 = show the nut). */
export function shapeBaseFret(frets: (number | null)[]): number {
  const fretted = frets.filter((f): f is number => typeof f === "number" && f > 0);
  if (fretted.length === 0) return 1;
  const max = Math.max(...fretted);
  if (max <= 4) return 1;
  return Math.min(...fretted);
}
