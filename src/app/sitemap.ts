import type { MetadataRoute } from "next";

import { CATALOG_KEYS, getAllSlugs } from "@/lib/songs/catalog";
import { SITE_URL } from "@/lib/site";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const slugs = await getAllSlugs();
  const now = new Date();

  return [
    { url: SITE_URL, lastModified: now, changeFrequency: "weekly", priority: 1 },
    ...CATALOG_KEYS.map((key) => ({
      url: `${SITE_URL}/keys/${key.toLowerCase()}`,
      lastModified: now,
      changeFrequency: "weekly" as const,
      priority: 0.6,
    })),
    ...slugs.map((slug) => ({
      url: `${SITE_URL}/songs/${slug}`,
      lastModified: now,
      changeFrequency: "monthly" as const,
      priority: 0.8,
    })),
  ];
}
