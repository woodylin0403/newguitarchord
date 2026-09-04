/**
 * Capo suggestions: given a song's original key, which capo positions let the
 * player use easy open-chord shapes while the guitar still sounds in that key.
 *
 * A capo on fret N raises everything N semitones, so:
 *   sounding key = shape key + N   ⇒   shape key = original key − N
 */

import { transposeKeyName, parseKey } from "./keys";

export interface CapoOption {
  /** fret to clamp the capo on; 0 means "no capo" */
  capo: number;
  /** the key whose chord shapes the player actually fingers */
  shapeKey: string;
  /** the key the guitar sounds in — always the song's original key */
  soundingKey: string;
}

/** Open-position major keys, roughly easiest first. */
const FRIENDLY_MAJOR = ["C", "G", "D", "A", "E"];
/** Open-position minor keys, roughly easiest first. */
const FRIENDLY_MINOR = ["Em", "Am", "Dm"];

export interface SuggestCapoOptions {
  /** highest capo fret to consider (default 7) */
  maxCapo?: number;
}

/**
 * All capo positions (0..maxCapo) that land on an open-chord shape key,
 * ordered best-first: lowest capo wins, ties broken by how easy the shape is.
 * An empty array means no friendly shape was found in range.
 */
export function suggestCapo(
  originalKey: string,
  { maxCapo = 7 }: SuggestCapoOptions = {},
): CapoOption[] {
  const info = parseKey(originalKey);
  if (!info) return [];

  const friendly = info.mode === "minor" ? FRIENDLY_MINOR : FRIENDLY_MAJOR;

  const options: CapoOption[] = [];
  for (let capo = 0; capo <= maxCapo; capo++) {
    const shapeKey = transposeKeyName(info.name, -capo);
    if (friendly.includes(shapeKey)) {
      options.push({ capo, shapeKey, soundingKey: info.name });
    }
  }

  return options.sort((a, b) => {
    if (a.capo !== b.capo) return a.capo - b.capo;
    return friendly.indexOf(a.shapeKey) - friendly.indexOf(b.shapeKey);
  });
}

/** The single recommended capo option, or `null` if none is in range. */
export function bestCapo(
  originalKey: string,
  options?: SuggestCapoOptions,
): CapoOption | null {
  return suggestCapo(originalKey, options)[0] ?? null;
}
