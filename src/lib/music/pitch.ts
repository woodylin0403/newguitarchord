/**
 * Pitch-class helpers: the 12 chromatic pitch classes (0 = C … 11 = B) and the
 * two spelling tables (sharps vs flats) used when rendering a transposed chord.
 */

export type PitchClass = 0 | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | 11;

export const SHARP_NAMES = [
  "C",
  "C#",
  "D",
  "D#",
  "E",
  "F",
  "F#",
  "G",
  "G#",
  "A",
  "A#",
  "B",
] as const;

export const FLAT_NAMES = [
  "C",
  "Db",
  "D",
  "Eb",
  "E",
  "F",
  "Gb",
  "G",
  "Ab",
  "A",
  "Bb",
  "B",
] as const;

/** Semitone offset of each natural note letter. */
const NATURAL: Record<string, PitchClass> = {
  C: 0,
  D: 2,
  E: 4,
  F: 5,
  G: 7,
  A: 9,
  B: 11,
};

/** Positive modulo into the 0–11 pitch-class range. */
export function mod12(n: number): PitchClass {
  return ((((n % 12) + 12) % 12) as PitchClass);
}

export interface ParsedNote {
  pc: PitchClass;
  /** true when the written note used a flat sign */
  flat: boolean;
  /** true when the written note used a sharp sign */
  sharp: boolean;
}

/**
 * Parse a bare note name such as `C`, `F#`, `Bb`, `C♯`, `E♭`.
 * Returns `null` for anything that is not a single letter + optional accidental.
 */
export function parseNoteName(name: string): ParsedNote | null {
  const m = /^([A-Ga-g])([#♯b♭]?)$/.exec(name.trim());
  if (!m) return null;

  let pc = NATURAL[m[1].toUpperCase()];
  const sharp = m[2] === "#" || m[2] === "♯";
  const flat = m[2] === "b" || m[2] === "♭";
  if (sharp) pc = mod12(pc + 1);
  if (flat) pc = mod12(pc - 1);

  return { pc, flat, sharp };
}

/** Render a pitch class as a note name, choosing the sharp or flat spelling. */
export function pitchClassName(pc: PitchClass, useFlats: boolean): string {
  return (useFlats ? FLAT_NAMES : SHARP_NAMES)[pc];
}
