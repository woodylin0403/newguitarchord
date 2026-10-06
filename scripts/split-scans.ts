/**
 * Split scan crops that hold more than one song into one image per song.
 *
 * Some crops in `public/scans/` were cut too coarsely: a tall strip with 2–4
 * songs stacked, or a whole two-column page. Songs on the printed page are
 * separated by a large blank band (much taller than the gap between lines),
 * and the two columns by a blank gutter — this finds both and cuts there.
 *
 * The left edge of many scans carries a dithered grey shadow that puts "ink"
 * on every row; text is told apart from it by being dark AND clearly darker
 * than its surroundings (a local-contrast mask), so the shadow drops out.
 *
 *   npx tsx scripts/split-scans.ts           # dry run — print the plan
 *   npx tsx scripts/split-scans.ts --write   # write pieces + update manifest
 *
 * Pieces are saved next to the original as P37_L1a.png, P37_L1b.png, … (top
 * to bottom; left column before right). In `data/manifest.json` the original
 * is replaced by its pieces in `images` and moved to `retired_images`, so any
 * existing pin to it keeps working until someone re-pins to the exact piece.
 * Only pages with `clean_cut: false` are examined. Safe to re-run.
 */

import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";

import sharp from "sharp";

interface ManifestEntry {
  book_page: number;
  images: string[];
  full_page: string | null;
  candidates: { song_id: string; title: string }[];
  clean_cut: boolean;
  retired_images?: string[];
}

interface Rect {
  left: number;
  top: number;
  width: number;
  height: number;
}

const SCANS = path.join(process.cwd(), "public", "scans");
const MANIFEST = path.join(process.cwd(), "data", "manifest.json");
const WRITE = process.argv.includes("--write");

// All scans share one resolution (~2180px per printed page), so fixed pixel
// thresholds beat ratios — a dense page-edge shadow merges a song's lines
// into one tall band and throws line-height/line-gap estimates off.
// Measured over the 193 single-song crops: blank gaps INSIDE a song are
// ≤45px; gaps BETWEEN songs are ≥81px.
const SONG_GAP = 65;
/** a chord row + a lyric row; shadow slivers and page numbers are <50px */
const MIN_SONG_HEIGHT = 100;

/** Text pixels: dark, and darker than their 31×31 neighbourhood. */
function textMask(gray: Uint8Array, w: number, h: number): Uint8Array {
  const sat = new Float64Array((w + 1) * (h + 1));
  for (let y = 0; y < h; y++) {
    let row = 0;
    for (let x = 0; x < w; x++) {
      row += gray[y * w + x];
      sat[(y + 1) * (w + 1) + x + 1] = sat[y * (w + 1) + x + 1] + row;
    }
  }
  const mean = (x: number, y: number, r: number) => {
    const x0 = Math.max(0, x - r);
    const y0 = Math.max(0, y - r);
    const x1 = Math.min(w, x + r + 1);
    const y1 = Math.min(h, y + r + 1);
    const s =
      sat[y1 * (w + 1) + x1] -
      sat[y0 * (w + 1) + x1] -
      sat[y1 * (w + 1) + x0] +
      sat[y0 * (w + 1) + x0];
    return s / ((x1 - x0) * (y1 - y0));
  };
  const mask = new Uint8Array(w * h);
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      if (gray[y * w + x] >= 160) continue;
      const near = mean(x, y, 1);
      if (near < 140 && near < mean(x, y, 15) - 35) mask[y * w + x] = 1;
    }
  }
  return mask;
}

interface Region {
  x0: number;
  x1: number;
  y0: number;
  y1: number;
}

type Band = [number, number];

/** Text rows (runs of rows with ink) inside a region. */
function bandsIn(mask: Uint8Array, w: number, r: Region): Band[] {
  const bands: Band[] = [];
  let s = -1;
  for (let y = r.y0; y <= r.y1 + 1; y++) {
    let ink = 0;
    if (y <= r.y1) for (let x = r.x0; x <= r.x1; x++) ink += mask[y * w + x];
    const on = y <= r.y1 && ink >= 3;
    if (on && s < 0) s = y;
    if (!on && s >= 0) {
      if (y - s >= 6) bands.push([s, y - 1]);
      s = -1;
    }
  }
  return bands;
}

const median = (xs: number[], fallback: number) => {
  const v = [...xs].sort((a, b) => a - b);
  return v.length ? v[Math.floor(v.length / 2)] : fallback;
};

/** Group text rows wherever the blank between them is a song break. */
function groupBands(bands: Band[]): Band[][] {
  if (!bands.length) return [];
  const groups: Band[][] = [[bands[0]]];
  for (let i = 1; i < bands.length; i++) {
    if (bands[i][0] - bands[i - 1][1] - 1 >= SONG_GAP) groups.push([]);
    groups[groups.length - 1].push(bands[i]);
  }
  return groups;
}

/**
 * The blank band between two printed columns, as an [start, end] x-range, or
 * null. It is rarely perfectly clean — a column's first chord can poke into
 * it — so look for the widest stretch whose smoothed ink is far below a
 * typical text column.
 */
function findGutter(
  mask: Uint8Array,
  w: number,
  r: Region,
): [number, number] | null {
  if (w < 1200 || r.y1 - r.y0 < 200) return null;
  const col = new Array<number>(w).fill(0);
  for (let y = r.y0; y <= r.y1; y++) {
    for (let x = 0; x < w; x++) col[x] += mask[y * w + x];
  }

  const lo = Math.floor(w * 0.3);
  const hi = Math.ceil(w * 0.7);
  const rad = 12;
  const smooth = (x: number) => {
    let s = 0;
    for (let i = x - rad; i <= x + rad; i++) s += col[i];
    return s / (2 * rad + 1);
  };
  const limit = 0.2 * median(col.slice(lo, hi), 0);

  let best: [number, number] | null = null;
  let start = -1;
  for (let x = lo; x <= hi; x++) {
    const blank = x < hi && smooth(x) < limit;
    if (blank && start < 0) start = x;
    if (!blank && start >= 0) {
      if (!best || x - start > best[1] - best[0]) best = [start, x - 1];
      start = -1;
    }
  }
  return best && best[1] - best[0] >= 20 ? best : null;
}

/**
 * Song rectangles in a crop: first cut at blank rows spanning the full width
 * (a song printed across both columns), then split each block into columns
 * if it has a gutter, then each column into songs.
 */
async function plan(file: string): Promise<Rect[]> {
  const { data, info } = await sharp(path.join(SCANS, file))
    .grayscale()
    .raw()
    .toBuffer({ resolveWithObject: true });
  const { width: w, height: h } = info;
  const mask = textMask(new Uint8Array(data), w, h);
  const pad = 16;

  const rects: Rect[] = [];
  const page = { x0: 0, x1: w - 1, y0: 0, y1: h - 1 };
  for (const block of groupBands(bandsIn(mask, w, page))) {
    const y0 = block[0][0];
    const y1 = block[block.length - 1][1];
    // Columns overlap across the gutter so a chord poking into it isn't cut.
    const gutter = findGutter(mask, w, { x0: 0, x1: w - 1, y0, y1 });
    const columns: [number, number][] = gutter
      ? [
          [0, gutter[1]],
          [gutter[0], w - 1],
        ]
      : [[0, w - 1]];

    for (const [x0, x1] of columns) {
      for (const g of groupBands(bandsIn(mask, w, { x0, x1, y0, y1 }))) {
        const top = g[0][0];
        const bottom = g[g.length - 1][1];
        // A song is at least a chord row + a lyric row (~100px on these
        // scans); shadow slivers and lone page numbers are well under that.
        if (bottom - top + 1 < MIN_SONG_HEIGHT) continue;
        // …and its right half shows separate text lines. (The left half can
        // be one merged band under a dense page-edge shadow; the shadow's own
        // edge along the top of a page is one band all the way across.)
        const rightHalf = { x0: Math.round((x0 + x1) / 2), x1, y0: top, y1: bottom };
        if (bandsIn(mask, w, rightHalf).length < 2) continue;
        const t = Math.max(0, top - pad);
        const b = Math.min(h - 1, bottom + pad);
        rects.push({ left: x0, top: t, width: x1 - x0 + 1, height: b - t + 1 });
      }
    }
  }
  return rects;
}

async function main() {
  const manifest = JSON.parse(await readFile(MANIFEST, "utf8")) as ManifestEntry[];
  let changed = 0;

  for (const entry of manifest) {
    if (entry.clean_cut) continue;
    const next: string[] = [];
    for (const img of entry.images) {
      const pieces = await plan(img);
      if (pieces.length < 2) {
        next.push(img);
        continue;
      }
      const base = img.replace(/\.png$/, "");
      const names = pieces.map((_, i) => `${base}${String.fromCharCode(97 + i)}.png`);
      console.log(
        `p${entry.book_page} ${img} → ${pieces
          .map((p, i) => `${names[i]}[x${p.left} y${p.top} ${p.width}×${p.height}]`)
          .join(" ")}`,
      );
      if (WRITE) {
        for (let i = 0; i < pieces.length; i++) {
          await sharp(path.join(SCANS, img))
            .extract(pieces[i])
            .png()
            .toFile(path.join(SCANS, names[i]));
        }
      }
      next.push(...names);
      entry.retired_images = [...new Set([...(entry.retired_images ?? []), img])];
      changed++;
    }
    entry.images = next;
  }

  if (WRITE && changed) {
    await writeFile(MANIFEST, JSON.stringify(manifest, null, 2) + "\n");
  }
  console.log(
    `\n${changed} crop(s) ${WRITE ? "split, manifest updated" : "would be split (dry run — add --write)"}`,
  );
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
