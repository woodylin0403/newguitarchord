/**
 * Pure parsing of the `data/songs.json` catalog format. Kept free of any Node or
 * React imports so it is trivially unit-testable and reusable on either side.
 */

import { CATALOG_KEYS, type CatalogKey } from "@/lib/music";
import type { RawCatalog, SongSummary } from "./types";

/** Build the URL slug for a song, e.g. (`Dm`, 11) -> `dm-11`. */
export function songSlug(key: CatalogKey, number: number): string {
  return `${key.toLowerCase()}-${number}`;
}

/** Parse one `"n|title|page|time?"` entry. Returns null if it is malformed. */
export function parseCatalogEntry(
  key: CatalogKey,
  entry: string,
): SongSummary | null {
  const parts = entry.split("|");
  if (parts.length < 3) return null;

  const number = Number(parts[0]);
  const title = parts[1]?.trim() ?? "";
  const bookPage = Number(parts[2]);
  const timeSignature = parts[3]?.trim() ? parts[3].trim() : null;

  if (!Number.isInteger(number) || number < 1) return null;
  if (!title) return null;
  if (!Number.isInteger(bookPage) || bookPage < 1) return null;

  return { slug: songSlug(key, number), key, number, title, bookPage, timeSignature };
}

/**
 * Turn the raw JSON object into a flat, ordered list of songs. Key groups are
 * emitted in `CATALOG_KEYS` order; malformed rows are skipped.
 */
export function parseCatalog(raw: RawCatalog): SongSummary[] {
  const songs: SongSummary[] = [];
  for (const key of CATALOG_KEYS) {
    for (const entry of raw[key] ?? []) {
      const parsed = parseCatalogEntry(key, entry);
      if (parsed) songs.push(parsed);
    }
  }
  return songs;
}

/** Group a song list by key, preserving `CATALOG_KEYS` order. */
export function groupByKey(
  songs: SongSummary[],
): Map<CatalogKey, SongSummary[]> {
  const map = new Map<CatalogKey, SongSummary[]>();
  for (const key of CATALOG_KEYS) map.set(key, []);
  for (const song of songs) map.get(song.key)?.push(song);
  return map;
}

/** Case-insensitive substring match on the title. */
export function filterByTitle(
  songs: SongSummary[],
  query: string,
): SongSummary[] {
  const q = query.trim().toLowerCase();
  if (!q) return [];
  return songs.filter((s) => s.title.toLowerCase().includes(q));
}
