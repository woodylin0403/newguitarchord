/**
 * Data-cache tags for the Supabase reads that feed the statically generated
 * pages. Song pages are ISR (`revalidate = 300`), so these fetches land in
 * Next's data cache; server actions that write the matching table call
 * `updateTag(...)` so the very next render reads fresh rows (read-your-own-
 * writes) instead of a stale cached copy.
 */
export const CACHE_TAG = {
  /** `song_contents` — site-edited ChordPro */
  contents: "song-contents",
  /** `song_scans` — pinned scan crop per song */
  scans: "song-scans",
  /** `song_media` — YouTube reference per song */
  media: "song-media",
  /** `songs` — site-added songs in the catalog */
  songs: "songs",
} as const;

export type CacheTag = (typeof CACHE_TAG)[keyof typeof CACHE_TAG];
