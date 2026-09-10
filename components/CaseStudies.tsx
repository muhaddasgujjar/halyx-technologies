"use client";

import Image from "next/image";
import { PROJECTS } from "@/lib/projects";
import { useLocale } from "./LocaleProvider";
import { Reveal, RevealScope } from "./Reveal";
import { useSite } from "./SiteProvider";
import styles from "./CaseStudies.module.css";

export function CaseStudies() {
  const { openCase } = useSite();
  const { t } = useLocale();

  // Rendered twice so the -50% marquee loop is seamless.
  const marqueeItems = [...PROJECTS, ...PROJECTS];

  return (
    <RevealScope variant="rise">
      <section id="work" data-casestudies="1" className={styles.section}>
        <div className={styles.inner}>
          <Reveal className={styles.header}>
            <div>
              <h2 className={styles.h2}>{t("Case Studies")}</h2>
              <p className={`${styles.eyebrow} hx-mono`}>
                SHIPPED FOR TEAMS IN SOUTH ASIA, AFRICA AND EUROPE
              </p>
            </div>
            <p className={styles.intro}>
              Every project below is live. Open one for the problem, what we built, and the deployed
              URL you can use right now.
            </p>
          </Reveal>

          <div className={styles.grid}>
            <Reveal delay={80} className={styles.list}>
              {PROJECTS.map((p, i) => (
                <button
                  key={p.name}
                  type="button"
                  className={styles.row}
                  onClick={() => openCase(i)}
                  aria-label={`${t("Open case study")}: ${p.name}`}
                >
                  <span className={`${styles.rowNum} hx-mono`}>
                    {String(i + 1).padStart(2, "0")}
                  </span>
                  <span className={styles.rowMain}>
                    <span className={styles.rowTitleLine}>
                      <span className={styles.dot} aria-hidden="true" />
                      <span className={styles.rowName}>{p.name}</span>
                    </span>
                    <span className={styles.rowCat}>{t(p.cat)}</span>
                  </span>
                  <span className={styles.rowArrow} aria-hidden="true">
                    &#8599;
                  </span>
                </button>
              ))}
              <div className={`${styles.listFoot} hx-mono`}>
                FIVE LIVE DEPLOYMENTS &middot; TAP A ROW FOR THE FULL CASE
              </div>
            </Reveal>

            <Reveal delay={160} className={styles.marqueeViewport}>
              <div className={styles.track}>
                {marqueeItems.map((p, i) => (
                  <button
                    key={`${p.name}-${i}`}
                    type="button"
                    className={styles.card}
                    onClick={() => openCase(i % PROJECTS.length)}
                    // The duplicate half is decoration; keep it out of the tab order.
                    tabIndex={i >= PROJECTS.length ? -1 : undefined}
                    aria-hidden={i >= PROJECTS.length}
                    /*
                     * `tabIndex={-1}` keeps the duplicates off the tab route but a
                     * mouse click focuses a button anyway — which would park focus
                     * inside an `aria-hidden` subtree and get the same rebuke from
                     * the browser that the modals used to. Suppressing the default
                     * on mousedown keeps them clickable without focusing them; the
                     * real copy of every card is still reachable by keyboard.
                     */
                    onMouseDown={
                      i >= PROJECTS.length ? (e) => e.preventDefault() : undefined
                    }
                  >
                    <span className={styles.shot}>
                      <Image
                        src={p.img}
                        alt={p.name}
                        fill
                        sizes="(max-width: 720px) 100vw, 520px"
                        loading="lazy"
                      />
                      <span className={styles.scrim} aria-hidden="true" />
                      <span className={`${styles.host} hx-mono`}>{p.host}</span>
                    </span>
                    <span className={styles.cardBody} style={{ display: "block" }}>
                      <span className={styles.cardName} style={{ display: "block" }}>
                        {p.name}
                      </span>
                      <span className={styles.cardCat} style={{ display: "block" }}>
                        {t(p.cat)}
                      </span>
                      <span
                        className={`${styles.cardNote} hx-mono`}
                        style={{ display: "block" }}
                      >
                        {t(p.note)}
                      </span>
                    </span>
                  </button>
                ))}
              </div>
            </Reveal>
          </div>
        </div>
      </section>
    </RevealScope>
  );
}
