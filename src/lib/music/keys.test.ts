import { describe, expect, it } from "vitest";

import {
  diatonicChords,
  parseKey,
  semitonesBetweenKeys,
  transposeKeyName,
} from "./keys";

describe("parseKey", () => {
  it("reads tonic and mode", () => {
    expect(parseKey("C")).toMatchObject({ tonic: 0, mode: "major" });
    expect(parseKey("Am")).toMatchObject({ tonic: 9, mode: "minor" });
    expect(parseKey("F#m")).toMatchObject({ tonic: 6, mode: "minor" });
  });

  it("flags flat keys", () => {
    expect(parseKey("F")?.prefersFlats).toBe(true);
    expect(parseKey("Bb")?.prefersFlats).toBe(true);
    expect(parseKey("Dm")?.prefersFlats).toBe(true);
    expect(parseKey("G")?.prefersFlats).toBe(false);
    expect(parseKey("E")?.prefersFlats).toBe(false);
  });

  it("returns null for junk", () => {
    expect(parseKey("H")).toBeNull();
    expect(parseKey("")).toBeNull();
  });
});

describe("transposeKeyName", () => {
  it("spells sharp keys with sharps and flat keys with flats", () => {
    expect(transposeKeyName("C", 2)).toBe("D");
    expect(transposeKeyName("C", 1)).toBe("Db");
    expect(transposeKeyName("G", 2)).toBe("A");
    expect(transposeKeyName("D", 3)).toBe("F");
    expect(transposeKeyName("A", -2)).toBe("G");
  });

  it("keeps the mode suffix", () => {
    expect(transposeKeyName("Am", 2)).toBe("Bm");
    expect(transposeKeyName("Em", -2)).toBe("Dm");
    expect(transposeKeyName("Dm", 3)).toBe("Fm");
  });

  it("wraps around the octave", () => {
    expect(transposeKeyName("A", 3)).toBe("C");
    expect(transposeKeyName("B", 1)).toBe("C");
  });
});

describe("diatonicChords", () => {
  it("returns the six diatonic triads plus V7 for a major key", () => {
    expect(diatonicChords("C")).toEqual(["C", "Dm", "Em", "F", "G", "Am", "G7"]);
    expect(diatonicChords("D")).toEqual([
      "D",
      "Em",
      "F#m",
      "G",
      "A",
      "Bm",
      "A7",
    ]);
    expect(diatonicChords("F")).toEqual([
      "F",
      "Gm",
      "Am",
      "Bb",
      "C",
      "Dm",
      "C7",
    ]);
  });

  it("uses the natural-minor degrees plus V7 for a minor key", () => {
    expect(diatonicChords("Am")).toEqual([
      "Am",
      "C",
      "Dm",
      "Em",
      "F",
      "G",
      "E7",
    ]);
    expect(diatonicChords("Em")).toEqual([
      "Em",
      "G",
      "Am",
      "Bm",
      "C",
      "D",
      "B7",
    ]);
  });

  it("returns nothing for an unparseable key", () => {
    expect(diatonicChords("H")).toEqual([]);
  });
});

describe("semitonesBetweenKeys", () => {
  it("returns the shortest signed distance", () => {
    expect(semitonesBetweenKeys("C", "D")).toBe(2);
    expect(semitonesBetweenKeys("C", "A")).toBe(-3);
    expect(semitonesBetweenKeys("D", "D")).toBe(0);
    expect(semitonesBetweenKeys("C", "F#")).toBe(6);
  });
});
