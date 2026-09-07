"use client";

import { useEffect, useState } from "react";

import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";

interface Comment {
  id: string;
  body: string;
  createdAt: string;
  userId: string;
  authorName: string;
  authorAvatar: string | null;
}

interface Me {
  authenticated: boolean;
  isAdmin: boolean;
  userId?: string;
}

function fmt(iso: string): string {
  const d = new Date(iso);
  return `${d.getFullYear()}/${d.getMonth() + 1}/${d.getDate()} ${String(
    d.getHours(),
  ).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
}

/** Song comments — list + post + delete. Client-side so the song page stays SSG. */
export function SongComments({ slug }: { slug: string }) {
  const [comments, setComments] = useState<Comment[] | null>(null);
  const [me, setMe] = useState<Me | null>(null);
  const [draft, setDraft] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;
    fetch(`/api/songs/${slug}/comments`)
      .then((r) => r.json())
      .then((j) => {
        if (alive) setComments(j.comments ?? []);
      })
      .catch(() => {
        if (alive) setComments([]);
      });
    fetch("/api/me")
      .then((r) => r.json())
      .then((info) => {
        if (alive)
          setMe({
            authenticated: Boolean(info.authenticated),
            isAdmin: Boolean(info.isAdmin),
            userId: info.userId,
          });
      })
      .catch(() => {
        if (alive) setMe({ authenticated: false, isAdmin: false });
      });
    return () => {
      alive = false;
    };
  }, [slug]);

  const submit = async () => {
    const body = draft.trim();
    if (!body) return;
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(`/api/songs/${slug}/comments`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ body }),
      });
      const json = await res.json();
      if (!res.ok) {
        setError(json.error ?? "送出失敗");
      } else {
        setDraft("");
        setComments(json.comments ?? []);
      }
    } finally {
      setBusy(false);
    }
  };

  const remove = async (id: string) => {
    if (!confirm("刪除這則留言？")) return;
    const res = await fetch(`/api/comments/${id}`, { method: "DELETE" });
    if (res.ok) setComments((cs) => (cs ?? []).filter((c) => c.id !== id));
    else {
      const json = await res.json().catch(() => ({}));
      setError(json.error ?? "刪除失敗");
    }
  };

  return (
    <section className="space-y-3 pt-2">
      <h2 className="text-xs font-semibold uppercase tracking-[0.15em] text-muted">
        留言 {comments ? `· ${comments.length}` : ""}
      </h2>

      {me?.authenticated ? (
        <div className="space-y-2">
          <Textarea
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            rows={3}
            maxLength={4000}
            placeholder="寫下對這首歌的心得、和弦建議…"
            className="resize-y"
          />
          <div className="flex justify-end">
            <Button
              type="button"
              size="sm"
              onClick={submit}
              disabled={busy || !draft.trim()}
            >
              {busy ? "送出中…" : "送出"}
            </Button>
          </div>
        </div>
      ) : (
        <p className="rounded-xl border border-border bg-surface px-3 py-2.5 text-sm text-muted">
          登入後即可留言。
        </p>
      )}

      {error && (
        <p className="rounded-lg bg-accent-soft px-3 py-2 text-sm text-accent">
          {error}
        </p>
      )}

      {comments === null ? (
        <p className="text-sm text-muted">載入中…</p>
      ) : comments.length === 0 ? (
        <p className="text-sm text-muted">還沒有留言。</p>
      ) : (
        <ul className="space-y-3">
          {comments.map((c) => {
            const canDelete =
              me?.isAdmin || (me?.userId && me.userId === c.userId);
            return (
              <li
                key={c.id}
                className="rounded-xl border border-border bg-surface p-3"
              >
                <div className="mb-1 flex items-center gap-2">
                  {c.authorAvatar ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={c.authorAvatar}
                      alt=""
                      className="h-5 w-5 rounded"
                    />
                  ) : (
                    <span className="grid h-5 w-5 place-items-center rounded bg-accent-soft text-[10px] font-semibold text-accent">
                      {c.authorName.slice(0, 1).toUpperCase()}
                    </span>
                  )}
                  <span className="text-sm font-medium">{c.authorName}</span>
                  <span className="text-xs text-muted">{fmt(c.createdAt)}</span>
                  {canDelete && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => remove(c.id)}
                      className="ml-auto h-auto px-2 py-0.5 text-xs text-muted"
                    >
                      刪除
                    </Button>
                  )}
                </div>
                <p className="whitespace-pre-wrap text-sm leading-relaxed">
                  {c.body}
                </p>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
