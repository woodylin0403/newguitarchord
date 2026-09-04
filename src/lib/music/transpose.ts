/**
 * Transposition entry points that work on raw text: a single chord token, and a
 * whole ChordPro string (only the `[...]` chord brackets are touched).
 */

import { formatChord, parseChord, transposeChord } from "./chord";
import { keyPitchPrefersFlats, parseKey } from "./keys";

export interface TransposeOptions {
  /** semitones to shift, positive = up */
  semitones: number;
  /**
   * Force flat spelling on (true) or off (false). When omitted the spelling is
   * derived from `targetKey`, falling back to sharps.
   */
  useFlats?: boolean;
  /** the resulting key, used to pick sharp vs flat spelling */
  targetKey?: string;
}

function resolveUseFlats(opts: TransposeOptions): boolean {
  if (typeof opts.useFlats === "boolean") return opts.useFlats;
  if (opts.targetKey) {
    const key = parseKey(opts.targetKey);
    if (key) {
      // An accidental written on the target key wins over convention.
      if (key.explicitAccidental) return key.explicitAccidental === "flat";
      return keyPitchPrefersFlats(key.tonic, key.mode);
    }
  }
  return false;
}

/**
 * Transpose a single chord token. Non-chord text (`N.C.`, `|`, `%`, …) is
 * returned unchanged.
 */
export function transposeChordToken(
  token: string,
  opts: TransposeOptions,
): string {
  const chord = parseChord(token);
  if (!chord) return token;
  return formatChord(transposeChord(chord, opts.semitones), resolveUseFlats(opts));
}

/**
 * Transpose every `[chord]` bracket in a ChordPro string, leaving lyrics,
 * directives and comments untouched.
 */
export function transposeChordProText(
  source: string,
  opts: TransposeOptions,
): string {
  const useFlats = resolveUseFlats(opts);
  return source.replace(/\[([^\]]+)\]/g, (whole, inner: string) => {
    const chord = parseChord(inner);
    if (!chord) return whole;
    return `[${formatChord(transposeChord(chord, opts.semitones), useFlats)}]`;
  });
}
