"use client";

import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState, useTransition } from "react";

import { CATALOG_KEYS, collectChords, parseChordPro } from "@/lib/music";
import { createSong } from "@/app/songs/new/actions";
import { OCR_DRAFT_KEY } from "@/lib/ocr/draft";
import { ChordOcr } from "@/components/ChordOcr";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { NativeSelect } from "@/components/ui/native-select";
import { Textarea } from "@/components/ui/textarea";
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

  // Pick up a draft handed over from the 和弦圖轉譜 tool (once). setState is
  // deferred to a microtask so it isn't called synchronously in the effect.
  useEffect(() => {
    let draft: string | null = null;
    try {
      draft = sessionStorage.getItem(OCR_DRAFT_KEY);
      if (draft) sessionStorage.removeItem(OCR_DRAFT_KEY);
    } catch {
      /* ignore */
    }
    if (!draft) return;
    const d = draft;
    Promise.resolve().then(() => setEdited(d));
  }, []);

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
        router.refresh();
        router.push(`/songs/${res.slug}`);
      } else {
        setMsg(res.error ?? "新增失敗");
      }
    });
  };

  return (
    <div className="space-y-3">
      <div className="grid gap-3 sm:grid-cols-[1fr_auto_auto]">
        <div className="space-y-1">
          <Label htmlFor="new-title" className="text-xs font-normal text-muted">
            歌名
          </Label>
          <Input
            id="new-title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="例：奇異恩典"
          />
        </div>
        <div className="space-y-1">
          <Label htmlFor="new-key" className="text-xs font-normal text-muted">
            原調
          </Label>
          <NativeSelect
            id="new-key"
            value={key}
            onChange={(e) => setKey(e.target.value)}
            className="w-full sm:w-auto"
          >
            {CATALOG_KEYS.map((k) => (
              <option key={k} value={k}>
                {k}
              </option>
            ))}
          </NativeSelect>
        </div>
        <div className="space-y-1">
          <Label htmlFor="new-time" className="text-xs font-normal text-muted">
            拍號
          </Label>
          <Input
            id="new-time"
            value={time}
            onChange={(e) => setTime(e.target.value)}
            placeholder="4/4"
            className="w-full sm:w-20"
          />
        </div>
      </div>

      <p className="text-xs text-muted">
        歌詞由你輸入。和弦鈕會在游標處插入 <code className="font-mono">[C]</code>；
        <code className="font-mono">{"{start_of_chorus}"}</code> 分段，空行分節。
      </p>

      <ChordPad songKey={key} usedChords={usedChords} onInsert={insertAtCursor} />

      <details className="rounded-xl border border-border bg-surface">
        <summary className="cursor-pointer list-none px-3 py-2 text-xs font-semibold uppercase tracking-[0.15em] text-muted">
          從和弦圖轉入
        </summary>
        <div className="border-t border-border p-3">
          <ChordOcr
            applyLabel="填入下方編輯區"
            onApply={(t) => {
              if (
                edited &&
                edited.trim() &&
                !confirm("用轉出的內容取代目前編輯內容？")
              )
                return;
              setEdited(t);
            }}
          />
        </div>
      </details>

      <div className="grid gap-3 md:grid-cols-2">
        <Textarea
          ref={taRef}
          value={source}
          onChange={(e) => setEdited(e.target.value)}
          spellCheck={false}
          className="h-[55vh] resize-y font-mono text-[13px] leading-relaxed"
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

      <Button
        type="button"
        onClick={submit}
        disabled={pending || !title.trim()}
      >
        {pending ? "新增中…" : "新增歌曲"}
      </Button>
    </div>
  );
}
