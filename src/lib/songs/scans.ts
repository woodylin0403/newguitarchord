/**
 * Links a catalog song to the scanned images of the hymnal page it sits on.
 *
 * `data/manifest.json` is keyed by printed page: each entry lists that page's
 * line-crop images, an optional whole-page scan, and every song that appears on
 * it. Until a song has been transcribed to ChordPro, its page scan is the
 * reference shown on the song view.
 *
 * Server-only (reads the filesystem).
 */

import { readFile } from "node:fs/promises";
import path from "node:path";
import { cache } from "react";

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
  /** whole-page scan URL, or null when only line crops exist */
  fullPage: string | null;
  /** line-crop image URLs for the whole page */
  lineCrops: string[];
  /** whether the page's song boundaries were cleanly separated */
  cleanCut: boolean;
  /** other songs printed on the same page (slug + title), this song excluded */
  pageMates: { slug: string; title: string }[];
}

const MANIFEST_PATH = path.join(process.cwd(), "data", "manifest.json");

/** `"C-3"` (manifest song_id) -> `"c-3"` (our slug). */
function songIdToSlug(songId: string): string {
  return songId.toLowerCase();
}

const loadManifest = cache(async (): Promise<RawManifestEntry[]> => {
  return JSON.parse(await readFile(MANIFEST_PATH, "utf8")) as RawManifestEntry[];
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
    return {
      bookPage: entry.book_page,
      fullPage: entry.full_page ? toUrl(entry.full_page) : null,
      lineCrops: entry.images.map(toUrl),
      cleanCut: entry.clean_cut,
      pageMates: entry.candidates
        .filter((c) => songIdToSlug(c.song_id) !== slug)
        .map((c) => ({ slug: songIdToSlug(c.song_id), title: c.title })),
    };
  },
);
