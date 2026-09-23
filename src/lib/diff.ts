import { diffLines } from "diff";

export interface DiffLine {
  type: "add" | "remove" | "same";
  text: string;
}

/** Line-level diff between two ChordPro texts, for the revision-history view. */
export function diffChordPro(oldText: string, newText: string): DiffLine[] {
  const lines: DiffLine[] = [];
  for (const part of diffLines(oldText, newText)) {
    const type = part.added ? "add" : part.removed ? "remove" : "same";
    for (const line of part.value.replace(/\n$/, "").split("\n")) {
      lines.push({ type, text: line });
    }
  }
  return lines;
}
