import { SITE_CONFIG } from "@/lib/config";
import { FOOTER_COLUMNS } from "@/lib/content";
import { Reveal } from "./Reveal";
import { ScrollTopButton } from "./ScrollTopButton";
import styles from "./Footer.module.css";

const WORDMARK = ["H", "A", "L", "Y", "X"];

export function Footer() {
  return (
    <footer className={styles.footer}>
      <div className={styles.inner}>
        <div className={styles.columns}>
          {FOOTER_COLUMNS.map((col) => (
            <div key={col.label}>
              <div className={`${styles.colLabel} hx-mono`}>{col.label}</div>
              <div className={styles.colLinks}>
                {col.links.map((l) => (
                  <a key={l.text} href={l.href} className={styles.link}>
                    {l.text}
                  </a>
                ))}
              </div>
            </div>
          ))}

          <div>
            <div className={styles.touchHead}>
              <div className={`${styles.colLabel} hx-mono`} style={{ marginBottom: 0 }}>
                GET IN TOUCH
              </div>
              <a href="#contact" className={styles.bookCall}>
                Book a call &#8599;
              </a>
            </div>
            <a href="#contact" className={styles.link}>
              Start a conversation
            </a>
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
          <div>2026 Halyx Technologies. All rights reserved.</div>
          <div className={styles.legal}>
            <a href="#contact" className={styles.legalLink}>
              Privacy Policy
            </a>
            <a href="#contact" className={styles.legalLink}>
              Terms &amp; Conditions
            </a>
          </div>
          <ScrollTopButton />
        </div>
      </div>
    </footer>
  );
}
