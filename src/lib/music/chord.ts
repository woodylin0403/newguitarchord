/**
 * Parsing and formatting a single chord symbol, e.g. `C`, `Am7`, `Dsus4`,
 * `F#m7b5`, `D/F#`. The chord's quality/extension text is kept verbatim; only
 * the root and optional bass note are interpreted as pitches.
 */

import { mod12, parseNoteName, pitchClassName, type PitchClass } from "./pitch";

export interface Chord {
  /** the symbol as originally written, trimmed */
  raw: string;
  root: PitchClass;
  /** quality + extensions, kept as written: `m`, `maj7`, `sus4`, `add9`, `` */
  suffix: string;
  /** slash-bass note, or null */
  bass: PitchClass | null;
}

// root -> (anything that isn't a slash) -> optional "/bass"
const CHORD_RE =
  /^([A-Ga-g][#♯b♭]?)((?:[^/\s]|\/(?![A-Ga-g]))*?)(?:\/([A-Ga-g][#♯b♭]?))?$/;

/**
 * Parse a chord symbol. Returns `null` when the token is not a chord
 * (e.g. `N.C.`, `%`, section markers) — callers should keep such text as-is.
 */
export function parseChord(token: string): Chord | null {
  const raw = token.trim();
  if (!raw) return null;

  const m = CHORD_RE.exec(raw);
  if (!m) return null;

  const root = parseNoteName(m[1]);
  if (!root) return null;

  const bass = m[3] ? parseNoteName(m[3]) : null;
  return {
    raw,
    root: root.pc,
    suffix: m[2] ?? "",
    bass: bass ? bass.pc : null,
  };
}

/** Render a chord, choosing sharp or flat spelling for root and bass. */
export function formatChord(chord: Chord, useFlats: boolean): string {
  const root = pitchClassName(chord.root, useFlats);
  const bass =
    chord.bass === null ? "" : `/${pitchClassName(chord.bass, useFlats)}`;
  return `${root}${chord.suffix}${bass}`;
}

/** Shift a parsed chord by a number of semitones (pure; returns a new object). */
export function transposeChord(chord: Chord, semitones: number): Chord {
  return {
    ...chord,
    root: mod12(chord.root + semitones),
    bass: chord.bass === null ? null : mod12(chord.bass + semitones),
  };
}

/** The four chord qualities this project keeps after simplification. */
export type SimpleQuality = "" | "m" | "7" | "m7" | "maj7";

/** Reduce a chord's quality text to one of {major, minor, 7, m7, maj7}. */
export function simplifyQuality(suffix: string): SimpleQuality {
  const s = suffix.trim();
  if (s === "") return "";

  // Major-seventh family: maj7, M7, Δ, maj9… ("M" alone is a plain major triad).
  if (/^(maj7?|Maj7?|MAJ7?|M7|MΔ?|Δ)/.test(s)) {
    return /7|9|11|13|Δ/.test(s) ? "maj7" : "";
  }

  if (/^(dim|°|o)/i.test(s)) return "m"; // diminished -> nearest playable triad
  if (/^(aug|\+)/.test(s)) return ""; // augmented -> major triad

  const minor = /^(m(?!aj)|min|-)/i.test(s);

  // Strip added/suspended/altered tones that do not imply a seventh.
  const core = s
    .replace(/^(min|m|-)/i, "")
    .replace(/\(.*?\)/g, "")
    .replace(/(add|sus)(2|4|6|9|11|13)?/gi, "")
    .replace(/[b#][0-9]+/g, "")
    .replace(/6\/9|69|6/g, "");
  const seventh = /7|9|11|13/.test(core);

  if (minor) return seventh ? "m7" : "m";
  return seventh ? "7" : "";
}

/**
 * Simplify a chord token to a basic triad or seventh, dropping slash-bass
 * inversions and colour tones (`sus`, `add9`, `6`, `9`, …). Non-chords are
 * returned unchanged.
 */
export function simplifyChordSymbol(token: string, useFlats = false): string {
  const chord = parseChord(token);
  if (!chord) return token;
  return `${pitchClassName(chord.root, useFlats)}${simplifyQuality(chord.suffix)}`;
}
