import { NextResponse } from "next/server";

import { getAdminSupabase } from "@/lib/supabase/admin";
import { getServerSupabase, isAdminEmail } from "@/lib/supabase/server";

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** Soft-delete a comment: allowed for its author or an admin. */
export async function DELETE(
  _request: Request,
  ctx: RouteContext<"/api/comments/[id]">,
) {
  const { id } = await ctx.params;
  if (!UUID_RE.test(id)) {
    return NextResponse.json({ error: "無效的留言。" }, { status: 400 });
  }

  const supabase = await getServerSupabase();
  if (!supabase) {
    return NextResponse.json({ error: "尚未啟用。" }, { status: 503 });
  }
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "請先登入。" }, { status: 401 });
  }

  const { data: comment } = await supabase
    .from("comments")
    .select("user_id")
    .eq("id", id)
    .maybeSingle();
  if (!comment) {
    return NextResponse.json({ error: "找不到留言。" }, { status: 404 });
  }

  const isOwner = comment.user_id === user.id;
  const isAdmin = isAdminEmail(user.email);
  if (!isOwner && !isAdmin) {
    return NextResponse.json({ error: "沒有權限。" }, { status: 403 });
  }

  // Owner can update via RLS; admin deleting someone else's needs service role.
  const writer = isOwner ? supabase : getAdminSupabase();
  const { error } = await writer
    .from("comments")
    .update({ deleted_at: new Date().toISOString() })
    .eq("id", id);
  if (error) {
    return NextResponse.json(
      { error: `刪除失敗：${error.message}` },
      { status: 500 },
    );
  }

  return NextResponse.json({ ok: true });
}
