"use server";

import { revalidatePath } from "next/cache";

import { parseChordPro } from "@/lib/music";
import { getAdminSupabase } from "@/lib/supabase/admin";
import { getCurrentUser, isAdminEmail } from "@/lib/supabase/server";

const SLUG_RE = /^[a-z]+-\d+$/;

export interface EditResult {
  ok: boolean;
  error?: string;
}

async function requireAdmin() {
  const user = await getCurrentUser();
  if (!user || !isAdminEmail(user.email)) {
    return { user: null, error: "沒有權限（需要管理員登入）。" as string };
  }
  return { user, error: null };
}

function revalidateSong(slug: string) {
  revalidatePath(`/songs/${slug}`);
  revalidatePath(`/songs/${slug}/play`);
  revalidatePath("/");
}

/** Save (upsert) a song's ChordPro content. Admin only. */
export async function saveSongContent(
  slug: string,
  chordpro: string,
): Promise<EditResult> {
  if (!SLUG_RE.test(slug)) return { ok: false, error: "無效的歌曲代號。" };

  const { user, error } = await requireAdmin();
  if (error) return { ok: false, error };

  const text = chordpro.replace(/\r\n?/g, "\n").trim();
  if (!text) return { ok: false, error: "內容不能是空的。" };
  if (text.length > 20000) return { ok: false, error: "內容太長。" };

  // Must parse into something with at least one line of content.
  const doc = parseChordPro(text);
  if (doc.sections.length === 0) {
    return { ok: false, error: "解析後沒有任何歌詞內容，請檢查格式。" };
  }

  let supabase;
  try {
    supabase = getAdminSupabase();
  } catch {
    return { ok: false, error: "伺服器未設定 Supabase。" };
  }

  const { error: dbError } = await supabase.from("song_contents").upsert(
    {
      slug,
      chordpro: text + "\n",
      updated_at: new Date().toISOString(),
      updated_by: user!.id,
    },
    { onConflict: "slug" },
  );
  if (dbError) return { ok: false, error: `儲存失敗：${dbError.message}` };

  revalidateSong(slug);
  return { ok: true };
}

/** Remove the site override so the song falls back to its seed .chordpro file. */
export async function revertSongContent(slug: string): Promise<EditResult> {
  if (!SLUG_RE.test(slug)) return { ok: false, error: "無效的歌曲代號。" };

  const { error } = await requireAdmin();
  if (error) return { ok: false, error };

  let supabase;
  try {
    supabase = getAdminSupabase();
  } catch {
    return { ok: false, error: "伺服器未設定 Supabase。" };
  }

  const { error: dbError } = await supabase
    .from("song_contents")
    .delete()
    .eq("slug", slug);
  if (dbError) return { ok: false, error: `還原失敗：${dbError.message}` };

  revalidateSong(slug);
  return { ok: true };
}
