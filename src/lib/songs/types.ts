import type { CatalogKey } from "@/lib/music";

/**
 * One row of the printed hymnal's index. This is the lightweight record used by
 * list, category and search views. The actual ChordPro content for a song is
 * loaded separately once it has been transcribed.
 */
export interface SongSummary {
  /** URL slug, `${key}-${number}` lower-cased, e.g. `c-3`, `dm-11` */
  slug: string;
  /** original key group (原調) this song is filed under */
  key: CatalogKey;
  /** running number *within its key group*, starting at 1 */
  number: number;
  /** Chinese song title */
  title: string;
  /** page number in the physical hymnal */
  bookPage: number;
  /** time signature such as `3/4`, `6/8`; null when the index omits it */
  timeSignature: string | null;
}

/** Shape of `data/songs.json`: key group -> array of `"n|title|page|time?"`. */
export type RawCatalog = Record<string, string[]>;
