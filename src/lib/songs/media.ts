/**
 * Per-song reference video (YouTube). Editors paste a link; the song page shows
 * a player. Stored in the `song_media` Supabase table, keyed by slug.
 * Server-only (Supabase).
 */

import { cache } from "react";

import { getPublicSupabase } from "@/lib/supabase/public";

export { parseYouTubeId } from "@/lib/youtube";

export interface SongMedia {
  youtubeId: string;
}

/** The reference video for a song, or null. Empty if Supabase is off. */
export const getSongMedia = cache(
  async (slug: string): Promise<SongMedia | null> => {
    const supabase = getPublicSupabase();
    if (!supabase) return null;
    try {
      const { data, error } = await supabase
        .from("song_media")
        .select("youtube_id")
        .eq("slug", slug)
        .maybeSingle();
      if (error || !data?.youtube_id) return null;
      return { youtubeId: data.youtube_id as string };
    } catch {
      return null;
    }
  },
);
