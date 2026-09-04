import { describe, expect, it } from "vitest";

import { transposeChordProText, transposeChordToken } from "./transpose";

describe("transposeChordToken", () => {
  it("transposes by semitones", () => {
    expect(transposeChordToken("C", { semitones: 2 })).toBe("D");
    expect(transposeChordToken("Am7", { semitones: 3 })).toBe("Cm7");
    expect(transposeChordToken("D/F#", { semitones: 2 })).toBe("E/G#");
  });

  it("uses the target key to pick spelling", () => {
    expect(transposeChordToken("C", { semitones: 3, targetKey: "Eb" })).toBe("Eb");
    expect(transposeChordToken("C", { semitones: 3, targetKey: "D#m" })).toBe("D#");
  });

  it("honours an explicit useFlats override", () => {
    expect(transposeChordToken("C", { semitones: 1, useFlats: true })).toBe("Db");
    expect(transposeChordToken("C", { semitones: 1, useFlats: false })).toBe("C#");
  });

  it("leaves non-chords alone", () => {
    expect(transposeChordToken("N.C.", { semitones: 5 })).toBe("N.C.");
    expect(transposeChordToken("|", { semitones: 5 })).toBe("|");
  });
});

describe("transposeChordProText", () => {
  it("shifts only the bracketed chords", () => {
    const src = "{title: Test}\n[D]神啊 [A]我的心切[Bm]慕你\n沒有和弦的一行";
    const out = transposeChordProText(src, { semitones: 2, targetKey: "E" });
    expect(out).toBe(
      "{title: Test}\n[E]神啊 [B]我的心切[C#m]慕你\n沒有和弦的一行",
    );
  });

  it("keeps unknown bracket contents untouched", () => {
    expect(transposeChordProText("[N.C.]start", { semitones: 4 })).toBe(
      "[N.C.]start",
    );
  });
});
