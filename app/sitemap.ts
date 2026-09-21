import type { MetadataRoute } from "next";
import { SITE } from "@/lib/site";

/**
 * Three routes. In-page anchors (#work, #services) are not separate URLs and
 * must never be listed here — they would be reported as duplicates of `/`.
 */
export default function sitemap(): MetadataRoute.Sitemap {
  const lastModified = new Date();

  return [
    { url: SITE.url, lastModified, changeFrequency: "monthly", priority: 1 },
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
