/**
 * Server-side access to the song catalog.
 *
 * The catalog is `data/songs.json` (the printed hymnal, 328 songs) merged with
 * any songs added on the site (the Supabase `songs` table). Everything else
 * consumes `SongSummary` from here. Do not import this file from a Client
 * Component — it reads the filesystem and talks to Supabase.
 */

import { readFile } from "node:fs/promises";
import path from "node:path";
import { cache } from "react";

import { CATALOG_KEYS, isCatalogKey, type CatalogKey } from "@/lib/music";
import { getPublicSupabase } from "@/lib/supabase/public";
import { filterByTitle, groupByKey, parseCatalog } from "./parse";
import type { RawCatalog, SongSummary } from "./types";

const CATALOG_PATH = path.join(process.cwd(), "data", "songs.json");

/** Songs added on the site, from the `songs` table. Empty if Supabase is off. */
const loadCustomSongs = cache(async (): Promise<SongSummary[]> => {
  const supabase = getPublicSupabase();
  if (!supabase) return [];
  try {
    const { data, error } = await supabase
      .from("songs")
      .select("slug, title, music_key, number, time_signature");
    if (error || !data) return [];
    return data
      .filter((r) => isCatalogKey(r.music_key as string))
      .map((r) => ({
        slug: r.slug as string,
        key: r.music_key as CatalogKey,
        number: r.number as number,
        title: r.title as string,
        bookPage: null,
        timeSignature: (r.time_signature as string) || null,
        source: "custom" as const,
      }));
  } catch {
    return [];
  }
});

/** The whole catalog (hymnal + site-added), memoized per request. */
export const loadCatalog = cache(async (): Promise<SongSummary[]> => {
  const raw = JSON.parse(await readFile(CATALOG_PATH, "utf8")) as RawCatalog;
  const [hymnal, custom] = [parseCatalog(raw), await loadCustomSongs()];
  const seen = new Set(hymnal.map((s) => s.slug));
  return [...hymnal, ...custom.filter((s) => !seen.has(s.slug))];
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

/** The next free slug in a key group, e.g. after c-61 → `c-62`. */
export async function nextSlugForKey(
  key: CatalogKey,
): Promise<{ slug: string; number: number }> {
  const all = await loadCatalog();
  const max = all
    .filter((s) => s.key === key)
    .reduce((m, s) => Math.max(m, s.number), 0);
  const number = max + 1;
  return { slug: `${key.toLowerCase()}-${number}`, number };
}

/** Title search. */
export async function searchSongs(query: string): Promise<SongSummary[]> {
  return filterByTitle(await loadCatalog(), query);
}

export { CATALOG_KEYS };
export type { SongSummary };
