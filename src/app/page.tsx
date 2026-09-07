import Link from "next/link";

import { AdminNewSongLink } from "@/components/AdminNewSongLink";
import { SearchBox } from "@/components/SearchBox";
import { Card } from "@/components/ui/card";
import { parseKey } from "@/lib/music";
import { CATALOG_KEYS, getCatalogByKey } from "@/lib/songs/catalog";
import { getTranscribedSlugs } from "@/lib/songs/content";

export default async function HomePage() {
  const [byKey, transcribed] = await Promise.all([
    getCatalogByKey(),
    getTranscribedSlugs(),
  ]);
  const total = [...byKey.values()].reduce((n, list) => n + list.length, 0);
  const done = transcribed.size;

  return (
    <div className="space-y-10 py-4">
      <section className="space-y-5">
        <div className="space-y-2">
          <h1 className="font-display text-4xl font-semibold leading-[1.05] tracking-tight sm:text-5xl">
            烏鴉的天空
            <br />
            詩歌吉他譜
          </h1>
          <p className="text-muted">
            紙本詩歌本數位化。移調、Capo 建議、依原調瀏覽，手機隨開隨彈。
          </p>
        </div>

        <SearchBox />

        <div className="flex items-center gap-2">
          <AdminNewSongLink />
        </div>

        <p className="text-xs text-muted">
          已轉錄和弦譜{" "}
          <span className="font-mono text-foreground">
            {done}
          </span>{" "}
          / {total} 首 · 其餘可先看掃描原稿
        </p>
      </section>

      <section className="space-y-3">
        <h2 className="text-xs font-semibold uppercase tracking-[0.15em] text-muted">
          依原調
        </h2>
        <div className="grid grid-cols-3 gap-2.5">
          {CATALOG_KEYS.map((key) => {
            const info = parseKey(key);
            const count = byKey.get(key)?.length ?? 0;
            return (
              <Card key={key} asChild className="elevate">
                <Link
                  href={`/keys/${key.toLowerCase()}`}
                  className="group flex flex-col justify-between p-3.5 outline-none transition-colors hover:border-accent hover:bg-accent-soft focus-visible:border-accent focus-visible:ring-2 focus-visible:ring-ring/40"
                >
                  <span className="font-mono text-2xl font-bold tracking-tight transition-colors group-hover:text-accent">
                    {key}
                  </span>
                  <span className="mt-3 text-[11px] text-muted">
                    {info?.mode === "minor" ? "小調" : "大調"} · {count}
                  </span>
                </Link>
              </Card>
            );
          })}
        </div>
      </section>
    </div>
  );
}
