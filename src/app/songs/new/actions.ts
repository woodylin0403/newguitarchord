"use server";

import { revalidatePath } from "next/cache";

import { CATALOG_KEYS, isCatalogKey, parseChordPro } from "@/lib/music";
import { nextSlugForKey } from "@/lib/songs/catalog";
import { getAdminSupabase } from "@/lib/supabase/admin";
import { getCurrentUser, isAdminEmail } from "@/lib/supabase/server";

export interface CreateResult {
  ok: boolean;
  slug?: string;
  error?: string;
}

async function requireAdmin() {
  const user = await getCurrentUser();
  if (!user || !isAdminEmail(user.email)) {
    return { user: null, error: "沒有權限（需要管理員登入）。" };
  }
  return { user, error: null };
}

export async function createSong(input: {
  title: string;
  key: string;
  timeSignature: string;
  chordpro: string;
}): Promise<CreateResult> {
  const { user, error: authError } = await requireAdmin();
  if (authError) return { ok: false, error: authError };

  const title = input.title.trim();
  if (title.length < 1 || title.length > 120) {
    return { ok: false, error: "歌名長度要在 1–120 字之間。" };
  }
  if (!isCatalogKey(input.key)) {
    return { ok: false, error: `原調要是 ${CATALOG_KEYS.join(" / ")} 其中之一。` };
  }
  const timeSignature = input.timeSignature.trim();
  if (timeSignature && !/^\d{1,2}\/\d{1,2}$/.test(timeSignature)) {
    return { ok: false, error: "拍號格式像 4/4、3/4、6/8。" };
  }

  const chordpro = input.chordpro.replace(/\r\n?/g, "\n").trim();
  if (!chordpro) return { ok: false, error: "ChordPro 內容不能是空的。" };
  if (chordpro.length > 20000) return { ok: false, error: "內容太長。" };
  if (parseChordPro(chordpro).sections.length === 0) {
    return { ok: false, error: "解析後沒有任何歌詞內容，請檢查格式。" };
  }

  let supabase;
  try {
    supabase = getAdminSupabase();
  } catch {
    return { ok: false, error: "伺服器未設定 Supabase。" };
  }

  const { slug, number } = await nextSlugForKey(input.key);

  const { error: songError } = await supabase.from("songs").insert({
    slug,
    title,
    music_key: input.key,
    number,
    time_signature: timeSignature || null,
    created_by: user!.id,
  });
  if (songError) {
    return { ok: false, error: `新增失敗：${songError.message}` };
  }

  const { error: contentError } = await supabase.from("song_contents").insert({
    slug,
    chordpro: chordpro + "\n",
    updated_by: user!.id,
  });
  if (contentError) {
    // roll back the songs row so we don't leave a song with no content
    await supabase.from("songs").delete().eq("slug", slug);
    return { ok: false, error: `新增失敗：${contentError.message}` };
  }

  revalidatePath("/");
  revalidatePath(`/keys/${input.key.toLowerCase()}`);
  revalidatePath(`/songs/${slug}`);
  return { ok: true, slug };
}

/** Delete a site-added song (never a hymnal one). */
export async function deleteSong(slug: string): Promise<CreateResult> {
  const { error: authError } = await requireAdmin();
  if (authError) return { ok: false, error: authError };
  if (!/^[a-z]+-\d+$/.test(slug)) return { ok: false, error: "無效的歌曲代號。" };

  let supabase;
  try {
    supabase = getAdminSupabase();
  } catch {
    return { ok: false, error: "伺服器未設定 Supabase。" };
  }

  const { data: row } = await supabase
    .from("songs")
    .select("slug, music_key")
    .eq("slug", slug)
    .maybeSingle();
  if (!row) {
    return { ok: false, error: "這首不是站上新增的歌，不能從這裡刪除。" };
  }

  await supabase.from("song_contents").delete().eq("slug", slug);
  const { error } = await supabase.from("songs").delete().eq("slug", slug);
  if (error) return { ok: false, error: `刪除失敗：${error.message}` };

  revalidatePath("/");
  if (typeof row.music_key === "string") {
    revalidatePath(`/keys/${row.music_key.toLowerCase()}`);
  }
  return { ok: true };
}
