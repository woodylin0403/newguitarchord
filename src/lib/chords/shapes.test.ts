import { describe, expect, it } from "vitest";

import { getChordShape, shapeBaseFret } from "./shapes";

describe("getChordShape", () => {
  it("returns the known open voicings", () => {
    expect(getChordShape("C")).toEqual({ frets: [null, 3, 2, 0, 1, 0], movable: false });
    expect(getChordShape("G")).toEqual({ frets: [3, 2, 0, 0, 0, 3], movable: false });
    expect(getChordShape("Am")).toEqual({ frets: [null, 0, 2, 2, 1, 0], movable: false });
    expect(getChordShape("E7")).toEqual({ frets: [0, 2, 0, 1, 0, 0], movable: false });
    expect(getChordShape("Cmaj7")).toEqual({ frets: [null, 3, 2, 0, 0, 0], movable: false });
  });

  it("simplifies the symbol before looking it up", () => {
    expect(getChordShape("Dsus4")?.frets).toEqual([null, null, 0, 2, 3, 2]); // -> D
    expect(getChordShape("G/B")?.frets).toEqual([3, 2, 0, 0, 0, 3]); // -> G
    expect(getChordShape("Am7add11")?.frets).toEqual([null, 0, 2, 0, 1, 0]); // -> Am7
  });

  it("generates a movable barre for chords with no open voicing", () => {
    const bb = getChordShape("Bb"); // A-shape barre at fret 1
    expect(bb).toEqual({ frets: [null, 1, 3, 3, 3, 1], movable: true });

    const fsharpm = getChordShape("F#m"); // E-shape barre at fret 2
    expect(fsharpm).toEqual({ frets: [2, 4, 4, 2, 2, 2], movable: true });
  });

  it("returns null for non-chords", () => {
    expect(getChordShape("N.C.")).toBeNull();
  });
});

describe("shapeBaseFret", () => {
  it("shows the nut for shapes within the first four frets", () => {
    expect(shapeBaseFret([null, 3, 2, 0, 1, 0])).toBe(1);
    expect(shapeBaseFret([null, 2, 4, 4, 4, 2])).toBe(1);
  });

  it("starts the grid at the lowest fret for high barre chords", () => {
    expect(shapeBaseFret([5, 7, 7, 6, 5, 5])).toBe(5);
  });

  it("handles all-open / all-muted shapes", () => {
    expect(shapeBaseFret([0, 0, 0, 0, 0, 0])).toBe(1);
    expect(shapeBaseFret([null, null, null, null, null, null])).toBe(1);
  });
});
