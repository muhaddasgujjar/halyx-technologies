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

/**
 * Where the studio actually is, and who it sells to.
 *
 * Both matter to more than the footer. Google localises commercial results,
 * so an agency in Lahore and an agency in Chicago see different SERPs for the
 * same query — the location has to be stated for the local results it can win,
 * and `servesGlobally` is why the site is written in international English and
 * priced in no currency.
 *
 * `streetAddress` is deliberately absent. A Google Business Profile needs a
 * real, verifiable one and this is not the place to invent it; `addressLocality`
 * and `addressCountry` are true today and enough for the entity markup.
 */
export const LOCATION = {
  city: "Lahore",
  region: "Punjab",
  country: "Pakistan",
  /** ISO 3166-1 alpha-2, which is what schema.org and hreflang expect. */
  countryCode: "PK",
  /** Primary export markets, in the order they matter commercially. */
  servesGlobally: ["United States", "United Kingdom", "United Arab Emirates", "Saudi Arabia"],
} as const;

/**
 * The contracting entity, for the legal pages.
 *
 * Separate from `SITE.name` on purpose: the brand and the legal person are
 * usually different strings, and the pages that carry legal weight must name
 * the second one. Keeping them apart here means a future rename of one does
 * not silently rewrite the other.
 *
 * Still outstanding and deliberately not invented: the SECP incorporation
 * number and the registered office address. Both are usually expected on a
 * privacy policy, and a Google Business Profile needs the address anyway.
 */
export const LEGAL_ENTITY = {
  /** As confirmed by the company. Check this matches the SECP certificate exactly. */
  name: "Halyx Technologies",
  /** Governing law and the courts with jurisdiction. */
  jurisdiction: "Pakistan",
  courts: "Lahore, Punjab",
  registrar: "Securities and Exchange Commission of Pakistan (SECP)",
} as const;

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

/**
 * Public profiles, in display order.
 *
 * One list feeds all three consumers: the badges on the contact panel, the
 * footer row, and `sameAs` in the homepage JSON-LD — so a new account is one
 * entry here rather than three edits that drift apart.
 *
 * URLs are stored bare. The share links these came from carried session
 * parameters (`?viewAsMember`, `?stkn=…`) that are scoped to whoever copied
 * them and mean nothing to a visitor.
 */
export const SOCIAL_LINKS = [
  {
    /** The two-letter badge the contact panel renders. */
    badge: "in",
    name: "LinkedIn",
    url: "https://www.linkedin.com/company/halyx-technologies/",
  },
  { badge: "X", name: "X", url: "https://x.com/HalyxOfficial" },
  {
    badge: "IG",
    name: "Instagram",
    url: "https://www.instagram.com/halyxtechnologies_official",
  },
  { badge: "TT", name: "TikTok", url: "https://www.tiktok.com/@halyx.technologies" },
] as const;
