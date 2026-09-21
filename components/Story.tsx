"use client";

import dynamic from "next/dynamic";
import { useLocale } from "./LocaleProvider";
import { Reveal, RevealScope } from "./Reveal";
import styles from "./Story.module.css";

/*
 * The map pulls in d3-geo, topojson-client and world-atlas — roughly a fifth
 * of the page's JavaScript, for a decorative element well below the fold that
 * cannot render on the server anyway (it rasterises countries to a dot grid
 * against a canvas). Loading it on demand keeps that weight out of the initial
 * bundle and off the critical path to LCP.
 *
 * `loading` reserves the panel's height so pulling it out of the main chunk
 * does not introduce the layout shift it was meant to avoid.
 */
const DottedMap = dynamic(() => import("./DottedMap").then((m) => m.DottedMap), {
  ssr: false,
  loading: () => <div className={styles.mapPlaceholder} aria-hidden="true" />,
});

export function Story() {
  const { t } = useLocale();

  return (
    <RevealScope variant="slideR">
      <section id="company" className={styles.section}>
        <div className={styles.inner}>
          <Reveal className={`${styles.eyebrow} hx-mono`}>{t("OUR STORY")}</Reveal>

          <div className={styles.grid}>
            <Reveal as="h2" delay={80} className={styles.h2}>
              {t(
                "Halyx Technologies operates at the intersection of applied AI and transformative product design.",
              )}
            </Reveal>

            <Reveal delay={140}>
              <p className={styles.body}>
                <span className={styles.bodyStrong}>
                  {t("Founded by engineers, designers, and operators")}
                </span>
                {t(
                  ", we started with one product and a small team. Today 200–500 people build AI systems for clients across four regions.",
                )}
              </p>
              <p className={`${styles.hint} hx-mono`}>
                <span className="hx-pointer-only">{t("HOVER THE MARKERS TO FOLLOW THE STORY")}</span>
                <span className="hx-touch-only">{t("TAP THE MARKERS TO FOLLOW THE STORY")}</span>
              </p>
            </Reveal>
          </div>

          <Reveal className={styles.mapPanel}>
            <DottedMap />
          </Reveal>
        </div>
      </section>
    </RevealScope>
  );
}
