import type { NextConfig } from "next";

/**
 * Security headers.
 *
 * No CSP here on purpose: the page carries inline `style` attributes and an
 * inline JSON-LD script, so a meaningful CSP needs nonces wired through a
 * middleware. Worth doing, but it is a deliberate piece of work rather than a
 * one-liner — these headers are the safe, high-value subset that costs nothing.
 */
const securityHeaders = [
  // Don't let the site be framed — clickjacking.
  { key: "X-Frame-Options", value: "SAMEORIGIN" },
  // Don't let browsers sniff a response into a different content type.
  { key: "X-Content-Type-Options", value: "nosniff" },
  // Send the origin to other sites, the full URL to our own.
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  // The voice agent asks for the microphone, so it is allowlisted for this
  // document. Everything not in the list stays denied — that is the point of
  // the header.
  { key: "Permissions-Policy", value: "microphone=(self), camera=(), geolocation=(), interest-cohort=()" },
  // Preload is intentionally omitted until the domain is confirmed HTTPS-only.
  { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains" },
];

const nextConfig: NextConfig = {
  reactStrictMode: true,
  // Don't advertise the framework version.
  poweredByHeader: false,
  // Trailing-slash variants would split SEO signals.
  trailingSlash: false,

  images: {
    // The case-study screenshots are the heaviest payload on the page.
    formats: ["image/avif", "image/webp"],
    minimumCacheTTL: 60 * 60 * 24 * 30,
  },

  async headers() {
    return [
      { source: "/:path*", headers: securityHeaders },
      {
        // The world atlas is content-addressed by name and never changes.
        source: "/media/countries-110m.json",
        headers: [{ key: "Cache-Control", value: "public, max-age=31536000, immutable" }],
      },
    ];
  },
};

export default nextConfig;
