import type { Metadata } from "next";

import { SearchBox } from "@/components/SearchBox";
import { SongList } from "@/components/SongList";
import { searchSongs } from "@/lib/songs/catalog";
import { getTranscribedSlugs } from "@/lib/songs/content";

export const metadata: Metadata = {
  title: "搜尋",
  robots: { index: false },
};

export default async function SearchPage({
  searchParams,
}: PageProps<"/search">) {
  const { q } = await searchParams;
  const query = typeof q === "string" ? q : "";
  const [results, transcribed] = await Promise.all([
    query ? searchSongs(query) : Promise.resolve([]),
    getTranscribedSlugs(),
  ]);

  return (
    <div className="space-y-4">
      <h1 className="font-display text-3xl font-semibold tracking-tight">
        搜尋詩歌
      </h1>
      <SearchBox defaultValue={query} autoFocus />

      {query && (
        <p className="text-xs text-muted">
          「{query}」· {results.length} 筆
        </p>
      )}

      {query && <SongList songs={results} showKey transcribed={transcribed} />}
    </div>
  );
}
