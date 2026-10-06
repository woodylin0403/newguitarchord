/**
 * Chord-to-syllable alignment by measuring the image, not by asking the model.
 *
 * Vision models read a chord chart's TEXT reliably but are poor at judging
 * which character sits under which chord. So the model only transcribes
 * (`OcrChart`: chord names + lyric text per line), and this module finds where
 * each chord and each lyric character actually is on the page:
 *
 *   1. binarize (Otsu) and deskew (projection-profile shear search)
 *   2. split into horizontal text bands (header? / chord row / lyric row …)
 *   3. lyric band → one ink box per character (merging split CJK strokes)
 *   4. chord band → x of each chord token (splitting "B7Em" by width)
 *   5. drop each chord on the character under its first letter
 *
 * If the bands don't match the transcription, a line falls back to the
 * model's own position guess (`at`). Pure functions — no DOM, testable.
 */

export interface OcrChordToken {
  chord: string;
  /** model's guess: index into `lyrics` (incl. spaces); fallback only */
  at: number | null;
}

export type SectionType = "verse" | "chorus" | "bridge";

export interface OcrLine {
  chords: OcrChordToken[];
  lyrics: string;
  /** set on the first line of a new section */
  section: SectionType | null;
  label: string | null;
}

export interface OcrChart {
  /** a title row ("Em 4/4 歌名 1") sits above the first line */
  header: boolean;
  title: string;
  key: string;
  time: string;
  lines: OcrLine[];
}

export interface Bitmap {
  width: number;
  height: number;
  /** 1 = ink, row-major */
  ink: Uint8Array;
}

export interface Band {
  top: number;
  bottom: number;
}

export interface Run {
  left: number;
  right: number;
}

// ---------------------------------------------------------------------------
// 1. binarize + deskew

/** RGBA pixels → ink bitmap via Otsu threshold (dark = ink; inverts if needed). */
export function bitmapFromRgba(
  data: Uint8ClampedArray | Uint8Array,
  width: number,
  height: number,
): Bitmap {
  const n = width * height;
  const lum = new Uint8Array(n);
  const hist = new Array<number>(256).fill(0);
  for (let i = 0; i < n; i++) {
    const a = data[i * 4 + 3];
    const v =
      a < 128
        ? 255
        : Math.round(
            (data[i * 4] * 299 + data[i * 4 + 1] * 587 + data[i * 4 + 2] * 114) /
              1000,
          );
    lum[i] = v;
    hist[v]++;
  }

  // Otsu
  let sum = 0;
  for (let t = 0; t < 256; t++) sum += t * hist[t];
  let sumB = 0;
  let wB = 0;
  let best = 0;
  let threshold = 127;
  for (let t = 0; t < 256; t++) {
    wB += hist[t];
    if (wB === 0) continue;
    const wF = n - wB;
    if (wF === 0) break;
    sumB += t * hist[t];
    const mB = sumB / wB;
    const mF = (sum - sumB) / wF;
    const between = wB * wF * (mB - mF) * (mB - mF);
    if (between > best) {
      best = between;
      threshold = t;
    }
  }

  const ink = new Uint8Array(n);
  let count = 0;
  for (let i = 0; i < n; i++) {
    if (lum[i] <= threshold) {
      ink[i] = 1;
      count++;
    }
  }
  // light text on a dark background → flip so text is "ink"
  if (count > n / 2) for (let i = 0; i < n; i++) ink[i] ^= 1;
  return { width, height, ink };
}

/**
 * Straighten a slightly tilted scan. Searches small angles for the vertical
 * shear that makes text rows sharpest (max sum of squared row counts). Shear
 * leaves every x unchanged, so measured x positions stay valid.
 */
export function deskew(bm: Bitmap, maxDeg = 3, stepDeg = 0.2): Bitmap {
  const { width, height, ink } = bm;
  const xs: number[] = [];
  const ys: number[] = [];
  let total = 0;
  for (let i = 0; i < ink.length; i++) if (ink[i]) total++;
  if (total === 0) return bm;
  const stride = Math.max(1, Math.floor(total / 60000));
  let k = 0;
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      if (ink[y * width + x] && k++ % stride === 0) {
        xs.push(x);
        ys.push(y);
      }
    }
  }

  const pad = Math.ceil(width * Math.tan((maxDeg * Math.PI) / 180)) + 1;
  const score = (t: number) => {
    const hist = new Float64Array(height + 2 * pad);
    for (let i = 0; i < xs.length; i++) {
      hist[Math.round(ys[i] - xs[i] * t) + pad]++;
    }
    let s = 0;
    for (let i = 0; i < hist.length; i++) s += hist[i] * hist[i];
    return s;
  };

  let bestT = 0;
  let bestScore = score(0);
  for (let d = -maxDeg; d <= maxDeg + 1e-9; d += stepDeg) {
    if (Math.abs(d) < 1e-9) continue;
    const t = Math.tan((d * Math.PI) / 180);
    const s = score(t);
    // require a clear win so straight images are never sheared by noise
    if (s > bestScore * 1.02) {
      bestScore = s;
      bestT = t;
    }
  }
  if (bestT === 0) return bm;

  const off = bestT > 0 ? Math.ceil(width * bestT) : 0;
  const newH = height + Math.ceil(width * Math.abs(bestT)) + 1;
  const out = new Uint8Array(width * newH);
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      if (!ink[y * width + x]) continue;
      const ny = Math.round(y - x * bestT) + off;
      if (ny >= 0 && ny < newH) out[ny * width + x] = 1;
    }
  }
  return { width, height: newH, ink: out };
}

// ---------------------------------------------------------------------------
// 2. text bands

/** Horizontal text rows, top to bottom (underlines/specks merged or dropped). */
export function findBands(bm: Bitmap): Band[] {
  const { width, height, ink } = bm;
  const minInk = Math.max(2, Math.round(width * 0.002));
  const raw: Band[] = [];
  let start = -1;
  for (let y = 0; y <= height; y++) {
    let c = 0;
    if (y < height) for (let x = 0; x < width; x++) c += ink[y * width + x];
    const on = y < height && c >= minInk;
    if (on && start < 0) start = y;
    if (!on && start >= 0) {
      raw.push({ top: start, bottom: y - 1 });
      start = -1;
    }
  }
  if (raw.length === 0) return [];

  const heights = raw
    .map((b) => b.bottom - b.top + 1)
    .filter((h) => h >= 6)
    .sort((a, b) => a - b);
  const H = heights.length ? heights[Math.floor(heights.length / 2)] : 10;

  // merge thin pieces (underlines, dots, accents) into the band they touch
  const merged: Band[] = [];
  for (const b of raw) {
    const prev = merged[merged.length - 1];
    if (prev) {
      const gap = b.top - prev.bottom - 1;
      const thin =
        b.bottom - b.top + 1 < 0.4 * H || prev.bottom - prev.top + 1 < 0.4 * H;
      if (gap <= Math.max(2, 0.2 * H) && thin) {
        prev.bottom = b.bottom;
        continue;
      }
    }
    merged.push({ ...b });
  }
  return merged.filter((b) => b.bottom - b.top + 1 >= 0.3 * H);
}

/** Runs of ink columns inside a band (stray single pixels ignored). */
export function columnRuns(bm: Bitmap, band: Band): Run[] {
  const { width, ink } = bm;
  const runs: Run[] = [];
  let start = -1;
  let mass = 0;
  for (let x = 0; x <= width; x++) {
    let c = 0;
    if (x < width) {
      for (let y = band.top; y <= band.bottom; y++) c += ink[y * width + x];
    }
    if (c > 0) {
      if (start < 0) {
        start = x;
        mass = 0;
      }
      mass += c;
    } else if (start >= 0) {
      if (mass >= 3) runs.push({ left: start, right: x - 1 });
      start = -1;
    }
  }
  return runs;
}

// ---------------------------------------------------------------------------
// 3. lyric glyphs

/**
 * One box per lyric character. CJK characters often split into several ink
 * runs (心's dot, 唱's 口 …) and blurry neighbours can touch. Blobs clearly
 * several characters wide are split first; then the runs are partitioned into
 * exactly `count` boxes, choosing the grouping whose box widths are closest
 * to one character (dynamic programming — greedy merging tends to glue a
 * left-hand stroke onto the previous character). Null when no sensible
 * grouping exists, e.g. the transcription has a different character count.
 */
export function lyricGlyphs(
  runs: Run[],
  count: number,
  bandHeight: number,
): Run[] | null {
  if (count === 0) return [];
  const width = (r: Run) => r.right - r.left + 1;

  const typical = runs
    .map(width)
    .filter((w) => w >= 0.6 * bandHeight && w <= 1.15 * bandHeight)
    .sort((a, b) => a - b);
  const charW = typical.length
    ? typical[Math.floor(typical.length / 2)]
    : 0.9 * bandHeight;

  const pieces: Run[] = [];
  for (const r of runs) {
    const w = width(r);
    const n = w > 1.6 * charW ? Math.round(w / charW) : 1;
    for (let i = 0; i < n; i++) {
      pieces.push({
        left: Math.round(r.left + (i * w) / n),
        right: Math.round(r.left + ((i + 1) * w) / n) - 1,
      });
    }
  }
  const m = pieces.length;
  if (m < count) return null;

  // cost of making pieces[i..j] one character box
  const cost = (i: number, j: number) => {
    const w = pieces[j].right - pieces[i].left + 1;
    if (w > 1.45 * charW) return Infinity;
    for (let k = i; k < j; k++) {
      if (pieces[k + 1].left - pieces[k].right - 1 > 0.5 * charW) return Infinity;
    }
    const d = (w - charW) / charW;
    return d * d;
  };

  // best[g][j]: min cost covering pieces[0..j) with g boxes
  const best = Array.from({ length: count + 1 }, () =>
    new Array<number>(m + 1).fill(Infinity),
  );
  const from = Array.from({ length: count + 1 }, () =>
    new Array<number>(m + 1).fill(-1),
  );
  best[0][0] = 0;
  for (let g = 1; g <= count; g++) {
    for (let j = g; j <= m - (count - g); j++) {
      for (let i = g - 1; i < j; i++) {
        if (best[g - 1][i] === Infinity) continue;
        const c = best[g - 1][i] + cost(i, j - 1);
        if (c < best[g][j]) {
          best[g][j] = c;
          from[g][j] = i;
        }
      }
    }
  }
  if (best[count][m] === Infinity) return null;

  const glyphs: Run[] = [];
  for (let g = count, j = m; g > 0; g--) {
    const i = from[g][j];
    glyphs.unshift({ left: pieces[i].left, right: pieces[j - 1].right });
    j = i;
  }
  return glyphs;
}

// ---------------------------------------------------------------------------
// 4. chord anchors

/**
 * x of each chord's first letter. Letter runs are grouped into "words" by
 * gaps; a word may hold several chords printed back to back ("B7Em"), which
 * are split by character count.
 */
export function chordAnchors(
  runs: Run[],
  tokens: string[],
  bandHeight: number,
): number[] | null {
  if (tokens.length === 0) return [];
  if (runs.length === 0) return null;

  const words: { left: number; right: number; runs: Run[] }[] = [];
  for (const r of runs) {
    const w = words[words.length - 1];
    if (w && r.left - w.right - 1 <= 0.6 * bandHeight) {
      w.right = r.right;
      w.runs.push(r);
    } else {
      words.push({ left: r.left, right: r.right, runs: [r] });
    }
  }
  if (words.length > tokens.length) return null;

  const len = (t: string) => Math.max(1, t.length);
  const totalChars = tokens.reduce((s, t) => s + len(t), 0);
  const totalWidth = words.reduce((s, w) => s + (w.right - w.left + 1), 0);
  const letterW = totalWidth / totalChars;

  const anchors: number[] = [];
  let ti = 0;
  for (let wi = 0; wi < words.length; wi++) {
    const w = words[wi];
    const width = w.right - w.left + 1;
    const wordsLeft = words.length - wi - 1;
    const mine: string[] = [tokens[ti++]];
    let acc = len(mine[0]) * letterW;
    while (
      ti < tokens.length &&
      tokens.length - ti > wordsLeft &&
      (wi === words.length - 1 ||
        acc + len(tokens[ti]) * letterW <= width + 0.5 * letterW)
    ) {
      acc += len(tokens[ti]) * letterW;
      mine.push(tokens[ti++]);
    }
    const chars = mine.reduce((s, t) => s + len(t), 0);
    let before = 0;
    for (const t of mine) {
      const left =
        w.runs.length === chars
          ? w.runs[before].left
          : w.left + (before / chars) * width;
      anchors.push(left + 0.5 * letterW);
      before += len(t);
    }
  }
  return ti === tokens.length ? anchors : null;
}

// ---------------------------------------------------------------------------
// 5. place chords into the lyric text

/** Insert `[chord]` markers into `lyrics` at the measured positions. */
export function placeChords(
  lyrics: string,
  glyphs: Run[],
  anchors: number[],
  chords: string[],
  glyphW: number,
): string {
  const pos: number[] = [];
  for (let i = 0; i < lyrics.length; i++) if (!/\s/.test(lyrics[i])) pos.push(i);

  const at = new Map<number, string[]>();
  const put = (p: number, c: string) => {
    const list = at.get(p) ?? [];
    list.push(c);
    at.set(p, list);
  };

  anchors.forEach((x, ci) => {
    const chord = chords[ci];
    const k = glyphs.findIndex((g) => x <= g.right);
    if (k < 0) {
      put(lyrics.length, chord); // past the last character
    } else if (k === 0 || x >= glyphs[k].left - 0.2 * glyphW) {
      put(pos[k], chord);
    } else if (pos[k] - pos[k - 1] > 1) {
      put(pos[k - 1] + 1, chord); // chord sits on a word gap → on the space
    } else {
      put(pos[k], chord);
    }
  });

  let out = "";
  for (let i = 0; i <= lyrics.length; i++) {
    for (const c of at.get(i) ?? []) out += `[${c}]`;
    if (i < lyrics.length) out += lyrics[i];
  }
  return out;
}

/** Line without measurements: use the model's own `at` guesses. */
export function fallbackLine(line: OcrLine): string {
  const { lyrics, chords } = line;
  if (!lyrics.trim()) return chords.map((c) => `[${c.chord}]`).join(" ");
  const n = chords.length;
  const placed = chords.map((c, i) => ({
    chord: c.chord,
    at: Math.max(
      0,
      Math.min(
        lyrics.length,
        c.at ?? Math.round((i * lyrics.length) / Math.max(1, n)),
      ),
    ),
  }));
  const at = new Map<number, string[]>();
  for (const p of placed) at.set(p.at, [...(at.get(p.at) ?? []), p.chord]);
  let out = "";
  for (let i = 0; i <= lyrics.length; i++) {
    for (const c of at.get(i) ?? []) out += `[${c}]`;
    if (i < lyrics.length) out += lyrics[i];
  }
  return out;
}

// ---------------------------------------------------------------------------
// putting it together

export interface AlignResult {
  chordpro: string;
  /** lines whose chord positions were measured from the image */
  measured: number;
  /** lines that had chords over lyrics (and so needed alignment) */
  needed: number;
}

/** Measure the image and turn the transcription into ChordPro. */
export function alignChart(input: Bitmap, chart: OcrChart): AlignResult {
  const bm = deskew(input);
  const bands = findBands(bm);

  type Slot = { line: number; kind: "chords" | "lyrics" };
  const slots: Slot[] = [];
  chart.lines.forEach((l, i) => {
    if (l.chords.length) slots.push({ line: i, kind: "chords" });
    if (l.lyrics.trim()) slots.push({ line: i, kind: "lyrics" });
  });

  let skip = -1; // index offset into bands, -1 = no usable mapping
  if (bands.length === slots.length + (chart.header ? 1 : 0)) {
    skip = chart.header ? 1 : 0;
  } else if (bands.length === slots.length + 1) {
    skip = 1; // model missed the title row
  } else if (bands.length === slots.length) {
    skip = 0; // model claimed a title row that isn't there
  }

  const bandOf = new Map<string, Band>();
  if (skip >= 0) {
    slots.forEach((s, i) => bandOf.set(`${s.line}:${s.kind}`, bands[i + skip]));
  }

  let measured = 0;
  let needed = 0;
  const bodies = chart.lines.map((line, i) => {
    const hasLyrics = Boolean(line.lyrics.trim());
    if (!line.chords.length) return line.lyrics;
    if (!hasLyrics) return fallbackLine(line);
    needed++;

    const cb = bandOf.get(`${i}:chords`);
    const lb = bandOf.get(`${i}:lyrics`);
    if (!cb || !lb) return fallbackLine(line);

    const lh = lb.bottom - lb.top + 1;
    const ch = cb.bottom - cb.top + 1;
    const glyphCount = [...line.lyrics].filter((c) => !/\s/.test(c)).length;
    const glyphs = lyricGlyphs(columnRuns(bm, lb), glyphCount, lh);
    const tokens = line.chords.map((c) => c.chord);
    const anchors = chordAnchors(columnRuns(bm, cb), tokens, ch);
    if (!glyphs || !anchors) return fallbackLine(line);

    measured++;
    const glyphW =
      glyphs.reduce((s, g) => s + (g.right - g.left + 1), 0) / glyphs.length;
    return placeChords(line.lyrics, glyphs, anchors, tokens, glyphW);
  });

  return { chordpro: assemble(chart, bodies), measured, needed };
}

/** The whole chart using only the model's position guesses (no image). */
export function fallbackChart(chart: OcrChart): string {
  return assemble(
    chart,
    chart.lines.map((l) => (l.chords.length ? fallbackLine(l) : l.lyrics)),
  );
}

const SECTION_END: Record<SectionType, string> = {
  verse: "{end_of_verse}",
  chorus: "{end_of_chorus}",
  bridge: "{end_of_bridge}",
};

/** Header directives + lines, with section start/end markers. */
export function assemble(chart: OcrChart, bodies: string[]): string {
  const out: string[] = [];
  if (chart.title) out.push(`{title: ${chart.title}}`);
  if (chart.key) out.push(`{key: ${chart.key}}`);
  if (chart.time) out.push(`{time: ${chart.time}}`);
  if (out.length) out.push("");

  let open: SectionType | null = null;
  chart.lines.forEach((line, i) => {
    if (line.section) {
      if (open) out.push(SECTION_END[open], "");
      out.push(
        line.label
          ? `{start_of_${line.section}: ${line.label}}`
          : `{start_of_${line.section}}`,
      );
      open = line.section;
    }
    out.push(bodies[i]);
  });
  if (open) out.push(SECTION_END[open]);
  return out.join("\n").replace(/\s+$/, "") + "\n";
}

/** Coerce the model's JSON into an `OcrChart`, or null if it isn't one. */
export function parseOcrChart(raw: unknown): OcrChart | null {
  if (!raw || typeof raw !== "object") return null;
  const r = raw as Record<string, unknown>;
  if (!Array.isArray(r.lines)) return null;
  const str = (v: unknown) => (typeof v === "string" ? v.trim() : "");
  const sections = new Set(["verse", "chorus", "bridge"]);

  const lines: OcrLine[] = r.lines.flatMap((l): OcrLine[] => {
    if (!l || typeof l !== "object") return [];
    const o = l as Record<string, unknown>;
    const chords = Array.isArray(o.chords)
      ? o.chords.flatMap((c): OcrChordToken[] => {
          if (typeof c === "string" && c.trim()) {
            return [{ chord: c.trim(), at: null }];
          }
          if (c && typeof c === "object") {
            const co = c as Record<string, unknown>;
            const chord = str(co.chord);
            if (!chord) return [];
            const at =
              typeof co.at === "number" && Number.isFinite(co.at)
                ? Math.round(co.at)
                : null;
            return [{ chord, at }];
          }
          return [];
        })
      : [];
    const lyrics = typeof o.lyrics === "string" ? o.lyrics.replace(/\s+$/, "") : "";
    if (!chords.length && !lyrics.trim()) return [];
    const section =
      typeof o.section === "string" && sections.has(o.section)
        ? (o.section as SectionType)
        : null;
    return [{ chords, lyrics, section, label: str(o.label) || null }];
  });
  if (!lines.length) return null;

  return {
    header: r.header === true,
    title: str(r.title),
    key: str(r.key),
    time: str(r.time),
    lines,
  };
}
