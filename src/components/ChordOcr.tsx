"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, useTransition } from "react";

import { convertChartImage } from "@/app/tools/ocr/actions";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { OCR_DRAFT_KEY } from "@/lib/ocr/draft";
import { cn } from "@/lib/utils";

const MAX_BYTES = 5 * 1024 * 1024;

/**
 * Chord-chart image → ChordPro converter.
 *
 * Standalone (no `onApply`): shows 複製 + 帶進新增歌曲 (hands the text to
 * `/songs/new` via sessionStorage).
 * Embedded (`onApply` given): shows 複製 + a button that calls `onApply(text)`
 * so a host editor can drop the result straight into its textarea.
 */
export function ChordOcr({
  onApply,
  applyLabel = "填入編輯器",
  defaultImageUrl = null,
}: {
  onApply?: (chordpro: string) => void;
  applyLabel?: string;
  /** same-origin image URL to pre-load (e.g. this song's pinned scan crop) */
  defaultImageUrl?: string | null;
}) {
  const router = useRouter();
  const [dataUrl, setDataUrl] = useState<string | null>(null);
  const [out, setOut] = useState("");
  const [msg, setMsg] = useState<string | null>(null);
  const [err, setErr] = useState(false);
  const [dragging, setDragging] = useState(false);
  const [pending, startTransition] = useTransition();
  const fileRef = useRef<HTMLInputElement>(null);
  const loadedDefault = useRef(false);

  // Pre-load the song's pinned scan crop so the user just clicks 轉換.
  useEffect(() => {
    if (!defaultImageUrl || loadedDefault.current) return;
    loadedDefault.current = true;
    fetch(defaultImageUrl)
      .then((r) => (r.ok ? r.blob() : Promise.reject(new Error("fetch"))))
      .then((blob) => {
        const reader = new FileReader();
        reader.onload = () => setDataUrl(String(reader.result));
        reader.readAsDataURL(blob);
      })
      .catch(() => {
        /* leave empty — the user can still paste an image */
      });
  }, [defaultImageUrl]);

  const loadFile = (f: File | null | undefined) => {
    if (!f) return;
    if (!f.type.startsWith("image/")) {
      setErr(true);
      setMsg("那不是圖片檔。");
      return;
    }
    if (f.size > MAX_BYTES) {
      setErr(true);
      setMsg("圖片太大（上限 5 MB），請壓縮後再試。");
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      setDataUrl(String(reader.result));
      setOut("");
      setErr(false);
      setMsg(null);
    };
    reader.onerror = () => {
      setErr(true);
      setMsg("讀取圖片失敗。");
    };
    reader.readAsDataURL(f);
  };

  const onPaste = (e: React.ClipboardEvent) => {
    const items = e.clipboardData?.items ?? [];
    for (const it of items) {
      if (it.type.startsWith("image/")) {
        loadFile(it.getAsFile());
        e.preventDefault();
        return;
      }
    }
  };

  const convert = () => {
    if (!dataUrl) return;
    setMsg(null);
    setErr(false);
    const slow = setTimeout(() => {
      setMsg("辨識中…（較大或多首的圖會比較久，約 20～40 秒）");
    }, 8000);
    startTransition(async () => {
      try {
        const res = await convertChartImage(dataUrl);
        if (res.ok && res.text) {
          setOut(res.text);
          setMsg("完成 —— 請對照原圖校對後再使用。");
        } else {
          setErr(true);
          setMsg(res.error ?? "轉換失敗");
        }
      } catch {
        setErr(true);
        setMsg("辨識逾時或連線中斷。把圖裁成單首、縮小一點再試。");
      } finally {
        clearTimeout(slow);
      }
    });
  };

  const copy = async () => {
    if (!out) return;
    try {
      await navigator.clipboard.writeText(out);
      setMsg("已複製到剪貼簿。");
      setErr(false);
    } catch {
      setErr(true);
      setMsg("複製失敗，請手動選取。");
    }
  };

  const toNewSong = () => {
    if (!out) return;
    try {
      sessionStorage.setItem(OCR_DRAFT_KEY, out);
    } catch {
      /* ignore */
    }
    router.push("/songs/new");
  };

  return (
    <div
      className="space-y-3"
      onPaste={onPaste}
      onDragOver={(e) => {
        e.preventDefault();
        setDragging(true);
      }}
      onDragLeave={() => setDragging(false)}
      onDrop={(e) => {
        e.preventDefault();
        setDragging(false);
        loadFile(e.dataTransfer.files?.[0]);
      }}
    >
      {dataUrl ? (
        <div className="relative overflow-hidden rounded-xl border border-border bg-white">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={dataUrl} alt="和弦圖預覽" className="w-full" />
          <Button
            variant="secondary"
            size="sm"
            className="absolute right-2 top-2"
            onClick={() => {
              setDataUrl(null);
              setOut("");
              setMsg(null);
            }}
          >
            移除
          </Button>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => fileRef.current?.click()}
          className={cn(
            "flex w-full flex-col items-center gap-2 rounded-xl border-2 border-dashed px-5 py-9 text-center text-sm text-muted transition-colors",
            dragging
              ? "border-accent bg-accent-soft text-foreground"
              : "border-border-strong hover:border-accent",
          )}
        >
          <span>
            截圖後直接 <kbd className="font-mono text-xs">Ctrl</kbd>+
            <kbd className="font-mono text-xs">V</kbd> 貼上
          </span>
          <span className="text-xs">也可以點這裡選圖，或把圖拖進來</span>
        </button>
      )}
      <input
        ref={fileRef}
        type="file"
        accept="image/png,image/jpeg,image/webp,image/gif"
        hidden
        onChange={(e) => loadFile(e.target.files?.[0])}
      />

      <div className="flex flex-wrap items-center gap-2">
        <Button onClick={convert} disabled={!dataUrl || pending}>
          {pending ? "辨識中…" : out ? "重新轉換" : "轉換"}
        </Button>
        {out && (
          <>
            <Button variant="outline" onClick={copy}>
              複製
            </Button>
            {onApply ? (
              <Button variant="outline" onClick={() => onApply(out)}>
                {applyLabel}
              </Button>
            ) : (
              <Button variant="outline" onClick={toNewSong}>
                帶進新增歌曲
              </Button>
            )}
          </>
        )}
      </div>

      {msg && (
        <p
          className={cn(
            "rounded-lg bg-accent-soft px-3 py-2 text-sm",
            err ? "text-red-600 dark:text-red-400" : "text-accent",
          )}
        >
          {msg}
        </p>
      )}

      {out && (
        <div className="space-y-1.5">
          <span className="text-[11px] font-semibold uppercase tracking-[0.15em] text-muted">
            ChordPro
          </span>
          <Textarea
            value={out}
            onChange={(e) => setOut(e.target.value)}
            spellCheck={false}
            className="min-h-[320px] font-mono text-[13px] leading-relaxed"
          />
        </div>
      )}
    </div>
  );
}
