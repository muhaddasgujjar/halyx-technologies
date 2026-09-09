"use client";

import { useState } from "react";
import { BELIEFS } from "@/lib/content";
import { Reveal, RevealScope } from "./Reveal";
import styles from "./Beliefs.module.css";

const DELAYS = [120, 190, 260, 330];

/** Four principles that decide what Halyx takes on and how it runs it. */
export function Beliefs() {
  const [open, setOpen] = useState(-1);

  return (
    <RevealScope variant="rise">
      <section id="halyx-ai" className={styles.section}>
        <div className={styles.glow} aria-hidden="true" />

        <div className={styles.inner}>
          <Reveal className={styles.header}>
            <div className={`${styles.badge} hx-mono`}>
              <span className={styles.badgeDot} aria-hidden="true" />
              CORE BELIEFS
            </div>
            <h2 className={styles.h2}>How We Think</h2>
            <p className={styles.intro}>
              We don&rsquo;t just build products &mdash; we build momentum. Four principles decide
              what we take on and how we run it.
            </p>
          </Reveal>

          <div className={styles.list}>
            {BELIEFS.map((b, i) => (
              <Reveal
                key={b.num}
                delay={DELAYS[i]}
                className={styles.row}
                dataOpen={open === i}
                onMouseEnter={() => setOpen(i)}
                onMouseLeave={() => setOpen(-1)}
              >
                <span className={`${styles.num} hx-mono`}>{b.num}</span>
                <div className={styles.rowBody}>
                  <p className={styles.lead}>
                    {b.lead}
                    {b.trail ? <span className={styles.trail}> {b.trail}</span> : null}
                  </p>
                  <div className={styles.more}>
                    <p>{b.more}</p>
                  </div>
                </div>
                <span className={styles.arrow} aria-hidden="true">
                  &#8599;
                </span>
              </Reveal>
            ))}
          </div>
        </div>
      </section>
    </RevealScope>
  );
}
