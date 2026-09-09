import type { MetadataRoute } from "next";
import { IS_INDEXABLE, SITE } from "@/lib/site";

/**
 * Preview and local builds return a blanket disallow, so a staging URL can
 * never end up in an index. Production opts in only once
 * `NEXT_PUBLIC_SITE_URL` is set.
 */
export default function robots(): MetadataRoute.Robots {
  if (!IS_INDEXABLE) {
    return { rules: [{ userAgent: "*", disallow: "/" }] };
  }

  return {
    rules: [{ userAgent: "*", allow: "/" }],
    sitemap: `${SITE.url}/sitemap.xml`,
    host: SITE.url,
  };
}
