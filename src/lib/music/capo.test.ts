import { describe, expect, it } from "vitest";

import { bestCapo, suggestCapo } from "./capo";

describe("suggestCapo", () => {
  it("offers 'no capo' first when the key is already open-friendly", () => {
    const d = suggestCapo("D");
    expect(d[0]).toMatchObject({ capo: 0, shapeKey: "D", soundingKey: "D" });
  });

  it("recommends capo 1 with E shapes for F", () => {
    expect(bestCapo("F")).toMatchObject({ capo: 1, shapeKey: "E" });
  });

  it("recommends capo 3 with G shapes for Bb (lowest friendly capo)", () => {
    const bb = suggestCapo("Bb");
    expect(bb[0]).toMatchObject({ capo: 1, shapeKey: "A" });
    expect(bb.map((o) => o.shapeKey)).toContain("G");
  });

  it("handles minor keys with minor shapes", () => {
    const em = suggestCapo("Em");
    expect(em[0]).toMatchObject({ capo: 0, shapeKey: "Em" });
    expect(em.map((o) => o.shapeKey)).toEqual(
      expect.arrayContaining(["Em", "Dm", "Am"]),
    );
  });

  it("every option sounds in the original key", () => {
    for (const key of ["C", "D", "E", "F", "G", "A", "Am", "Dm", "Em"]) {
      for (const option of suggestCapo(key)) {
        expect(option.soundingKey).toBe(key);
      }
    }
  });

  it("returns nothing for an unparseable key", () => {
    expect(suggestCapo("H")).toEqual([]);
    expect(bestCapo("H")).toBeNull();
  });
});
