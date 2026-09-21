"use client";

import { useEffect, useRef, useState } from "react";
import { HUBS } from "@/lib/hubs";
import { PROJECTS } from "@/lib/projects";
import { SERVICES } from "@/lib/services";
import { useLocale } from "./LocaleProvider";
import { useSite } from "./SiteProvider";
import styles from "./Hero.module.css";

/*
 * Counted off the same arrays the rest of the page renders, so a visitor can
 * check every one of them on this page: the products are linkable, the
 * practices are listed under Services, and the regions are the pins on the
 * map. TrustedBy derives the same three from the same source — they agree by
 * construction rather than by somebody remembering to update both.
 *
 * No `+` and no `/7`. A suffix on a derived count turns it back into a claim.
 */
const STATS = [
  { value: PROJECTS.length, label: ["Products", "Live"] },
  { value: SERVICES.length, label: ["Practices", "End to end"] },
  { value: HUBS.length, label: ["Regions", "Covered"] },
] as const;

const TARGETS = STATS.map((s) => s.value);
const LABELS = STATS.map((s) => s.label);

const DURATION = 1700;

export function Counters() {
  const { t } = useLocale();
  const { motion } = useSite();
  const ref = useRef<HTMLDivElement | null>(null);
  const [counts, setCounts] = useState<number[]>(motion ? TARGETS.map(() => 0) : [...TARGETS]);

  useEffect(() => {
    if (!motion) {
      setCounts([...TARGETS]);
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
        setCounts(TARGETS.map((t) => Math.round(t * e)));
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
          <div className={styles.statValue}>{counts[i] ?? 0}</div>
          <div className={styles.statLabel}>
            {t(a)}
            <br />
            {t(b)}
          </div>
        </div>
      ))}
    </div>
  );
}
