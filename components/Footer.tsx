"use client";

import { SITE_CONFIG } from "@/lib/config";
import { LOCATION, SITE, SOCIAL_LINKS } from "@/lib/site";
import { FOOTER_COLUMNS } from "@/lib/content";
import { useLocale } from "./LocaleProvider";
import { Reveal } from "./Reveal";
import { ScrollTopButton } from "./ScrollTopButton";
import styles from "./Footer.module.css";

const WORDMARK = ["H", "A", "L", "Y", "X"];

export function Footer() {
  const { t } = useLocale();

  return (
    <footer className={styles.footer}>
      <div className={styles.inner}>
        <div className={styles.columns}>
          {FOOTER_COLUMNS.map((col) => (
            <div key={col.label}>
              <div className={`${styles.colLabel} hx-mono`}>{t(col.label)}</div>
              <div className={styles.colLinks}>
                {col.links.map((l) => (
                  <a key={l.text} href={l.href} className={styles.link}>
                    {t(l.text)}
                  </a>
                ))}
              </div>
            </div>
          ))}

          <div>
            <div className={styles.touchHead}>
              <div className={`${styles.colLabel} hx-mono`} style={{ marginBottom: 0 }}>
                {t("GET IN TOUCH")}
              </div>
              <a href="/#contact" className={styles.bookCall}>
                {t("Book a call")} &#8599;
              </a>
            </div>
            <a href="/#contact" className={styles.link}>
              {t("Start a conversation")}
            </a>

            {/*
              The studio's location, in text, on every page.
              Until this existed the word "Lahore" appeared nowhere a crawler
              could weigh it — only inside the JSON-LD — so a search for the
              studio by name and city had nothing to match. Schema alone does
              not carry a location query; the visible NAP block does.

              `address` is the correct element even without a street line, and
              it is not italic here because the reset handles that.
            */}
            <address className={styles.address}>
              <div className={`${styles.colLabel} hx-mono ${styles.followLabel}`}>
                {t("STUDIO")}
              </div>
              <div className={styles.addressLine}>
                {LOCATION.city}, {LOCATION.region}
                <br />
                {LOCATION.country}
              </div>
              <a href={`mailto:${SITE.email}`} className={styles.addressMail}>
                {SITE.email}
              </a>
            </address>

            <div className={`${styles.colLabel} hx-mono ${styles.followLabel}`}>
              {t("FOLLOW")}
            </div>
            <ul className={styles.socials}>
              {SOCIAL_LINKS.map((s) => (
                <li key={s.name}>
                  <a
                    href={s.url}
                    className={styles.social}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    {s.name}
                  </a>
                </li>
              ))}
            </ul>
          </div>
        </div>

        <div className={styles.divider} aria-hidden="true" />

        {SITE_CONFIG.showFooterWordmark && (
          <div className={styles.wordmark} role="img" aria-label="HALYX">
            {/*
              Keyed on position, not on the letter. A wordmark is a fixed
              sequence, so the index *is* the identity — and keying on the
              character breaks the day the wordmark contains the same letter
              twice, which is one rename away.
            */}
            {WORDMARK.map((ch, i) => (
              <Reveal
                key={i}
                as="span"
                variant="letter"
                delay={i * 130}
                className={styles.letter}
              >
                {ch}
              </Reveal>
            ))}
          </div>
        )}

        <div className={styles.bottom}>
          <div>2026 Halyx Technologies. {t("All rights reserved.")}</div>
          <div className={styles.legal}>
            <a href="/privacy" className={styles.legalLink}>
              {t("Privacy Policy")}
            </a>
            <a href="/terms" className={styles.legalLink}>
              {t("Terms & Conditions")}
            </a>
          </div>
          <ScrollTopButton />
        </div>
      </div>
    </footer>
  );
}
