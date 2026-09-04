import { NextResponse } from "next/server";

import { getServerSupabase } from "@/lib/supabase/server";

/** OAuth redirect target: exchanges the `?code` for a session cookie. */
export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const next = searchParams.get("next") ?? "/";

  if (code) {
    const supabase = await getServerSupabase();
    if (supabase) {
      const { error } = await supabase.auth.exchangeCodeForSession(code);
      if (!error) {
        return NextResponse.redirect(
          `${origin}${next.startsWith("/") ? next : "/"}`,
        );
      }
    }
  }

  return NextResponse.redirect(`${origin}/?auth=error`);
}
