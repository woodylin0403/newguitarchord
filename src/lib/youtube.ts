/** Pure YouTube URL helpers — safe to import anywhere (no server deps). */

/** Pull the 11-char video id out of any common YouTube URL (or a bare id). */
export function parseYouTubeId(input: string): string | null {
  const s = input.trim();
  if (/^[A-Za-z0-9_-]{11}$/.test(s)) return s;

  let url: URL;
  try {
    url = new URL(s);
  } catch {
    return null;
  }

  const host = url.hostname.replace(/^www\./, "");
  let id: string | null = null;

  if (host === "youtu.be") {
    id = url.pathname.slice(1);
  } else if (
    host === "youtube.com" ||
    host === "m.youtube.com" ||
    host === "music.youtube.com" ||
    host === "youtube-nocookie.com"
  ) {
    if (url.pathname === "/watch") {
      id = url.searchParams.get("v");
    } else {
      const m = /^\/(?:embed|shorts|live|v)\/([A-Za-z0-9_-]{11})/.exec(
        url.pathname,
      );
      if (m) id = m[1];
    }
  }

  return id && /^[A-Za-z0-9_-]{11}$/.test(id) ? id : null;
}
