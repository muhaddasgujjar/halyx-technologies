"use client";

import { Reveal, RevealScope } from "./Reveal";
import { useSite } from "./SiteProvider";
import styles from "./ClosingCTA.module.css";

export function ClosingCTA() {
  // The canvas is driven by the page's single rAF loop in <ParticleCanvas>.
  const { ctaCanvasRef } = useSite();

  return (
    <RevealScope variant="rise">
      <section id="contact" className={styles.section}>
        <div className={styles.glow} aria-hidden="true" />

        <Reveal className={styles.panel}>
          <div>
            <h2 className={styles.h2}>
              We turn bold ideas into
              <br />
              powerful digital realities.
            </h2>
            <a href="#contact" className={styles.cta}>
              Let&rsquo;s work together &#8594;
            </a>
          </div>

          <div className={styles.canvasWrap}>
            <canvas ref={ctaCanvasRef} className={styles.canvas} aria-hidden="true" />
          </div>
        </Reveal>
      </section>
    </RevealScope>
  );
}
