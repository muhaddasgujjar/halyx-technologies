"use client";

import { SITE_CONFIG } from "@/lib/config";
import { Reveal, RevealScope } from "./Reveal";
import { useSite } from "./SiteProvider";
import { Counters } from "./Counters";
import styles from "./Hero.module.css";

/**
 * Four glass pills float around the headline, each on its own drift cycle with
 * a staggered reveal. Their positions intentionally overlap the giant
 * watermark — that layering is the design, not a collision.
 */
const PILLS = [
  { label: "UI/UX", pos: { left: "2%", top: "4%" }, float: "hx-float-a 7s ease-in-out infinite", delay: 160, mark: "square" },
  { label: "Development", pos: { right: "2%", top: "9%" }, float: "hx-float-b 8.4s ease-in-out infinite", delay: 240, mark: "ring" },
  { label: "Branding", pos: { left: "6%", bottom: "6%" }, float: "hx-float-c 9.2s ease-in-out infinite", delay: 320, mark: "diamond" },
  { label: "3D Animation", pos: { right: "5%", bottom: "2%" }, float: "hx-float-d 7.8s ease-in-out infinite", delay: 400, mark: "bars" },
] as const;

function Mark({ kind }: { kind: (typeof PILLS)[number]["mark"] }) {
  if (kind === "square") return <span className={styles.markSquare} />;
  if (kind === "ring") return <span className={styles.markRing} />;
  if (kind === "diamond") return <span className={styles.markDiamond} />;
  return (
    <span className={styles.markBars}>
      <span />
      <span />
      <span />
    </span>
  );
}

export function Hero() {
  const { heroDockRef } = useSite();

  return (
    <RevealScope variant="mask">
      <section className={styles.hero}>
        <div className={styles.glowA} aria-hidden="true" />
        <div className={styles.glowB} aria-hidden="true" />
        <div className={styles.watermark} aria-hidden="true">
          HALYX TECHNOLOGIES
        </div>

        <div className={styles.inner}>
          <div className={styles.stage}>
            <div ref={heroDockRef} className={styles.dock} aria-hidden="true" />

            {PILLS.map((p) => (
              <Reveal key={p.label} delay={p.delay} className={styles.pillSlot} style={p.pos}>
                <div className={styles.pill} style={{ animation: p.float }}>
                  <Mark kind={p.mark} />
                  <span className={styles.pillLabel}>{p.label}</span>
                </div>
              </Reveal>
            ))}

            <Reveal className={styles.headline}>
              <h1 className={styles.h1}>
                We Build <strong>Intelligent Systems</strong>
                <br />
                That Matter
              </h1>
              <p className={styles.sub}>
                Because lasting systems aren&rsquo;t built by chance &mdash;
                <br />
                <span className={styles.subDim}>they&rsquo;re engineered with purpose.</span>
              </p>
            </Reveal>
          </div>

          <div className={styles.bottomRow}>
            <Reveal delay={120} className={styles.ctaWrap}>
              <a href="#contact" className={styles.cta}>
                Start Your Project
              </a>
            </Reveal>

            {SITE_CONFIG.showHeroStats && (
              <Reveal delay={220}>
                <Counters />
              </Reveal>
            )}
          </div>
        </div>
      </section>
    </RevealScope>
  );
}
