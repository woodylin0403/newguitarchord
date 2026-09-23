/**
 * Edit history for a song's ChordPro content. `song_revisions` rows are
 * written by a database trigger whenever `song_contents` changes — this app
 * never inserts into that table directly.
 *
 * Server-only. Reads through the caller's own session client (not
 * service-role) since this is only ever shown on the editor-gated edit page.
 */

import { getServerSupabase } from "@/lib/supabase/server";

export interface SongRevision {
  id: string;
  chordpro: string;
  editedAt: string;
  editedBy: string | null;
  editorName: string;
  editorAvatar: string | null;
}

/** This song's revisions, newest first. Empty if Supabase is off or unreadable. */
export async function listRevisions(slug: string): Promise<SongRevision[]> {
  const supabase = await getServerSupabase();
  if (!supabase) return [];

  const { data, error } = await supabase
    .from("song_revisions")
    .select("id, chordpro, edited_at, edited_by")
    .eq("slug", slug)
    .order("edited_at", { ascending: false })
    .limit(200);
  if (error || !data) return [];

  const ids = [...new Set(data.map((r) => r.edited_by as string | null).filter(Boolean))] as string[];
  const profiles = ids.length
    ? (
        await supabase.from("profiles").select("id, name, avatar_url").in("id", ids)
      ).data ?? []
    : [];
  const byId = new Map(
    profiles.map((p) => [
      p.id as string,
      p as { name: string | null; avatar_url: string | null },
    ]),
  );

  return data.map((r) => {
    const editedBy = r.edited_by as string | null;
    const profile = editedBy ? byId.get(editedBy) : undefined;
    return {
      id: r.id as string,
      chordpro: r.chordpro as string,
      editedAt: r.edited_at as string,
      editedBy,
      editorName: profile?.name ?? "（不明使用者）",
      editorAvatar: profile?.avatar_url ?? null,
    };
  });
}
