/**
 * Musical keys: the catalog's original-key groups, parsing a key name into a
 * tonic + mode, and transposing a key name while keeping a sane accidental
 * spelling (flats for flat keys, sharps for sharp keys).
 */

import { mod12, parseNoteName, pitchClassName, type PitchClass } from "./pitch";

/**
 * The nine original-key buckets used by `data/songs.json`, in the order the
 * printed hymnal lists them.
 */
export const CATALOG_KEYS = [
  "C",
  "Am",
  "D",
  "E",
  "F",
  "Dm",
  "G",
  "Em",
  "A",
] as const;

export type CatalogKey = (typeof CATALOG_KEYS)[number];

export type Mode = "major" | "minor";

export interface KeyInfo {
  /** the name as given, trimmed */
  name: string;
  tonic: PitchClass;
  mode: Mode;
  /** whether this key conventionally spells its chords with flats */
  prefersFlats: boolean;
  /** accidental explicitly written on the tonic, if any */
  explicitAccidental: "sharp" | "flat" | null;
}

/**
 * Pitch classes whose major key is conventionally written with flats
 * (Db, Eb, F, Ab, Bb). C major and the sharp keys default to sharps.
 */
const MAJOR_FLAT_PC = new Set<PitchClass>([1, 3, 5, 8, 10]);

/**
 * Pitch classes whose minor key is conventionally written with flats
 * (Cm, Dm, Fm, Gm, Bbm, plus Ebm at the enharmonic border).
 */
const MINOR_FLAT_PC = new Set<PitchClass>([0, 2, 3, 5, 7, 10]);

function isMinorName(name: string): boolean {
  return /m$/.test(name) && !/dim$/i.test(name) && !/maj$/i.test(name);
}

/** Does a key with this tonic/mode read more naturally with flats? */
export function keyPitchPrefersFlats(tonic: PitchClass, mode: Mode): boolean {
  return mode === "minor" ? MINOR_FLAT_PC.has(tonic) : MAJOR_FLAT_PC.has(tonic);
}

/**
 * Parse a key name such as `C`, `Am`, `Bb`, `F#m`.
 * Returns `null` when the root is not a valid note name.
 */
export function parseKey(name: string): KeyInfo | null {
  const trimmed = name.trim();
  const minor = isMinorName(trimmed);
  const root = minor ? trimmed.slice(0, -1) : trimmed;
  const note = parseNoteName(root);
  if (!note) return null;

  const mode: Mode = minor ? "minor" : "major";
  return {
    name: trimmed,
    tonic: note.pc,
    mode,
    prefersFlats: note.flat || keyPitchPrefersFlats(note.pc, mode),
    explicitAccidental: note.flat ? "flat" : note.sharp ? "sharp" : null,
  };
}

/**
 * Transpose a key *name* by a number of semitones, returning a new key name
 * spelled with the accidental convention of the destination key.
 * Unparseable input is returned unchanged.
 */
export function transposeKeyName(name: string, semitones: number): string {
  const info = parseKey(name);
  if (!info) return name;

  const tonic = mod12(info.tonic + semitones);
  const useFlats = keyPitchPrefersFlats(tonic, info.mode);
  const root = pitchClassName(tonic, useFlats);
  return info.mode === "minor" ? `${root}m` : root;
}

/**
 * Smallest signed semitone distance to get from `fromKey` to `toKey`
 * (result in the range -6..+5, so a slider stays near zero).
 */
export function semitonesBetweenKeys(fromKey: string, toKey: string): number {
  const a = parseKey(fromKey);
  const b = parseKey(toKey);
  if (!a || !b) return 0;
  let diff = mod12(b.tonic - a.tonic);
  if (diff > 6) diff -= 12;
  return diff;
}

export function isCatalogKey(value: string): value is CatalogKey {
  return (CATALOG_KEYS as readonly string[]).includes(value);
}

/**
 * The chords a song in this key most commonly uses: the six diatonic triads
 * plus the dominant seventh. Simplified vocabulary only (major / minor / 7).
 * Returned in scale-degree order, e.g. D → [D, Em, F#m, G, A, Bm, A7].
 */
export function diatonicChords(keyName: string): string[] {
  const info = parseKey(keyName);
  if (!info) return [];

  const useFlats =
    info.explicitAccidental === "flat" ||
    keyPitchPrefersFlats(info.tonic, info.mode);

  const degrees: readonly [number, string][] =
    info.mode === "minor"
      ? [
          [0, "m"],
          [3, ""],
          [5, "m"],
          [7, "m"],
          [8, ""],
          [10, ""],
          [7, "7"],
        ]
      : [
          [0, ""],
          [2, "m"],
          [4, "m"],
          [5, ""],
          [7, ""],
          [9, "m"],
          [7, "7"],
        ];

  const seen = new Set<string>();
  const chords: string[] = [];
  for (const [semitone, quality] of degrees) {
    const name =
      pitchClassName(mod12(info.tonic + semitone), useFlats) + quality;
    if (!seen.has(name)) {
      seen.add(name);
      chords.push(name);
    }
  }
  return chords;
}
