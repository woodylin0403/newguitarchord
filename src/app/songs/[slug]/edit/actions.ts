"use server";

import { revalidatePath } from "next/cache";

import { parseChordPro } from "@/lib/music";
import { parseYouTubeId } from "@/lib/youtube";
import { getAdminSupabase } from "@/lib/supabase/admin";
import { requireAdmin, requireEditor } from "@/lib/supabase/authz";

const SLUG_RE = /^[a-z]+-\d+$/;

export interface EditResult {
  ok: boolean;
  error?: string;
}

function revalidateSong(slug: string, songKey?: string) {
  revalidatePath(`/songs/${slug}`);
  revalidatePath(`/songs/${slug}/play`);
  revalidatePath("/");
  if (songKey) revalidatePath(`/keys/${songKey.toLowerCase()}`);
}

/** Save (upsert) a song's ChordPro content. Editor/admin — enforced by RLS. */
export async function saveSongContent(
  slug: string,
  chordpro: string,
  songKey?: string,
): Promise<EditResult> {
  if (!SLUG_RE.test(slug)) return { ok: false, error: "無效的歌曲代號。" };

  const { user, supabase, error } = await requireEditor();
  if (error) return { ok: false, error };

  const text = chordpro.replace(/\r\n?/g, "\n").trim();
  if (!text) return { ok: false, error: "內容不能是空的。" };
  if (text.length > 20000) return { ok: false, error: "內容太長。" };

  // Must parse into something with at least one line of content.
  const doc = parseChordPro(text);
  if (doc.sections.length === 0) {
    return { ok: false, error: "解析後沒有任何歌詞內容，請檢查格式。" };
  }

  const { error: dbError } = await supabase!.from("song_contents").upsert(
    {
      slug,
      chordpro: text + "\n",
      updated_at: new Date().toISOString(),
      updated_by: user!.id,
    },
    { onConflict: "slug" },
  );
  if (dbError) return { ok: false, error: dbErrorMessage("儲存", dbError) };

  revalidateSong(slug, songKey);
  return { ok: true };
}

/** Remove the site override so the song falls back to its seed .chordpro file. */
export async function revertSongContent(
  slug: string,
  songKey?: string,
): Promise<EditResult> {
  if (!SLUG_RE.test(slug)) return { ok: false, error: "無效的歌曲代號。" };

  const { supabase, error } = await requireEditor();
  if (error) return { ok: false, error };

  const { error: dbError } = await supabase!
    .from("song_contents")
    .delete()
    .eq("slug", slug);
  if (dbError) return { ok: false, error: dbErrorMessage("還原", dbError) };

  revalidateSong(slug, songKey);
  return { ok: true };
}

/**
 * Restore `song_contents` to a past revision's text. Admin only. The database
 * trigger records this as a new `song_revisions` row on its own — do not
 * insert into that table here.
 */
export async function restoreRevision(
  slug: string,
  revisionId: string,
  songKey?: string,
): Promise<EditResult> {
  if (!SLUG_RE.test(slug)) return { ok: false, error: "無效的歌曲代號。" };

  const { user, supabase, error } = await requireAdmin();
  if (error) return { ok: false, error };

  const { data: revision, error: readError } = await supabase!
    .from("song_revisions")
    .select("chordpro, slug")
    .eq("id", revisionId)
    .maybeSingle();
  if (readError || !revision || revision.slug !== slug) {
    return { ok: false, error: "找不到這個版本。" };
  }

  const { error: dbError } = await supabase!.from("song_contents").upsert(
    {
      slug,
      chordpro: revision.chordpro as string,
      updated_at: new Date().toISOString(),
      updated_by: user!.id,
    },
    { onConflict: "slug" },
  );
  if (dbError) return { ok: false, error: dbErrorMessage("還原", dbError) };

  revalidateSong(slug, songKey);
  return { ok: true };
}

/**
 * Pin this song to one crop image from its page (or `null` to unpin and go
 * back to the whole-page scan). Editor/admin.
 */
export async function setSongScan(
  slug: string,
  crop: string | null,
): Promise<EditResult> {
  if (!SLUG_RE.test(slug)) return { ok: false, error: "無效的歌曲代號。" };
  if (crop !== null && !/^[A-Za-z0-9_]+\.png$/.test(crop)) {
    return { ok: false, error: "無效的圖檔名。" };
  }

  const { user, error } = await requireEditor();
  if (error) return { ok: false, error };

  let supabase;
  try {
    supabase = getAdminSupabase();
  } catch {
    return { ok: false, error: "伺服器未設定 Supabase。" };
  }

  const dbError =
    crop === null
      ? (await supabase.from("song_scans").delete().eq("slug", slug)).error
      : (
          await supabase.from("song_scans").upsert(
            {
              slug,
              crop,
              updated_at: new Date().toISOString(),
              updated_by: user!.id,
            },
            { onConflict: "slug" },
          )
        ).error;
  if (dbError) return { ok: false, error: `設定失敗：${dbError.message}` };

  revalidateSong(slug);
  return { ok: true };
}

/**
 * Set (or clear, with `url === ""`) this song's YouTube reference video.
 * Accepts any common YouTube URL. Editor/admin.
 */
export async function setSongMedia(
  slug: string,
  url: string,
): Promise<EditResult> {
  if (!SLUG_RE.test(slug)) return { ok: false, error: "無效的歌曲代號。" };

  const clear = url.trim() === "";
  const id = clear ? null : parseYouTubeId(url);
  if (!clear && !id) {
    return { ok: false, error: "看不懂這個 YouTube 連結。" };
  }

  const { user, error } = await requireEditor();
  if (error) return { ok: false, error };

  let supabase;
  try {
    supabase = getAdminSupabase();
  } catch {
    return { ok: false, error: "伺服器未設定 Supabase。" };
  }

  const dbError = clear
    ? (await supabase.from("song_media").delete().eq("slug", slug)).error
    : (
        await supabase.from("song_media").upsert(
          {
            slug,
            youtube_id: id,
            updated_at: new Date().toISOString(),
            updated_by: user!.id,
          },
          { onConflict: "slug" },
        )
      ).error;
  if (dbError) return { ok: false, error: `設定失敗：${dbError.message}` };

  revalidateSong(slug);
  return { ok: true };
}

/** Turn a raw Postgres/RLS error into something a non-technical editor can read. */
function dbErrorMessage(verb: string, error: { message: string }): string {
  if (/row-level security|permission denied/i.test(error.message)) {
    return "沒有權限——帳號可能還在等待核准，或不是編輯者。";
  }
  return `${verb}失敗：${error.message}`;
}
