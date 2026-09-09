"use client";

import { useEffect, useRef, useState } from "react";
import { COUNTER_TARGETS } from "@/lib/config";
import { useSite } from "./SiteProvider";
import styles from "./Hero.module.css";

const LABELS = [
  ["Products", "Shipped"],
  ["Industries", "Served"],
  ["Support", "Coverage"],
] as const;

/** `60+`, `12`, `24/7` — the suffixes are part of the design, not the data. */
function format(value: number, i: number) {
  if (i === 0) return `${value}+`;
  if (i === 2) return `${value}/7`;
  return String(value);
}

const DURATION = 1700;

export function Counters() {
  const { motion } = useSite();
  const ref = useRef<HTMLDivElement | null>(null);
  const [counts, setCounts] = useState<number[]>(motion ? [0, 0, 0] : [...COUNTER_TARGETS]);

  useEffect(() => {
    if (!motion) {
      setCounts([...COUNTER_TARGETS]);
      return;
    }

    const el = ref.current;
    if (!el) return;

    let raf = 0;
    let running = false;

    const run = () => {
      if (running) return;
      running = true;
      const t0 = performance.now();
      const step = () => {
        const p = Math.min(1, (performance.now() - t0) / DURATION);
        const e = 1 - Math.pow(1 - p, 3);
        setCounts(COUNTER_TARGETS.map((t) => Math.round(t * e)));
        if (p < 1) raf = requestAnimationFrame(step);
        else running = false;
      };
      step();
    };

    // Re-arms every time the row leaves and re-enters the viewport.
    const io = new IntersectionObserver(
      (entries) => {
        for (const en of entries) {
          if (en.isIntersecting) {
            run();
          } else {
            cancelAnimationFrame(raf);
            running = false;
            setCounts([0, 0, 0]);
          }
        }
      },
      { threshold: 0.3 },
    );
    io.observe(el);

    // Already in view on load — don't wait for the observer's first callback.
    const r = el.getBoundingClientRect();
    const vh = window.innerHeight || 800;
    if (r.top < vh * 0.92 && r.bottom > 0) run();

    return () => {
      io.disconnect();
      cancelAnimationFrame(raf);
    };
  }, [motion]);

  return (
    <div ref={ref} className={styles.stats} data-counters="1">
      {LABELS.map(([a, b], i) => (
        <div key={a} className={styles.stat}>
          <div className={styles.statValue}>{format(counts[i] ?? 0, i)}</div>
          <div className={styles.statLabel}>
            {a}
            <br />
            {b}
          </div>
        </div>
      ))}
    </div>
  );
}
