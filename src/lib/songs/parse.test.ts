import { readFileSync } from "node:fs";
import path from "node:path";

import { describe, expect, it } from "vitest";

import {
  filterByTitle,
  groupByKey,
  parseCatalog,
  parseCatalogEntry,
  songSlug,
} from "./parse";
import type { RawCatalog } from "./types";

describe("parseCatalogEntry", () => {
  it("parses a full entry with a time signature", () => {
    expect(parseCatalogEntry("C", "3|讚美救主耶穌|1|3/4")).toEqual({
      slug: "c-3",
      key: "C",
      number: 3,
      title: "讚美救主耶穌",
      bookPage: 1,
      timeSignature: "3/4",
    });
  });

  it("treats a missing time signature as null", () => {
    expect(parseCatalogEntry("Am", "5|倚靠耶和華|11")).toMatchObject({
      slug: "am-5",
      timeSignature: null,
    });
  });

  it("rejects malformed rows", () => {
    expect(parseCatalogEntry("C", "just a title")).toBeNull();
    expect(parseCatalogEntry("C", "x|title|1")).toBeNull();
    expect(parseCatalogEntry("C", "1||1")).toBeNull();
  });
});

describe("songSlug", () => {
  it("lower-cases the key and joins with the number", () => {
    expect(songSlug("Dm", 11)).toBe("dm-11");
    expect(songSlug("G", 60)).toBe("g-60");
  });
});

describe("parseCatalog", () => {
  const raw: RawCatalog = {
    C: ["1|甲|1", "2|乙|1|6/8"],
    Am: ["1|丙|11"],
    junkKey: ["1|丁|1"],
  };

  it("flattens known key groups in canonical order and ignores unknown keys", () => {
    const songs = parseCatalog(raw);
    expect(songs.map((s) => s.slug)).toEqual(["c-1", "c-2", "am-1"]);
  });

  it("groups back by key", () => {
    const byKey = groupByKey(parseCatalog(raw));
    expect(byKey.get("C")?.length).toBe(2);
    expect(byKey.get("Am")?.length).toBe(1);
    expect(byKey.get("D")?.length).toBe(0);
  });
});

describe("filterByTitle", () => {
  const songs = parseCatalog({ C: ["1|讚美救主耶穌|1", "2|舉目仰望|1"] });

  it("matches on a substring, case-insensitively", () => {
    expect(filterByTitle(songs, "讚美").map((s) => s.slug)).toEqual(["c-1"]);
    expect(filterByTitle(songs, "")).toEqual([]);
  });
});

describe("the real data/songs.json", () => {
  const raw = JSON.parse(
    readFileSync(path.join(process.cwd(), "data", "songs.json"), "utf8"),
  ) as RawCatalog;
  const songs = parseCatalog(raw);

  it("parses all 328 catalog rows", () => {
    expect(songs).toHaveLength(328);
  });

  it("produces unique slugs", () => {
    expect(new Set(songs.map((s) => s.slug)).size).toBe(songs.length);
  });

  it("keeps the expected key-group counts", () => {
    const counts = Object.fromEntries(
      [...groupByKey(songs)].map(([key, list]) => [key, list.length]),
    );
    expect(counts).toEqual({
      C: 61,
      Am: 10,
      D: 70,
      E: 24,
      F: 46,
      Dm: 11,
      G: 60,
      Em: 10,
      A: 36,
    });
  });
});
