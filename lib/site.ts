/**
 * Canonical site identity, in one place.
 *
 * The URL matters at deploy time: metadata, `robots.txt`, the sitemap and the
 * JSON-LD all derive from it. Hardcoding the production domain would make every
 * preview deployment claim to be `halyx.tech`, which is how duplicate-content
 * and mis-indexing problems start.
 *
 * Resolution order:
 *   1. `NEXT_PUBLIC_SITE_URL` — set this to the real domain in production.
 *   2. `VERCEL_PROJECT_PRODUCTION_URL` / `VERCEL_URL` — set automatically, so
 *      preview builds describe themselves correctly with no configuration.
 *   3. localhost, for `next dev`.
 */
function resolveSiteUrl(): string {
  const explicit = process.env.NEXT_PUBLIC_SITE_URL;
  if (explicit) return explicit.replace(/\/$/, "");

  const vercelProd = process.env.VERCEL_PROJECT_PRODUCTION_URL;
  if (vercelProd) return `https://${vercelProd}`;

  const vercelPreview = process.env.VERCEL_URL;
  if (vercelPreview) return `https://${vercelPreview}`;

  return "http://localhost:3000";
}

export const SITE = {
  name: "Halyx Technologies",
  url: resolveSiteUrl(),
  email: "halyxtechnologies@gmail.com",
  tagline: "We Build Intelligent Systems That Matter",
  description:
    "Halyx Technologies is an applied-AI and product-engineering studio. We build AI systems, custom software, and web and mobile products that ship, scale, and hold up in production.",
} as const;

/** Only index the real production domain — never a preview URL. */
export const IS_INDEXABLE =
  Boolean(process.env.NEXT_PUBLIC_SITE_URL) && process.env.VERCEL_ENV !== "preview";
