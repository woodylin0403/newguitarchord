"use client";

import { useRouter } from "next/navigation";
import {
  useEffect,
  useMemo,
  useRef,
  useState,
  useTransition,
} from "react";

import { collectChords, parseChordPro } from "@/lib/music";
import {
  revertSongContent,
  saveSongContent,
} from "@/app/songs/[slug]/edit/actions";
import { deleteSong } from "@/app/songs/new/actions";
import { ChartPreview } from "./ChartPreview";
import { ChordPad } from "./ChordPad";

/**
 * Admin editor: raw ChordPro on the left, live preview on the right. Fix chord
 * placement by moving the `[X]` markers between characters. The chord pad drops
 * `[X]` in at the cursor.
 */
export function SongEditor({
  slug,
  songKey,
  initialSource,
  isOverridden,
  isCustom = false,
}: {
  slug: string;
  songKey: string;
  initialSource: string;
  isOverridden: boolean;
  isCustom?: boolean;
}) {
  const router = useRouter();
  const [source, setSource] = useState(initialSource);
  const [msg, setMsg] = useState<string | null>(null);
  const [markSpaces, setMarkSpaces] = useState(true);
  const [pending, startTransition] = useTransition();

  const taRef = useRef<HTMLTextAreaElement>(null);
  const pendingCursor = useRef<number | null>(null);

  const dirty = source !== initialSource;
  const doc = useMemo(() => parseChordPro(source), [source]);
  const usedChords = useMemo(() => collectChords(doc), [doc]);
  const keyForPad = doc.meta.key || songKey;

  // Restore the caret after a chord-pad insert re-renders the textarea.
  useEffect(() => {
    if (pendingCursor.current !== null && taRef.current) {
      const pos = pendingCursor.current;
      taRef.current.setSelectionRange(pos, pos);
      pendingCursor.current = null;
    }
  }, [source]);

  const insertAtCursor = (text: string) => {
    const ta = taRef.current;
    const start = ta?.selectionStart ?? source.length;
    const end = ta?.selectionEnd ?? start;
    pendingCursor.current = start + text.length;
    setSource(source.slice(0, start) + text + source.slice(end));
    ta?.focus();
  };

  const save = () => {
    setMsg(null);
    startTransition(async () => {
      const res = await saveSongContent(slug, source);
      if (res.ok) {
        router.push(`/songs/${slug}`);
        router.refresh();
      } else {
        setMsg(res.error ?? "儲存失敗");
      }
    });
  };

  const revert = () => {
    if (!confirm("確定要刪除站上的修改、回到原始檔案內容？")) return;
    setMsg(null);
    startTransition(async () => {
      const res = await revertSongContent(slug);
      if (res.ok) {
        router.push(`/songs/${slug}`);
        router.refresh();
      } else {
        setMsg(res.error ?? "還原失敗");
      }
    });
  };

  const remove = () => {
    if (!confirm("確定要整首刪除？這是站上新增的歌，會一併刪掉和弦譜。")) return;
    setMsg(null);
    startTransition(async () => {
      const res = await deleteSong(slug);
      if (res.ok) {
        router.push("/");
        router.refresh();
      } else {
        setMsg(res.error ?? "刪除失敗");
      }
    });
  };

  return (
    <div className="space-y-3">
      <p className="text-xs text-muted">
        和弦寫成 <code className="font-mono">[C]</code>，插在對應的字前面。
        點下面的和弦鈕會在游標處插入。第一拍沒落在字上時，
        <b>和弦後面加空白鍵</b>就能微調（<code className="font-mono">[C] 歌詞</code>）。
        <code className="font-mono">{"{start_of_chorus}"}</code> /{" "}
        <code className="font-mono">{"{start_of_verse: 一}"}</code> 分段，空行分節。
      </p>

      <ChordPad
        songKey={keyForPad}
        usedChords={usedChords}
        onInsert={insertAtCursor}
      />

      <div className="grid gap-3 md:grid-cols-2">
        <textarea
          ref={taRef}
          value={source}
          onChange={(e) => setSource(e.target.value)}
          spellCheck={false}
          className="h-[60vh] w-full resize-y rounded-xl border border-border bg-surface p-3 font-mono text-[13px] leading-relaxed outline-none focus:border-accent"
        />
        <div className="h-[60vh] overflow-y-auto rounded-xl border border-border bg-surface p-3">
          <div className="mb-2 flex items-center justify-between">
            <span className="text-[11px] font-semibold uppercase tracking-[0.15em] text-muted">
              預覽
            </span>
            <label className="flex items-center gap-1.5 text-[11px] text-muted">
              <input
                type="checkbox"
                checked={markSpaces}
                onChange={(e) => setMarkSpaces(e.target.checked)}
              />
              標出和弦下的空白
            </label>
          </div>
          <ChartPreview document={doc} markSpaces={markSpaces} />
        </div>
      </div>

      {msg && (
        <p className="rounded-lg bg-accent-soft px-3 py-2 text-sm text-accent">
          {msg}
        </p>
      )}

      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={save}
          disabled={pending || !dirty}
          className="rounded-full bg-accent px-4 py-2 text-sm font-medium text-accent-contrast disabled:opacity-40"
        >
          {pending ? "處理中…" : "儲存"}
        </button>
        <button
          type="button"
          onClick={() => setSource(initialSource)}
          disabled={pending || !dirty}
          className="rounded-full border border-border px-4 py-2 text-sm disabled:opacity-40"
        >
          復原變更
        </button>
        {isCustom ? (
          <button
            type="button"
            onClick={remove}
            disabled={pending}
            className="ml-auto rounded-full border border-border px-4 py-2 text-sm text-muted disabled:opacity-40"
          >
            刪除整首
          </button>
        ) : (
          isOverridden && (
            <button
              type="button"
              onClick={revert}
              disabled={pending}
              className="ml-auto rounded-full border border-border px-4 py-2 text-sm text-muted disabled:opacity-40"
            >
              刪除站上修改（回原始檔）
            </button>
          )
        )}
      </div>
    </div>
  );
}
