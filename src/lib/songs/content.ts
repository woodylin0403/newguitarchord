/**
 * A song's ChordPro source, with Supabase overrides layered on top of the
 * seed files in `data/songs/<slug>.chordpro`:
 *
 *   1. if `song_contents` has a row for the slug (i.e. it was edited on the
 *      site), that text wins;
 *   2. otherwise the checked-in `.chordpro` file is used;
 *   3. otherwise null (not transcribed yet) — callers show the page scan.
 *
 * Server-only (filesystem + Supabase).
 */

import { readdir, readFile } from "node:fs/promises";
import path from "node:path";
import { cache } from "react";

import { parseChordPro, type ChordProDocument } from "@/lib/music";
import { getPublicSupabase } from "@/lib/supabase/public";

const CONTENT_DIR = path.join(process.cwd(), "data", "songs");
const SLUG_RE = /^[a-z]+-\d+$/;

/** All site-edited ChordPro texts, keyed by slug. Empty when Supabase is off. */
const loadOverrides = cache(async (): Promise<Map<string, string>> => {
  const supabase = getPublicSupabase();
  if (!supabase) return new Map();
  try {
    const { data, error } = await supabase
      .from("song_contents")
      .select("slug, chordpro");
    if (error || !data) return new Map();
    return new Map(data.map((row) => [row.slug as string, row.chordpro as string]));
  } catch {
    return new Map();
  }
});

async function readSeedFile(slug: string): Promise<string | null> {
  try {
    return await readFile(path.join(CONTENT_DIR, `${slug}.chordpro`), "utf8");
  } catch {
    return null;
  }
}

/** Raw ChordPro text for a song, or null when it hasn't been transcribed. */
export const getSongSource = cache(
  async (slug: string): Promise<string | null> => {
    if (!SLUG_RE.test(slug)) return null; // guard against path traversal
    const overrides = await loadOverrides();
    const override = overrides.get(slug);
    if (override !== undefined) return override;
    return readSeedFile(slug);
  },
);

/** Whether the site currently has a DB override for this song (vs. seed file). */
export async function hasContentOverride(slug: string): Promise<boolean> {
  return (await loadOverrides()).has(slug);
}

/** The seed file's text (ignores any DB override). Null if no seed file. */
export function getSeedSource(slug: string): Promise<string | null> {
  if (!SLUG_RE.test(slug)) return Promise.resolve(null);
  return readSeedFile(slug);
}

/** Parsed ChordPro document for a song, or null when not transcribed. */
export const getSongDocument = cache(
  async (slug: string): Promise<ChordProDocument | null> => {
    const source = await getSongSource(slug);
    return source === null ? null : parseChordPro(source);
  },
);

/** Slugs that have a chart — seed files plus site edits. */
export const getTranscribedSlugs = cache(async (): Promise<Set<string>> => {
  const slugs = new Set<string>();
  try {
    const files = await readdir(CONTENT_DIR);
    for (const f of files) {
      if (f.endsWith(".chordpro") && /^[a-z]+-\d+\.chordpro$/.test(f)) {
        slugs.add(f.replace(/\.chordpro$/, ""));
      }
    }
  } catch {
    /* ignore */
  }
  for (const slug of (await loadOverrides()).keys()) slugs.add(slug);
  return slugs;
});
