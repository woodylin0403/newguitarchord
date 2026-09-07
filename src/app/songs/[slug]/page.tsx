import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { AdminEditLink } from "@/components/AdminEditLink";
import { ChordProView } from "@/components/ChordProView";
import { SongComments } from "@/components/SongComments";
import { Badge } from "@/components/ui/badge";
import { parseKey, suggestCapo } from "@/lib/music";
import { getAllSlugs, getSong } from "@/lib/songs/catalog";
import { getSongDocument } from "@/lib/songs/content";
import { keyLabel } from "@/lib/songs/labels";
import { getSongScans } from "@/lib/songs/scans";

// ISR: pages are prebuilt, but re-render in the background so site edits to
// `song_contents` show up without a full rebuild.
export const revalidate = 300;

export async function generateStaticParams() {
  return (await getAllSlugs()).map((slug) => ({ slug }));
}

export async function generateMetadata({
  params,
}: PageProps<"/songs/[slug]">): Promise<Metadata> {
  const { slug } = await params;
  const song = await getSong(slug);
  if (!song) return {};

  const description = `《${song.title}》教會詩歌吉他譜，原調 ${keyLabel(
    song.key,
  )}${song.timeSignature ? `，${song.timeSignature} 拍` : ""}。可即時移調並顯示 Capo 建議。`;

  return {
    title: song.title,
    description,
    alternates: { canonical: `/songs/${song.slug}` },
    openGraph: {
      title: `${song.title}｜教會詩歌吉他譜`,
      description,
      type: "article",
    },
  };
}

export default async function SongPage({ params }: PageProps<"/songs/[slug]">) {
  const { slug } = await params;
  const song = await getSong(slug);
  if (!song) notFound();

  const [document, scans] = await Promise.all([
    getSongDocument(slug),
    getSongScans(slug),
  ]);

  // A ChordPro file may declare its own {key:}; that is the real playing key.
  // Fall back to the hymnal's classification from songs.json.
  const originalKey =
    (document?.meta.key && parseKey(document.meta.key) ? document.meta.key : null) ??
    song.key;

  const tags = [
    keyLabel(originalKey),
    originalKey !== song.key ? `歸類 ${keyLabel(song.key)}` : null,
    song.timeSignature ? `${song.timeSignature} 拍` : null,
    song.bookPage ? `第 ${song.bookPage} 頁` : null,
  ].filter(Boolean) as string[];

  return (
    <article className="space-y-5">
      <nav className="flex items-center gap-1.5 text-xs text-muted">
        <Link href="/" className="hover:text-foreground">
          全部
        </Link>
        <span>/</span>
        <Link
          href={`/keys/${song.key.toLowerCase()}`}
          className="hover:text-foreground"
        >
          {keyLabel(song.key)}
        </Link>
      </nav>

      <header className="space-y-3">
        <h1 className="font-display text-3xl font-semibold tracking-tight">
          {song.title}
        </h1>
        <div className="flex flex-wrap items-center gap-1.5">
          {tags.map((tag, i) => (
            <Badge key={tag} variant={i === 0 ? "accent" : "default"}>
              {tag}
            </Badge>
          ))}
          <div className="ml-auto flex items-center gap-1.5">
            <AdminEditLink slug={song.slug} />
            {document && (
              <Link
                href={`/songs/${song.slug}/play`}
                className="rounded-full bg-accent px-3 py-1 text-xs font-medium text-accent-contrast"
              >
                演奏模式
              </Link>
            )}
          </div>
        </div>
      </header>

      {document ? (
        <ChordProView document={document} originalKey={originalKey} />
      ) : (
        <PendingTranscription musicKey={originalKey} />
      )}

      {scans &&
        (document ? (
          <details className="group rounded-2xl border border-border bg-surface">
            <summary className="cursor-pointer list-none px-4 py-3 text-xs font-semibold uppercase tracking-[0.15em] text-muted marker:content-none group-open:border-b group-open:border-border">
              掃描原稿 · 第 {scans.bookPage} 頁
            </summary>
            <div className="p-3">
              <ScanImages scans={scans} />
            </div>
          </details>
        ) : (
          <section className="space-y-3 pt-2">
            <h2 className="text-xs font-semibold uppercase tracking-[0.15em] text-muted">
              掃描原稿 · 第 {scans.bookPage} 頁
            </h2>
            <ScanImages scans={scans} />
            {scans.pageMates.length > 0 && (
              <p className="text-xs text-muted">
                同頁：
                {scans.pageMates.map((mate, i) => (
                  <span key={mate.slug}>
                    {i > 0 && "、"}
                    <Link
                      href={`/songs/${mate.slug}`}
                      className="text-foreground underline decoration-border-strong underline-offset-2 hover:decoration-accent"
                    >
                      {mate.title}
                    </Link>
                  </span>
                ))}
              </p>
            )}
          </section>
        ))}

      <SongComments slug={song.slug} />
    </article>
  );
}

function ScanImages({
  scans,
}: {
  scans: NonNullable<Awaited<ReturnType<typeof getSongScans>>>;
}) {
  if (scans.fullPage) {
    return (
      /* eslint-disable-next-line @next/next/no-img-element */
      <img
        src={scans.fullPage}
        alt={`詩歌本第 ${scans.bookPage} 頁掃描`}
        loading="lazy"
        className="w-full rounded-xl border border-border bg-white"
      />
    );
  }
  return (
    <div className="space-y-1 rounded-xl border border-border bg-white p-2">
      {scans.lineCrops.map((src) => (
        /* eslint-disable-next-line @next/next/no-img-element */
        <img key={src} src={src} alt="" loading="lazy" className="w-full" />
      ))}
    </div>
  );
}

/** Shown until a song has been transcribed to ChordPro. */
function PendingTranscription({ musicKey }: { musicKey: string }) {
  const capo = suggestCapo(musicKey).slice(0, 3);
  return (
    <div className="rounded-2xl border border-border bg-surface p-4">
      <p className="text-sm text-muted">
        和弦譜還在轉錄中。以下是依原調（{keyLabel(musicKey)}）的 Capo
        建議，可先對照下方掃描原稿。
      </p>
      {capo.length > 0 && (
        <ul className="mt-3 space-y-1.5">
          {capo.map((option) => (
            <li key={option.capo} className="font-mono text-xs">
              <span className="text-accent">
                {option.capo === 0 ? "不夾" : `Capo ${option.capo}`}
              </span>{" "}
              → 彈 {option.shapeKey} 指型
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
