import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";

import { PerformanceView } from "@/components/PerformanceView";
import { parseKey } from "@/lib/music";
import { getSong } from "@/lib/songs/catalog";
import { getSongDocument } from "@/lib/songs/content";

export const metadata: Metadata = { robots: { index: false } };

export default async function PerformancePage({
  params,
}: PageProps<"/songs/[slug]/play">) {
  const { slug } = await params;
  const song = await getSong(slug);
  if (!song) notFound();

  const document = await getSongDocument(slug);
  // Nothing to perform without a chart — send the reader to the song page.
  if (!document) redirect(`/songs/${slug}`);

  const originalKey =
    (document.meta.key && parseKey(document.meta.key) ? document.meta.key : null) ??
    song.key;

  return (
    <PerformanceView
      slug={slug}
      title={song.title}
      document={document}
      originalKey={originalKey}
    />
  );
}
