"use client";

import Image from "next/image";
import { useState } from "react";
import { TEAM } from "@/lib/content";
import { useLocale } from "./LocaleProvider";
import { Reveal, RevealScope } from "./Reveal";
import styles from "./Team.module.css";

const DELAYS = [60, 140, 220];

/**
 * Each card slides its bio up over the portrait on hover. A touchscreen has no
 * hover, which made the bios — the only real content in this section — reachable
 * on a desktop and nowhere else.
 *
 * The fix is a transparent button filling the card, so the whole portrait is the
 * toggle. Pointer devices keep the hover reveal (it is a CSS `:hover` rule and is
 * untouched); touch devices get a tap. One card is open at a time, matching the
 * Highlights and Beliefs sections.
 */
export function Team() {
  const [open, setOpen] = useState(-1);
  const { t } = useLocale();

  return (
    <RevealScope variant="rise">
      {/* `#team` — the anchor the assistant cites when asked who runs Halyx. */}
      <section id="team" className={styles.section}>
        <div className={styles.inner}>
          <Reveal as="h2" className={styles.h2}>
            {t("Meet the Team")}
            <br />
            {t("Behind Halyx")}
          </Reveal>

          <div className={styles.grid}>
            {TEAM.map((m, i) => (
              <Reveal
                key={m.title}
                delay={DELAYS[i]}
                className={styles.card}
                dataOpen={open === i}
              >
                {m.img ? (
                  <div className={styles.photo}>
                    <Image
                      src={m.img}
                      alt={`${m.name}, ${m.title} at Halyx Technologies`}
                      fill
                      sizes="(max-width: 700px) 100vw, (max-width: 1180px) 50vw, 360px"
                      // Three portraits above the fold of their own section, and
                      // the first is the one most visitors see.
                      priority={i === 0}
                      style={m.focus ? { objectPosition: m.focus } : undefined}
                    />
                  </div>
                ) : (
                  <div className={`${styles.placeholder} hx-mono`}>portrait</div>
                )}

                <div className={styles.scrim} aria-hidden="true" />

                <button
                  type="button"
                  className={styles.toggle}
                  onClick={() => setOpen((v) => (v === i ? -1 : i))}
                  aria-expanded={open === i}
                  aria-label={`${open === i ? t("Hide") : t("Show")} bio for ${m.name}, ${t(m.title)}`}
                />

                <div className={styles.base}>
                  <div className={styles.name}>{m.name}</div>
                  <div className={styles.title}>{t(m.title)}</div>
                </div>

                <div className={styles.detail}>
                  <div className={`${styles.tag} hx-mono`}>{m.tag}</div>
                  <div className={styles.name}>{m.name}</div>
                  <p className={styles.bio}>{t(m.bio)}</p>
                  {m.linkedin ? (
                    <a
                      href={m.linkedin}
                      className={styles.social}
                      target="_blank"
                      rel="noopener noreferrer"
                      aria-label={`${m.name} on LinkedIn`}
                    >
                      in
                    </a>
                  ) : (
                    <a href="#contact" className={styles.social} aria-label={`Contact ${m.name}`}>
                      in
                    </a>
                  )}
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>
    </RevealScope>
  );
}
