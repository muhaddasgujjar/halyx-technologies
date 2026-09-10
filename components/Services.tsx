"use client";

import { SERVICES } from "@/lib/services";
import { useLocale } from "./LocaleProvider";
import { Reveal, RevealScope } from "./Reveal";
import { useSite } from "./SiteProvider";
import styles from "./Services.module.css";

/**
 * Five practices in one expanding row. Hovering or clicking a card selects it;
 * the selection also decides which glyph the backdrop particle cloud assembles
 * into, which is why `svc` lives in the site store rather than here.
 */
export function Services() {
  const { svc, setSvc, pauseCarousel, resumeCarousel, svcDockRef } = useSite();
  const { t } = useLocale();

  return (
    <RevealScope variant="slideL">
      <section id="services" className={styles.section}>
        <div className={styles.glow} aria-hidden="true" />

        <div className={styles.grid}>
          <div className={styles.visual}>
            <div ref={svcDockRef} className={styles.dock} aria-hidden="true" />
          </div>

          <div className={styles.body}>
            <Reveal className={styles.header}>
              <h2 className={styles.h2}>{t("Our Services")}</h2>
              <p className={styles.intro}>
                {t(
                  "End-to-end digital solutions that turn technology into measurable results across every part of your business.",
                )}
              </p>
            </Reveal>

            <Reveal
              delay={120}
              className={styles.row}
              // Taking over with the pointer stops the auto-advance.
              onMouseEnter={pauseCarousel}
              onMouseLeave={resumeCarousel}
            >
              {SERVICES.map((s, i) => (
                <button
                  key={s.title}
                  type="button"
                  className={styles.card}
                  data-active={i === svc}
                  aria-expanded={i === svc}
                  onMouseEnter={() => setSvc(i)}
                  onFocus={() => setSvc(i)}
                  onClick={() => setSvc(i)}
                >
                  <span className={styles.cardTint} aria-hidden="true" />
                  <span className={styles.cardDots} aria-hidden="true" />

                  <span className={styles.cardInner}>
                    <span className={styles.cardTop}>
                      <span className={`${styles.cardNum} hx-mono`}>{s.num}</span>
                      <span className={styles.cardArrow} aria-hidden="true">
                        &#8599;
                      </span>
                    </span>

                    <span>
                      <span className={styles.cardTitle} style={{ display: "block" }}>
                        {t(s.title)}
                      </span>
                      <span className={styles.cardDetail} style={{ display: "block" }}>
                        <span className={styles.cardBlurb} style={{ display: "block" }}>
                          {t(s.blurb)}
                        </span>
                        <span className={styles.cardLists} style={{ display: "grid" }}>
                          <span>
                            <span className={`${styles.listLabel} hx-mono`} style={{ display: "block" }}>
                              {t("SERVICES")}
                            </span>
                            {s.services.map((item) => (
                              <span key={item} style={{ display: "block" }}>
                                {t(item)}
                              </span>
                            ))}
                          </span>
                          <span>
                            <span className={`${styles.listLabel} hx-mono`} style={{ display: "block" }}>
                              {t("STACK")}
                            </span>
                            {s.stack.map((item) => (
                              <span key={item} style={{ display: "block" }}>
                                {item}
                              </span>
                            ))}
                          </span>
                        </span>
                      </span>
                    </span>
                  </span>
                </button>
              ))}
            </Reveal>
          </div>
        </div>
      </section>
    </RevealScope>
  );
}
