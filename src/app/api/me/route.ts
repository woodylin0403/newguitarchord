import { NextResponse } from "next/server";

import { getSessionInfo } from "@/lib/supabase/server";

/** Client-side auth/role check. Kept out of static pages so they stay SSG. */
export async function GET() {
  return NextResponse.json(await getSessionInfo(), {
    headers: { "cache-control": "no-store" },
  });
}
