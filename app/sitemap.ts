import type { MetadataRoute } from "next";
import { SERVICE_PAGES } from "@/lib/service-pages";
import { SITE } from "@/lib/site";

/**
 * The homepage, the five practice pages and the two legal pages.
 *
 * In-page anchors (#work, #services) are not separate URLs and must never be
 * listed here — they would be reported as duplicates of `/`. That is exactly
 * what the practices used to be, which is why they each have a route now.
 *
 * `/voice` is deliberately absent: it is a test surface and sets `noindex`.
 */
export default function sitemap(): MetadataRoute.Sitemap {
  const lastModified = new Date();

  return [
    { url: SITE.url, lastModified, changeFrequency: "monthly", priority: 1 },
    // The commercial pages: the ones that should actually rank.
    ...SERVICE_PAGES.map((p) => ({
      url: `${SITE.url}/services/${p.slug}`,
      lastModified,
      changeFrequency: "monthly" as const,
      priority: 0.8,
    })),
    {
      url: `${SITE.url}/privacy`,
      lastModified,
      changeFrequency: "yearly",
      priority: 0.3,
    },
    {
      url: `${SITE.url}/terms`,
      lastModified,
      changeFrequency: "yearly",
      priority: 0.3,
    },
  ];
}
