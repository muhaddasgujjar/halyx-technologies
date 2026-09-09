"use client";

import { useSite } from "@/components/SiteProvider";
import styles from "./ScrollToast.module.css";

/**
 * Fires once, on entering the Case Studies section, gated at ~20% page scroll.
 * The gate lives in the site store so portrait hover and chat opening can never
 * trigger it — that was a bug in an earlier revision and is now scoped.
 */
export function ScrollToast() {
  const { toast, closeToast, openBotFromToast } = useSite();

  return (
    <div className={styles.toast} data-open={toast} role="status" aria-live="polite">
      <div className={styles.card}>
        <div className={styles.shine} aria-hidden="true" />

        <div className={styles.body}>
          <div className={styles.head}>
            <span className={styles.iconTile} aria-hidden="true">
              <span className={styles.iconRing} />
              <span className={styles.glyph}>
                <i />
                <i />
                <i />
              </span>
            </span>

            <div className={styles.headText}>
              <div className={`${styles.eyebrow} hx-mono`}>HALYX &middot; CAPACITY UPDATE</div>
              <div className={styles.title}>Two engineers free this month</div>
            </div>

            <button
              type="button"
              className={styles.close}
              onClick={closeToast}
              aria-label="Dismiss"
            >
              &times;
            </button>
          </div>

          <p className={styles.copy}>
            Send a brief today and we scope it inside one business day.
          </p>

          <div className={styles.actions}>
            <a href="#contact" className={styles.primary} onClick={closeToast}>
              Start a project
            </a>
            <button type="button" className={styles.secondary} onClick={openBotFromToast}>
              Ask the assistant
            </button>
          </div>
        </div>

        <div className={styles.progress} aria-hidden="true">
          {toast && <div className={styles.progressBar} />}
        </div>
      </div>
    </div>
  );
}
