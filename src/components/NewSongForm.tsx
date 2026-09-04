"use client";

import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState, useTransition } from "react";

import { CATALOG_KEYS, collectChords, parseChordPro } from "@/lib/music";
import { createSong } from "@/app/songs/new/actions";
import { ChartPreview } from "./ChartPreview";
import { ChordPad } from "./ChordPad";

function template(title: string, key: string) {
  return `{title: ${title || "新歌"}}\n{key: ${key}}\n{time: 4/4}\n\n[${key}]第一行歌詞\n`;
}

export function NewSongForm() {
  const router = useRouter();
  const [title, setTitle] = useState("");
  const [key, setKey] = useState<string>("C");
  const [time, setTime] = useState("4/4");
  // null = still following the title/key template; a string = user has edited.
  const [edited, setEdited] = useState<string | null>(null);
  const [msg, setMsg] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const taRef = useRef<HTMLTextAreaElement>(null);
  const pendingCursor = useRef<number | null>(null);

  const source = edited ?? template(title, key);
  const doc = useMemo(() => parseChordPro(source), [source]);
  const usedChords = useMemo(() => collectChords(doc), [doc]);

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
    setEdited(source.slice(0, start) + text + source.slice(end));
    ta?.focus();
  };

  const submit = () => {
    setMsg(null);
    startTransition(async () => {
      const res = await createSong({
        title,
        key,
        timeSignature: time,
        chordpro: source,
      });
      if (res.ok && res.slug) {
        router.push(`/songs/${res.slug}`);
        router.refresh();
      } else {
        setMsg(res.error ?? "新增失敗");
      }
    });
  };

  return (
    <div className="space-y-3">
      <div className="grid gap-3 sm:grid-cols-[1fr_auto_auto]">
        <label className="text-sm">
          <span className="mb-1 block text-xs text-muted">歌名</span>
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="例：奇異恩典"
            className="w-full rounded-lg border border-border bg-surface px-3 py-2 outline-none focus:border-accent"
          />
        </label>
        <label className="text-sm">
          <span className="mb-1 block text-xs text-muted">原調</span>
          <select
            value={key}
            onChange={(e) => setKey(e.target.value)}
            className="rounded-lg border border-border bg-surface px-3 py-2 outline-none focus:border-accent"
          >
            {CATALOG_KEYS.map((k) => (
              <option key={k} value={k}>
                {k}
              </option>
            ))}
          </select>
        </label>
        <label className="text-sm">
          <span className="mb-1 block text-xs text-muted">拍號</span>
          <input
            value={time}
            onChange={(e) => setTime(e.target.value)}
            placeholder="4/4"
            className="w-20 rounded-lg border border-border bg-surface px-3 py-2 outline-none focus:border-accent"
          />
        </label>
      </div>

      <p className="text-xs text-muted">
        歌詞由你輸入。和弦鈕會在游標處插入 <code className="font-mono">[C]</code>；
        <code className="font-mono">{"{start_of_chorus}"}</code> 分段，空行分節。
      </p>

      <ChordPad songKey={key} usedChords={usedChords} onInsert={insertAtCursor} />

      <div className="grid gap-3 md:grid-cols-2">
        <textarea
          ref={taRef}
          value={source}
          onChange={(e) => setEdited(e.target.value)}
          spellCheck={false}
          className="h-[55vh] w-full resize-y rounded-xl border border-border bg-surface p-3 font-mono text-[13px] leading-relaxed outline-none focus:border-accent"
        />
        <div className="h-[55vh] overflow-y-auto rounded-xl border border-border bg-surface p-3">
          <div className="mb-2 text-[11px] font-semibold uppercase tracking-[0.15em] text-muted">
            預覽
          </div>
          <ChartPreview document={doc} markSpaces />
        </div>
      </div>

      {msg && (
        <p className="rounded-lg bg-accent-soft px-3 py-2 text-sm text-accent">
          {msg}
        </p>
      )}

      <button
        type="button"
        onClick={submit}
        disabled={pending || !title.trim()}
        className="rounded-full bg-accent px-5 py-2 text-sm font-medium text-accent-contrast disabled:opacity-40"
      >
        {pending ? "新增中…" : "新增歌曲"}
      </button>
    </div>
  );
}
