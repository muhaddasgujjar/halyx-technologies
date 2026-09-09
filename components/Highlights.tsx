"use client";

import { useState } from "react";
import { HIGHLIGHTS } from "@/lib/content";
import { Reveal, RevealScope } from "./Reveal";
import styles from "./Highlights.module.css";

const DELAYS = [60, 150, 240];

export function Highlights() {
  // One card open at a time; -1 means all closed.
  const [open, setOpen] = useState(-1);

  return (
    <RevealScope variant="tilt">
      <section className={styles.section}>
        <div className={styles.inner}>
          <Reveal className={styles.header}>
            <h2 className={styles.h2}>Key highlights</h2>
            <p className={`${styles.hint} hx-mono`}>TAP A CARD TO EXPAND</p>
          </Reveal>

          <div className={styles.grid}>
            {HIGHLIGHTS.map((h, i) => (
              <Reveal key={h.title} delay={DELAYS[i]}>
                <button
                  type="button"
                  className={styles.card}
                  data-open={open === i}
                  aria-expanded={open === i}
                  onClick={() => setOpen((v) => (v === i ? -1 : i))}
                >
                  <span className={styles.shine} aria-hidden="true" />

                  <span className={styles.cardTop}>
                    <span className={styles.metric}>{h.metric}</span>
                    <span className={`${styles.metricLabel} hx-mono`}>{h.metricLabel}</span>
                  </span>

                  <span className={styles.cardBody}>
                    <span className={styles.cardTitle} style={{ display: "block" }}>
                      {h.title}
                    </span>
                    <span className={styles.cardBlurb} style={{ display: "block" }}>
                      {h.blurb}
                    </span>
                    <span className={styles.cardMore} style={{ display: "block" }}>
                      <span className={styles.cardMoreText}>{h.more}</span>
                    </span>
                    <span className={`${styles.cardCta} hx-mono`} style={{ display: "block" }}>
                      {open === i ? "CLOSE \u2212" : "READ MORE +"}
                    </span>
                  </span>
                </button>
              </Reveal>
            ))}
          </div>
        </div>
      </section>
    </RevealScope>
  );
}
