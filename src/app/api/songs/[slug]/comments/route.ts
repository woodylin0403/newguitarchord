import { NextResponse } from "next/server";

import { listComments } from "@/lib/comments/queries";
import { getServerSupabase } from "@/lib/supabase/server";

const SLUG_RE = /^[a-z]+-\d+$/;

export async function GET(
  _request: Request,
  ctx: RouteContext<"/api/songs/[slug]/comments">,
) {
  const { slug } = await ctx.params;
  if (!SLUG_RE.test(slug)) return NextResponse.json({ comments: [] });
  return NextResponse.json(
    { comments: await listComments(slug) },
    { headers: { "cache-control": "no-store" } },
  );
}

export async function POST(
  request: Request,
  ctx: RouteContext<"/api/songs/[slug]/comments">,
) {
  const { slug } = await ctx.params;
  if (!SLUG_RE.test(slug)) {
    return NextResponse.json({ error: "無效的歌曲。" }, { status: 400 });
  }

  const supabase = await getServerSupabase();
  if (!supabase) {
    return NextResponse.json({ error: "留言功能尚未啟用。" }, { status: 503 });
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "請先登入。" }, { status: 401 });
  }

  const body = (((await request.json().catch(() => ({}))) as { body?: string })
    .body ?? "").trim();
  if (!body) {
    return NextResponse.json({ error: "留言不能是空的。" }, { status: 400 });
  }
  if (body.length > 4000) {
    return NextResponse.json({ error: "留言太長。" }, { status: 400 });
  }

  // user_id defaults to auth.uid(); RLS enforces it matches the caller.
  const { error } = await supabase
    .from("comments")
    .insert({ song_slug: slug, body });
  if (error) {
    return NextResponse.json(
      { error: `送出失敗：${error.message}` },
      { status: 500 },
    );
  }

  return NextResponse.json({ comments: await listComments(slug) });
}
