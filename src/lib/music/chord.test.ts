import { describe, expect, it } from "vitest";

import {
  formatChord,
  parseChord,
  simplifyChordSymbol,
  simplifyQuality,
  transposeChord,
} from "./chord";

describe("parseChord", () => {
  it("parses a bare major triad", () => {
    expect(parseChord("C")).toMatchObject({ root: 0, suffix: "", bass: null });
  });

  it("parses quality/extension into suffix, verbatim", () => {
    expect(parseChord("Am7")).toMatchObject({ root: 9, suffix: "m7" });
    expect(parseChord("Dsus4")).toMatchObject({ root: 2, suffix: "sus4" });
    expect(parseChord("F#m7b5")).toMatchObject({ root: 6, suffix: "m7b5" });
    expect(parseChord("Cmaj7")).toMatchObject({ root: 0, suffix: "maj7" });
  });

  it("parses a slash bass note", () => {
    expect(parseChord("D/F#")).toMatchObject({ root: 2, suffix: "", bass: 6 });
    expect(parseChord("C/G")).toMatchObject({ root: 0, suffix: "", bass: 7 });
  });

  it("reads flats on the root and bass", () => {
    expect(parseChord("Bb")).toMatchObject({ root: 10, suffix: "" });
    expect(parseChord("Abm")).toMatchObject({ root: 8, suffix: "m" });
    expect(parseChord("Eb/Bb")).toMatchObject({ root: 3, bass: 10 });
  });

  it("returns null for non-chords", () => {
    expect(parseChord("N.C.")).toBeNull();
    expect(parseChord("%")).toBeNull();
    expect(parseChord("")).toBeNull();
    expect(parseChord("Hello")).toBeNull();
  });
});

describe("formatChord", () => {
  it("round-trips with the chosen accidental spelling", () => {
    const chord = parseChord("D/F#")!;
    expect(formatChord(chord, false)).toBe("D/F#");
    const eb = parseChord("Eb")!;
    expect(formatChord(eb, true)).toBe("Eb");
    expect(formatChord(eb, false)).toBe("D#");
  });
});

describe("simplifyQuality", () => {
  it("keeps the four basic qualities", () => {
    expect(simplifyQuality("")).toBe("");
    expect(simplifyQuality("m")).toBe("m");
    expect(simplifyQuality("7")).toBe("7");
    expect(simplifyQuality("m7")).toBe("m7");
    expect(simplifyQuality("maj7")).toBe("maj7");
    expect(simplifyQuality("M7")).toBe("maj7");
  });

  it("drops suspensions, added tones and sixths to the plain triad", () => {
    expect(simplifyQuality("sus4")).toBe("");
    expect(simplifyQuality("sus2")).toBe("");
    expect(simplifyQuality("add9")).toBe("");
    expect(simplifyQuality("6")).toBe("");
    expect(simplifyQuality("m6")).toBe("m");
    expect(simplifyQuality("madd9")).toBe("m");
  });

  it("reduces extended dominants and minors to sevenths", () => {
    expect(simplifyQuality("9")).toBe("7");
    expect(simplifyQuality("13")).toBe("7");
    expect(simplifyQuality("7sus4")).toBe("7");
    expect(simplifyQuality("m9")).toBe("m7");
    expect(simplifyQuality("m7b5")).toBe("m7");
    expect(simplifyQuality("maj9")).toBe("maj7");
  });

  it("maps diminished and augmented to nearby triads", () => {
    expect(simplifyQuality("dim")).toBe("m");
    expect(simplifyQuality("dim7")).toBe("m");
    expect(simplifyQuality("aug")).toBe("");
    expect(simplifyQuality("+")).toBe("");
  });
});

describe("simplifyChordSymbol", () => {
  it("drops the slash bass and colour tones", () => {
    expect(simplifyChordSymbol("D/F#")).toBe("D");
    expect(simplifyChordSymbol("Csus4")).toBe("C");
    expect(simplifyChordSymbol("Aadd9")).toBe("A");
    expect(simplifyChordSymbol("G7sus4")).toBe("G7");
    expect(simplifyChordSymbol("Am7")).toBe("Am7");
  });

  it("passes non-chords through untouched", () => {
    expect(simplifyChordSymbol("N.C.")).toBe("N.C.");
  });
});

describe("transposeChord", () => {
  it("shifts root and bass together, wrapping the octave", () => {
    const chord = parseChord("A/C#")!;
    const up3 = transposeChord(chord, 3);
    expect(formatChord(up3, false)).toBe("C/E");
    const down2 = transposeChord(parseChord("C")!, -2);
    expect(formatChord(down2, false)).toBe("A#");
    expect(formatChord(down2, true)).toBe("Bb");
  });
});
