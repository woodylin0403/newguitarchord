import { describe, expect, it } from "vitest";

import { diffChordPro } from "./diff";

describe("diffChordPro", () => {
  it("marks unchanged text as same", () => {
    const text = "[C]哦主\n[D]我神\n";
    expect(diffChordPro(text, text)).toEqual([
      { type: "same", text: "[C]哦主" },
      { type: "same", text: "[D]我神" },
    ]);
  });

  it("marks a changed line as a remove+add pair", () => {
    const oldText = "[A]哦主\n我神\n";
    const newText = "哦[A]主\n我神\n";
    const lines = diffChordPro(oldText, newText);
    expect(lines).toContainEqual({ type: "remove", text: "[A]哦主" });
    expect(lines).toContainEqual({ type: "add", text: "哦[A]主" });
    expect(lines).toContainEqual({ type: "same", text: "我神" });
  });

  it("handles an added line at the end", () => {
    const lines = diffChordPro("[C]一\n", "[C]一\n[D]二\n");
    expect(lines).toEqual([
      { type: "same", text: "[C]一" },
      { type: "add", text: "[D]二" },
    ]);
  });
});
