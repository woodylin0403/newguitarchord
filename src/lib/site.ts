/**
 * Canonical site origin, used for metadata, sitemap and robots.
 * Set `NEXT_PUBLIC_SITE_URL` in production (e.g. https://your-app.vercel.app);
 * falls back to localhost for dev.
 */
export const SITE_URL = (
  process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000"
).replace(/\/$/, "");

/** Full site name (browser title, structured data, OG). */
export const SITE_NAME = "烏鴉的天空 詩歌吉他譜";
/** Short wordmark for the header. */
export const SITE_SHORT = "烏鴉的天空";

/** Absolute URL for a site-relative path. */
export function siteUrl(path = "/"): string {
  return `${SITE_URL}${path.startsWith("/") ? path : `/${path}`}`;
}
