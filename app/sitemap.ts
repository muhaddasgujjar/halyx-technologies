import type { MetadataRoute } from "next";
import { SITE } from "@/lib/site";

/** One route today. Add entries here as the site grows past the homepage. */
export default function sitemap(): MetadataRoute.Sitemap {
  return [
    {
      url: SITE.url,
      lastModified: new Date(),
      changeFrequency: "monthly",
      priority: 1,
    },
  ];
}
