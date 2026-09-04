/**
 * Server-side access to the song catalog.
 *
 * Today the source of truth is `data/songs.json`; when the project moves to
 * Supabase, only this module changes — everything else consumes `SongSummary`
 * from here. Do not import this file from a Client Component (it reads the
 * filesystem); it is only referenced by Server Components and route handlers.
 */

import { readFile } from "node:fs/promises";
import path from "node:path";
import { cache } from "react";

import { CATALOG_KEYS, type CatalogKey } from "@/lib/music";
import {
  filterByTitle,
  groupByKey,
  parseCatalog,
} from "./parse";
import type { RawCatalog, SongSummary } from "./types";

const CATALOG_PATH = path.join(process.cwd(), "data", "songs.json");

/** Load and parse the whole catalog. Memoized per request via `React.cache`. */
export const loadCatalog = cache(async (): Promise<SongSummary[]> => {
  const raw = JSON.parse(await readFile(CATALOG_PATH, "utf8")) as RawCatalog;
  return parseCatalog(raw);
});

/** All songs grouped by original key, in `CATALOG_KEYS` order. */
export const getCatalogByKey = cache(
  async (): Promise<Map<CatalogKey, SongSummary[]>> => {
    return groupByKey(await loadCatalog());
  },
);

/** One song by slug, or null if there is no such song. */
export const getSong = cache(
  async (slug: string): Promise<SongSummary | null> => {
    const all = await loadCatalog();
    return all.find((s) => s.slug === slug) ?? null;
  },
);

/** Every slug — for `generateStaticParams`. */
export const getAllSlugs = cache(async (): Promise<string[]> => {
  return (await loadCatalog()).map((s) => s.slug);
});

/** Title search. */
export async function searchSongs(query: string): Promise<SongSummary[]> {
  return filterByTitle(await loadCatalog(), query);
}

export { CATALOG_KEYS };
export type { SongSummary };
