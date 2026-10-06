import { describe, expect, it } from "vitest";

import {
  alignChart,
  assemble,
  bitmapFromRgba,
  chordAnchors,
  lyricGlyphs,
  parseOcrChart,
  type Bitmap,
  type OcrChart,
} from "./align";

// Ink geometry measured from a real scan (「當聖靈在我的心」, 837×474):
// [band top, band bottom, ...ink column runs "left-right"].
const SCAN: [number, number, string][] = [
  [21, 76, "113-169 194-275 321-690 750-773"], // title row
  [91, 135, "138-156 159-183 559-579 583-604 610-628 631-655 776-797 801-822"],
  [152, 201, "41-83 89-131 137-180 185-228 234-277 283-325 329-336 342-374 402-447 450-495 499-544 547-592 596-639 669-712 718-760 764-809"],
  [216, 259, "186-231 545-595 694-712 715-739"],
  [276, 325, "41-83 88-131 135-180 184-228 254-264 281-325 329-374 389-399 426-469 473-519 524-536 539-565 596-641 643-689 693-704 707-735 764-808"],
  [344, 386, "87-107 111-132 281-328"],
  [403, 451, "41-83 87-132 137-178 184-228 232-277 280-325 351-361 377-420 426-469 485-496"],
];

function scanBitmap(shearDeg = 0): Bitmap {
  const width = 837;
  const t = Math.tan((shearDeg * Math.PI) / 180);
  const pad = Math.ceil(width * Math.abs(t)) + 2;
  const height = 474 + pad * 2;
  const ink = new Uint8Array(width * height);
  for (const [top, bottom, runs] of SCAN) {
    for (const run of runs.split(" ")) {
      const [l, r] = run.split("-").map(Number);
      for (let x = l; x <= r; x++) {
        for (let y = top; y <= bottom; y++) {
          ink[(Math.round(y + x * t) + pad) * width + x] = 1;
        }
      }
    }
  }
  return { width, height, ink };
}

const CHART: OcrChart = {
  header: true,
  title: "當聖靈在我的心",
  key: "Em",
  time: "4/4",
  lines: [
    {
      // deliberately wrong `at` guesses — measurement must override them
      chords: [
        { chord: "Em", at: 0 },
        { chord: "B7", at: 9 },
        { chord: "Em", at: 11 },
        { chord: "B7", at: 14 },
      ],
      lyrics: "當聖靈在我的心 我要歌頌主 像當年",
      section: null,
      label: null,
    },
    {
      chords: [
        { chord: "Em", at: 1 },
        { chord: "Am", at: 9 },
        { chord: "Em", at: 13 },
      ],
      lyrics: "的大衛王（二次）我要唱 我要唱 像",
      section: null,
      label: null,
    },
    {
      chords: [
        { chord: "B7", at: 0 },
        { chord: "Em", at: 4 },
      ],
      lyrics: "當年的大衛王（二次）",
      section: null,
      label: null,
    },
  ],
};

const EXPECTED = [
  "當聖[Em]靈在我的心 我要歌[B7]頌[Em]主 像當[B7]年",
  "的大衛[Em]王（二次）我要[Am]唱 我要[Em]唱 像",
  "當[B7]年的大衛[Em]王（二次）",
];

const body = (chordpro: string) =>
  chordpro.split("\n").filter((l) => l && !l.startsWith("{"));

describe("alignChart", () => {
  it("places chords on the characters they are printed over", () => {
    const r = alignChart(scanBitmap(), CHART);
    expect(r.measured).toBe(3);
    expect(r.needed).toBe(3);
    expect(body(r.chordpro)).toEqual(EXPECTED);
    expect(r.chordpro.startsWith("{title: 當聖靈在我的心}\n{key: Em}\n{time: 4/4}\n")).toBe(true);
  });

  it("straightens a tilted scan before measuring", () => {
    for (const deg of [-2, 1.5, 2.5]) {
      const r = alignChart(scanBitmap(deg), CHART);
      expect(r.measured).toBe(3);
      expect(body(r.chordpro)).toEqual(EXPECTED);
    }
  });

  it("copes with the model missing the title row", () => {
    const r = alignChart(scanBitmap(), { ...CHART, header: false });
    expect(r.measured).toBe(3);
    expect(body(r.chordpro)).toEqual(EXPECTED);
  });

  it("falls back to the model's guesses when rows don't line up", () => {
    const extra: OcrChart = {
      ...CHART,
      lines: [
        ...CHART.lines,
        { chords: [], lyrics: "多出來的一行", section: null, label: null },
        { chords: [], lyrics: "又一行", section: null, label: null },
      ],
    };
    const r = alignChart(scanBitmap(), extra);
    expect(r.measured).toBe(0);
    expect(body(r.chordpro)[0]).toBe("[Em]當聖靈在我的心 我[B7]要歌[Em]頌主 [B7]像當年");
  });
});

describe("lyricGlyphs", () => {
  it("merges strokes of one character and splits touching neighbours", () => {
    // 心 drawn as two runs; 衛王 blurred into one blob
    const runs = [
      { left: 0, right: 40 },
      { left: 50, right: 56 },
      { left: 62, right: 92 },
      { left: 100, right: 190 },
    ];
    const glyphs = lyricGlyphs(runs, 4, 48);
    expect(glyphs?.map((g) => g.left)).toEqual([0, 50, 100, 146]);
  });
});

describe("chordAnchors", () => {
  it("splits chords printed back to back", () => {
    // "Em"  …  "B7Em" (four letter runs) …  "B7"
    const runs = [
      { left: 138, right: 156 },
      { left: 159, right: 183 },
      { left: 559, right: 579 },
      { left: 583, right: 604 },
      { left: 610, right: 628 },
      { left: 631, right: 655 },
      { left: 776, right: 797 },
      { left: 801, right: 822 },
    ];
    const xs = chordAnchors(runs, ["Em", "B7", "Em", "B7"], 45);
    expect(xs?.map(Math.round)).toEqual([150, 571, 622, 788]);
  });
});

describe("bitmapFromRgba", () => {
  it("marks dark pixels as ink, and inverts light-on-dark images", () => {
    const px = (v: number) => [v, v, v, 255];
    const dark = bitmapFromRgba(
      new Uint8Array([...px(0), ...px(255), ...px(255), ...px(255)]),
      2,
      2,
    );
    expect([...dark.ink]).toEqual([1, 0, 0, 0]);
    const inverted = bitmapFromRgba(
      new Uint8Array([...px(255), ...px(0), ...px(0), ...px(0)]),
      2,
      2,
    );
    expect([...inverted.ink]).toEqual([1, 0, 0, 0]);
  });
});

describe("parseOcrChart", () => {
  it("coerces loose model output", () => {
    const chart = parseOcrChart({
      header: true,
      title: " 歌 ",
      lines: [
        { chords: ["C", { chord: "G", at: 2.4 }, { chord: "" }], lyrics: "一二三  " },
        { chords: [], lyrics: "" },
        "junk",
        { chords: [], lyrics: "四五", section: "chorus", label: "" },
      ],
    });
    expect(chart).toEqual({
      header: true,
      title: "歌",
      key: "",
      time: "",
      lines: [
        {
          chords: [
            { chord: "C", at: null },
            { chord: "G", at: 2 },
          ],
          lyrics: "一二三",
          section: null,
          label: null,
        },
        { chords: [], lyrics: "四五", section: "chorus", label: null },
      ],
    });
  });

  it("rejects non-charts", () => {
    expect(parseOcrChart(null)).toBeNull();
    expect(parseOcrChart({ lines: [] })).toBeNull();
    expect(parseOcrChart({ title: "x" })).toBeNull();
  });
});

describe("assemble", () => {
  it("opens and closes sections", () => {
    const chart: OcrChart = {
      header: false,
      title: "",
      key: "",
      time: "",
      lines: [
        { chords: [], lyrics: "a", section: "verse", label: "一", },
        { chords: [], lyrics: "b", section: null, label: null },
        { chords: [], lyrics: "c", section: "chorus", label: null },
      ],
    };
    expect(assemble(chart, ["a", "b", "c"])).toBe(
      "{start_of_verse: 一}\na\nb\n{end_of_verse}\n\n{start_of_chorus}\nc\n{end_of_chorus}\n",
    );
  });
});
