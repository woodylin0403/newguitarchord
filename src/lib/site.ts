/**
 * Canonical site origin, used for metadata, sitemap and robots.
 * Set `NEXT_PUBLIC_SITE_URL` in production (e.g. https://your-app.vercel.app);
 * falls back to localhost for dev.
 */
export const SITE_URL = (
  process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000"
).replace(/\/$/, "");
