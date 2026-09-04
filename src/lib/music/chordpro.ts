/**
 * A small ChordPro parser.
 *
 * It understands:
 *  - metadata directives: {title}/{t}, {subtitle}/{st}, {key}, {capo}, {tempo},
 *    {time}, {artist}, {composer}, {ccli}, {year}, and any other {name: value}
 *  - section directives: {start_of_chorus}/{soc}, {end_of_chorus}/{eoc},
 *    {start_of_verse}/{sov}, {start_of_bridge}/{sob} (and matching end markers)
 *  - {comment}/{c} lines
 *  - `#` source comments (ignored)
 *  - lyric lines with inline `[chord]` brackets
 *  - blank lines as stanza separators
 *
 * The result is a structured document; rendering and transposition live
 * elsewhere so the parse stays key-agnostic.
 */

export type SectionType = "verse" | "chorus" | "bridge" | "none";

export interface ChordProChunk {
  /** chord that sits above the start of `lyric`, as written; null = plain text */
  chord: string | null;
  lyric: string;
}

export type ChordProLine =
  | { kind: "lyrics"; chunks: ChordProChunk[] }
  | { kind: "comment"; text: string }
  | { kind: "blank" };

export interface ChordProSection {
  type: SectionType;
  /** label from e.g. `{start_of_chorus: Refrain}`, or null */
  label: string | null;
  lines: ChordProLine[];
}

export interface ChordProDocument {
  /** lower-cased directive name -> value, e.g. { title: "...", key: "D" } */
  meta: Record<string, string>;
  sections: ChordProSection[];
}

const DIRECTIVE_RE = /^\{\s*([a-zA-Z_]+)\s*(?::\s*([\s\S]*?))?\s*\}$/;

const META_ALIASES: Record<string, string> = {
  t: "title",
  st: "subtitle",
  title: "title",
  subtitle: "subtitle",
  key: "key",
  capo: "capo",
  tempo: "tempo",
  time: "time",
  artist: "artist",
  composer: "composer",
  lyricist: "lyricist",
  ccli: "ccli",
  year: "year",
  album: "album",
};

const SECTION_START: Record<string, SectionType> = {
  soc: "chorus",
  start_of_chorus: "chorus",
  sov: "verse",
  start_of_verse: "verse",
  sob: "bridge",
  start_of_bridge: "bridge",
};

const SECTION_END = new Set([
  "eoc",
  "end_of_chorus",
  "eov",
  "end_of_verse",
  "eob",
  "end_of_bridge",
]);

/** Split a lyric line into chord/text chunks. */
export function parseLyricLine(line: string): ChordProChunk[] {
  const re = /\[([^\]]*)\]/g;
  const chunks: ChordProChunk[] = [];
  let last = 0;
  let pending: string | null = null;
  let m: RegExpExecArray | null;

  while ((m = re.exec(line))) {
    const seg = line.slice(last, m.index);
    if (pending !== null || seg.length > 0) {
      chunks.push({ chord: pending, lyric: seg });
    }
    pending = m[1].trim();
    last = re.lastIndex;
  }

  const tail = line.slice(last);
  if (pending !== null || tail.length > 0 || chunks.length === 0) {
    chunks.push({ chord: pending, lyric: tail });
  }
  return chunks;
}

export function parseChordPro(source: string): ChordProDocument {
  const meta: Record<string, string> = {};
  const sections: ChordProSection[] = [];

  let current: ChordProSection = { type: "none", label: null, lines: [] };
  const pushCurrent = () => {
    if (current.lines.length > 0) sections.push(current);
  };
  const openSection = (type: SectionType, label: string | null) => {
    pushCurrent();
    current = { type, label, lines: [] };
  };

  for (const rawLine of source.replace(/\r\n?/g, "\n").split("\n")) {
    const line = rawLine.trimEnd();
    const trimmed = line.trim();

    if (trimmed.startsWith("#")) continue;

    if (trimmed === "") {
      current.lines.push({ kind: "blank" });
      continue;
    }

    const directive = DIRECTIVE_RE.exec(trimmed);
    if (directive) {
      const name = directive[1].toLowerCase();
      const value = (directive[2] ?? "").trim();

      if (name === "c" || name === "comment") {
        current.lines.push({ kind: "comment", text: value });
        continue;
      }
      if (name in SECTION_START) {
        openSection(SECTION_START[name], value || null);
        continue;
      }
      if (SECTION_END.has(name)) {
        openSection("none", null);
        continue;
      }
      if (name in META_ALIASES) {
        meta[META_ALIASES[name]] = value;
        continue;
      }
      // Unknown directive with a value: keep it in meta under its own name.
      if (value) meta[name] = value;
      continue;
    }

    current.lines.push({ kind: "lyrics", chunks: parseLyricLine(line) });
  }

  pushCurrent();

  // Trim leading/trailing blank lines inside every section.
  for (const section of sections) {
    while (section.lines[0]?.kind === "blank") section.lines.shift();
    while (section.lines.at(-1)?.kind === "blank") section.lines.pop();
  }

  return { meta, sections: sections.filter((s) => s.lines.length > 0) };
}

/** Collect the distinct chord symbols used in a document, in first-seen order. */
export function collectChords(doc: ChordProDocument): string[] {
  const seen = new Set<string>();
  for (const section of doc.sections) {
    for (const line of section.lines) {
      if (line.kind !== "lyrics") continue;
      for (const chunk of line.chunks) {
        if (chunk.chord) seen.add(chunk.chord);
      }
    }
  }
  return [...seen];
}
