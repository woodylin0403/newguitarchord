/** Public surface of the music library: keys, chords, transposition, capo, ChordPro. */

export {
  type PitchClass,
  SHARP_NAMES,
  FLAT_NAMES,
  mod12,
  parseNoteName,
  pitchClassName,
} from "./pitch";

export {
  CATALOG_KEYS,
  type CatalogKey,
  type Mode,
  type KeyInfo,
  parseKey,
  keyPitchPrefersFlats,
  transposeKeyName,
  semitonesBetweenKeys,
  isCatalogKey,
  diatonicChords,
} from "./keys";

export {
  type Chord,
  type SimpleQuality,
  parseChord,
  formatChord,
  transposeChord,
  simplifyQuality,
  simplifyChordSymbol,
} from "./chord";

export {
  type TransposeOptions,
  transposeChordToken,
  transposeChordProText,
} from "./transpose";

export {
  type CapoOption,
  type SuggestCapoOptions,
  suggestCapo,
  bestCapo,
} from "./capo";

export {
  type SectionType,
  type ChordProChunk,
  type ChordProLine,
  type ChordProSection,
  type ChordProDocument,
  parseLyricLine,
  parseChordPro,
  collectChords,
} from "./chordpro";
