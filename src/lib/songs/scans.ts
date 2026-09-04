/**
 * Links a catalog song to the scanned images of the hymnal page it sits on.
 *
 * `data/manifest.json` is keyed by printed page: each entry lists that page's
 * line-crop images, an optional whole-page scan, and every song on it.
 *
 * A song can also be pinned to ONE specific crop image, so its view shows just
 * that song's scan instead of the whole page. The pin comes from (in order):
 *   1. the `song_scans` Supabase table — set from the editor, or
 *   2. `data/scan-map.json` — a checked-in `{ slug: "P16_L1.png" }` map.
 *
 * Server-only (filesystem + Supabase).
 */

import { readFile } from "node:fs/promises";
import path from "node:path";
import { cache } from "react";

import { getPublicSupabase } from "@/lib/supabase/public";

/** Public path prefix for files in `public/scans/`. */
export const SCAN_URL_BASE = "/scans";

interface RawManifestEntry {
  book_page: number;
  images: string[];
  full_page: string | null;
  candidates: { song_id: string; title: string }[];
  clean_cut: boolean;
}

export interface SongScans {
  bookPage: number;
  /** whole-page scan URL, or null when only line crops / a pinned crop is shown */
  fullPage: string | null;
  /** crop image URLs to show (one, if pinned; otherwise the whole page's) */
  lineCrops: string[];
  /** whether the page's song boundaries were cleanly separated */
  cleanCut: boolean;
  /** other songs printed on the same page (slug + title), this song excluded */
  pageMates: { slug: string; title: string }[];
  /** all of the page's crop filenames, for the editor's pin picker */
  pageCrops: string[];
  /** the crop filename currently pinned to this song, if any */
  pinnedCrop: string | null;
}

const MANIFEST_PATH = path.join(process.cwd(), "data", "manifest.json");
const SCAN_MAP_PATH = path.join(process.cwd(), "data", "scan-map.json");

/** `"C-3"` (manifest song_id) -> `"c-3"` (our slug). */
function songIdToSlug(songId: string): string {
  return songId.toLowerCase();
}

const loadManifest = cache(async (): Promise<RawManifestEntry[]> => {
  return JSON.parse(await readFile(MANIFEST_PATH, "utf8")) as RawManifestEntry[];
});

const loadScanMap = cache(async (): Promise<Record<string, string>> => {
  try {
    return JSON.parse(await readFile(SCAN_MAP_PATH, "utf8")) as Record<
      string,
      string
    >;
  } catch {
    return {};
  }
});

/** Editor-set pins from the `song_scans` table. Empty if Supabase is off. */
const loadScanOverrides = cache(async (): Promise<Record<string, string>> => {
  const supabase = getPublicSupabase();
  if (!supabase) return {};
  try {
    const { data, error } = await supabase
      .from("song_scans")
      .select("slug, crop");
    if (error || !data) return {};
    return Object.fromEntries(
      data.map((r) => [r.slug as string, r.crop as string]),
    );
  } catch {
    return {};
  }
});

/** Scans for the page a song sits on, or null if the manifest doesn't list it. */
export const getSongScans = cache(
  async (slug: string): Promise<SongScans | null> => {
    const manifest = await loadManifest();
    const entry = manifest.find((e) =>
      e.candidates.some((c) => songIdToSlug(c.song_id) === slug),
    );
    if (!entry) return null;

    const toUrl = (name: string) => `${SCAN_URL_BASE}/${name}`;
    const [overrides, map] = await Promise.all([
      loadScanOverrides(),
      loadScanMap(),
    ]);

    const pin = overrides[slug] ?? map[slug] ?? null;
    const pinnedCrop = pin && entry.images.includes(pin) ? pin : null;

    return {
      bookPage: entry.book_page,
      fullPage: pinnedCrop ? null : entry.full_page ? toUrl(entry.full_page) : null,
      lineCrops: pinnedCrop
        ? [toUrl(pinnedCrop)]
        : entry.images.map(toUrl),
      cleanCut: entry.clean_cut,
      pageMates: entry.candidates
        .filter((c) => songIdToSlug(c.song_id) !== slug)
        .map((c) => ({ slug: songIdToSlug(c.song_id), title: c.title })),
      pageCrops: entry.images,
      pinnedCrop,
    };
  },
);
