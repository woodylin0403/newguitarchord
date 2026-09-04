/**
 * One-off bulk import: push every data/songs/<slug>.chordpro file into the
 * Supabase `song_contents` table. Optional — the site already falls back to the
 * files. Useful if you want everything in the DB (e.g. before deleting the
 * seed files).
 *
 *   npm run seed:content            # upsert, keeps existing rows' text
 *   npm run seed:content -- --force # overwrite existing rows too
 */

import { readdir, readFile } from "node:fs/promises";
import path from "node:path";

// Load .env.local (scripts don't get Next's env loading).
async function loadEnv() {
  try {
    const text = await readFile(path.join(process.cwd(), ".env.local"), "utf8");
    for (const line of text.split("\n")) {
      const m = /^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/.exec(line);
      if (m && !process.env[m[1]]) {
        process.env[m[1]] = m[2].replace(/^["']|["']$/g, "");
      }
    }
  } catch {
    /* rely on real env */
  }
}

async function main() {
  await loadEnv();
  const { getAdminSupabase } = await import("../src/lib/supabase/admin");
  const force = process.argv.includes("--force");

  const dir = path.join(process.cwd(), "data", "songs");
  const files = (await readdir(dir)).filter((f) =>
    /^[a-z]+-\d+\.chordpro$/.test(f),
  );

  const supabase = getAdminSupabase();

  let existing = new Set<string>();
  if (!force) {
    const { data } = await supabase.from("song_contents").select("slug");
    existing = new Set((data ?? []).map((r) => r.slug as string));
  }

  const rows: { slug: string; chordpro: string }[] = [];
  for (const file of files) {
    const slug = file.replace(/\.chordpro$/, "");
    if (existing.has(slug)) continue;
    rows.push({ slug, chordpro: await readFile(path.join(dir, file), "utf8") });
  }

  if (rows.length === 0) {
    console.log("Nothing to seed.");
    return;
  }

  const { error } = await supabase
    .from("song_contents")
    .upsert(rows, { onConflict: "slug" });
  if (error) {
    console.error("Seed failed:", error.message);
    process.exit(1);
  }
  console.log(`Seeded ${rows.length} song(s) into song_contents.`);
}

void main();
