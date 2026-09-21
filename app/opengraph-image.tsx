import { ImageResponse } from "next/og";
import { SITE } from "@/lib/site";

/**
 * The preview card every shared link renders as.
 *
 * Generated from JSX at build time rather than committed as a binary, so it
 * stays in the same palette as the site and a rebrand does not leave a stale
 * PNG behind. Next wires `og:image` and `twitter:image` from this file's
 * existence — there is nothing to add to the metadata export.
 *
 * Deliberately a linear gradient, not radial: Satori renders a radial one in
 * visible bands at this size.
 */
export const alt = `${SITE.name} — ${SITE.tagline}`;
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function OpengraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          background: "linear-gradient(135deg, #0b0b12 0%, #060608 55%, #15122b 100%)",
          padding: "72px 80px",
        }}
      >
        {/* Eyebrow, matching the mono labels used across the site. */}
        <div
          style={{
            display: "flex",
            fontSize: 22,
            letterSpacing: 6,
            color: "#8f83ef",
            textTransform: "uppercase",
          }}
        >
          Applied AI Studio
        </div>

        <div style={{ display: "flex", flexDirection: "column" }}>
          <div
            style={{
              display: "flex",
              fontSize: 76,
              lineHeight: 1.08,
              color: "#ffffff",
              letterSpacing: -2,
              maxWidth: 900,
            }}
          >
            {SITE.tagline}
          </div>
          <div
            style={{
              display: "flex",
              marginTop: 28,
              fontSize: 27,
              color: "#9a9aa6",
              maxWidth: 820,
            }}
          >
            AI systems, custom software, and products that ship and hold up in production.
          </div>
        </div>

        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div
            style={{
              display: "flex",
              fontSize: 40,
              letterSpacing: 10,
              color: "#e8e8ef",
              fontWeight: 600,
            }}
          >
            HALYX
          </div>
          <div style={{ display: "flex", fontSize: 24, color: "#6f6f7d" }}>
            halyxtechnologies.com
          </div>
        </div>
      </div>
    ),
    size,
  );
}
