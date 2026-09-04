import { getPublicSupabase } from "@/lib/supabase/public";

export interface SongComment {
  id: string;
  body: string;
  createdAt: string;
  userId: string;
  authorName: string;
  authorAvatar: string | null;
}

/** Visible comments for a song, oldest first, with author profile merged in. */
export async function listComments(slug: string): Promise<SongComment[]> {
  const supabase = getPublicSupabase();
  if (!supabase) return [];

  const { data, error } = await supabase
    .from("comments")
    .select("id, body, created_at, user_id")
    .eq("song_slug", slug)
    .is("deleted_at", null)
    .order("created_at", { ascending: true })
    .limit(500);
  if (error || !data) return [];

  const ids = [...new Set(data.map((c) => c.user_id as string))];
  const profiles = ids.length
    ? (
        await supabase
          .from("profiles")
          .select("id, name, avatar_url")
          .in("id", ids)
      ).data ?? []
    : [];
  const byId = new Map(
    profiles.map((p) => [p.id as string, p as { name: string | null; avatar_url: string | null }]),
  );

  return data.map((c) => ({
    id: c.id as string,
    body: c.body as string,
    createdAt: c.created_at as string,
    userId: c.user_id as string,
    authorName: byId.get(c.user_id as string)?.name ?? "訪客",
    authorAvatar: byId.get(c.user_id as string)?.avatar_url ?? null,
  }));
}
