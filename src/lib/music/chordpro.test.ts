import { describe, expect, it } from "vitest";

import { collectChords, parseChordPro, parseLyricLine } from "./chordpro";

describe("parseLyricLine", () => {
  it("splits a line into chord/lyric chunks", () => {
    expect(parseLyricLine("[D]神啊 [A]我的心切[Bm]慕你")).toEqual([
      { chord: "D", lyric: "神啊 " },
      { chord: "A", lyric: "我的心切" },
      { chord: "Bm", lyric: "慕你" },
    ]);
  });

  it("keeps a leading lyric with no chord", () => {
    expect(parseLyricLine("哦 [G]主耶穌")).toEqual([
      { chord: null, lyric: "哦 " },
      { chord: "G", lyric: "主耶穌" },
    ]);
  });

  it("treats a plain line as a single null-chord chunk", () => {
    expect(parseLyricLine("純粹歌詞")).toEqual([
      { chord: null, lyric: "純粹歌詞" },
    ]);
  });

  it("handles a trailing chord with no lyric after it", () => {
    expect(parseLyricLine("結束 [D]")).toEqual([
      { chord: null, lyric: "結束 " },
      { chord: "D", lyric: "" },
    ]);
  });
});

describe("parseChordPro", () => {
  const source = [
    "{title: 主啊我的心切慕你}",
    "{key: D}",
    "{capo: 2}",
    "# a source comment, ignored",
    "",
    "[D]神啊 [A]我的心切[Bm]慕你",
    "如鹿[G]切慕溪水",
    "",
    "{start_of_chorus: 副歌}",
    "{comment: 輕聲}",
    "[D]我要見你[A]面",
    "{end_of_chorus}",
    "",
    "回到[D]主前",
  ].join("\n");

  const doc = parseChordPro(source);

  it("collects metadata directives and aliases", () => {
    expect(doc.meta).toMatchObject({
      title: "主啊我的心切慕你",
      key: "D",
      capo: "2",
    });
  });

  it("groups lines into sections", () => {
    expect(doc.sections.map((s) => s.type)).toEqual(["none", "chorus", "none"]);
    expect(doc.sections[1].label).toBe("副歌");
  });

  it("drops source comments but keeps {comment} lines", () => {
    const chorus = doc.sections[1];
    expect(chorus.lines[0]).toEqual({ kind: "comment", text: "輕聲" });
  });

  it("parses lyric lines with and without chords", () => {
    const [first] = doc.sections[0].lines;
    expect(first).toEqual({
      kind: "lyrics",
      chunks: [
        { chord: "D", lyric: "神啊 " },
        { chord: "A", lyric: "我的心切" },
        { chord: "Bm", lyric: "慕你" },
      ],
    });
  });

  it("trims blank lines at section edges", () => {
    for (const section of doc.sections) {
      expect(section.lines.at(0)?.kind).not.toBe("blank");
      expect(section.lines.at(-1)?.kind).not.toBe("blank");
    }
  });

  it("collects distinct chords in first-seen order", () => {
    expect(collectChords(doc)).toEqual(["D", "A", "Bm", "G"]);
  });
});
