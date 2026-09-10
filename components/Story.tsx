"use client";

import { useLocale } from "./LocaleProvider";
import { Reveal, RevealScope } from "./Reveal";
import { DottedMap } from "./DottedMap";
import styles from "./Story.module.css";

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
