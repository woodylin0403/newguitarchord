"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

import { restoreRevision } from "@/app/songs/[slug]/edit/actions";
import { Button } from "@/components/ui/button";
import { diffChordPro } from "@/lib/diff";
import type { SongRevision } from "@/lib/songs/revisions";
import { cn } from "@/lib/utils";

function fmt(iso: string): string {
  const d = new Date(iso);
  return `${d.getFullYear()}/${d.getMonth() + 1}/${d.getDate()} ${String(
    d.getHours(),
  ).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
}

/**
 * Version history for a song's ChordPro content. Rows come from
 * `song_revisions` (written by a DB trigger). Each row's diff is against the
 * chronologically previous revision; admin can restore any version.
 */
export function RevisionHistory({
  slug,
  songKey,
  revisions,
  currentSource,
  isAdmin,
}: {
  slug: string;
  songKey: string;
  revisions: SongRevision[];
  /** the currently-saved chordpro, to flag when it has drifted from history */
  currentSource: string;
  isAdmin: boolean;
}) {
  const router = useRouter();
  const [openId, setOpenId] = useState<string | null>(null);
  const [msg, setMsg] = useState<string | null>(null);
  const [err, setErr] = useState(false);
  const [pending, startTransition] = useTransition();

  const restore = (id: string) => {
    if (!confirm("確定要還原到這個版本嗎？目前內容會被取代。")) return;
    setMsg(null);
    setErr(false);
    startTransition(async () => {
      const res = await restoreRevision(slug, id, songKey);
      if (res.ok) {
        setMsg("已還原。");
        router.refresh();
      } else {
        setErr(true);
        setMsg(res.error ?? "還原失敗");
      }
    });
  };

  const stale =
    revisions.length > 0 && revisions[0].chordpro !== currentSource;

  return (
    <details className="rounded-xl border border-border bg-surface">
      <summary className="cursor-pointer list-none px-3 py-2 text-xs font-semibold uppercase tracking-[0.15em] text-muted">
        編輯紀錄{revisions.length > 0 ? `（${revisions.length}）` : ""}
      </summary>
      <div className="space-y-2 border-t border-border p-3">
        {stale && (
          <p className="rounded-lg bg-accent-soft px-3 py-2 text-xs text-accent">
            目前內容跟最新一筆紀錄不同（可能是回到了原始檔）。
          </p>
        )}

        {revisions.length === 0 ? (
          <p className="text-sm text-muted">目前沒有編輯紀錄。</p>
        ) : (
          <ul className="space-y-2">
            {revisions.map((rev, i) => {
              const prevText = revisions[i + 1]?.chordpro ?? "";
              const open = openId === rev.id;
              return (
                <li
                  key={rev.id}
                  className="rounded-lg border border-border p-2.5"
                >
                  <div className="flex flex-wrap items-center gap-2">
                    {rev.editorAvatar ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={rev.editorAvatar}
                        alt=""
                        className="size-5 rounded-full"
                      />
                    ) : (
                      <span className="grid size-5 place-items-center rounded-full bg-accent-soft text-[10px] font-semibold text-accent">
                        {rev.editorName.slice(0, 1).toUpperCase()}
                      </span>
                    )}
                    <span className="text-sm font-medium">
                      {rev.editorName}
                    </span>
                    <span className="text-xs text-muted">
                      {fmt(rev.editedAt)}
                    </span>
                    {i === 0 && (
                      <span className="rounded-md bg-accent-soft px-1.5 py-0.5 text-[10px] font-medium text-accent">
                        最新
                      </span>
                    )}
                    <div className="ml-auto flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => setOpenId(open ? null : rev.id)}
                        className="text-xs text-accent underline underline-offset-2"
                      >
                        {open ? "收起差異" : "比較差異"}
                      </button>
                      {isAdmin && (
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          disabled={pending}
                          onClick={() => restore(rev.id)}
                        >
                          還原到此版本
                        </Button>
                      )}
                    </div>
                  </div>

                  {open && (
                    <pre className="mt-2 overflow-x-auto rounded-lg bg-surface-2 p-2 font-mono text-[12px] leading-relaxed">
                      {diffChordPro(prevText, rev.chordpro).map((line, li) => (
                        <div
                          key={li}
                          className={cn(
                            "whitespace-pre",
                            line.type === "add" && "bg-accent-soft text-accent",
                            line.type === "remove" &&
                              "text-muted line-through opacity-70",
                          )}
                        >
                          {line.type === "add"
                            ? "+ "
                            : line.type === "remove"
                              ? "- "
                              : "  "}
                          {line.text || " "}
                        </div>
                      ))}
                    </pre>
                  )}
                </li>
              );
            })}
          </ul>
        )}

        {msg && (
          <p
            className={cn(
              "text-xs",
              err ? "text-red-600 dark:text-red-400" : "text-accent",
            )}
          >
            {msg}
          </p>
        )}
      </div>
    </details>
  );
}
