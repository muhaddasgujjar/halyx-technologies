"use client";

import Image from "next/image";
import { useEffect, useRef } from "react";
import { PROJECTS } from "@/lib/projects";
import { useLocale } from "@/components/LocaleProvider";
import { useSite } from "@/components/SiteProvider";
import shell from "./Modal.module.css";
import styles from "./CaseModal.module.css";

/**
 * Opened from either case-study column; backdrop click or Escape closes it.
 *
 * The overlay is kept mounted and hidden rather than unmounted, so it can
 * transition. That means its buttons stay in the DOM while it is shut, and
 * `aria-hidden` alone was the wrong way to hide them: clicking Close leaves
 * focus *on* the close button, and the very next render puts `aria-hidden` on
 * an ancestor of the focused element. Chrome refuses that outright —
 * "Blocked aria-hidden on an element because its descendant retained focus" —
 * and the dialog stays exposed to assistive technology.
 *
 * `inert` is the fix the spec points at: it hides the subtree from the
 * accessibility tree *and* makes it unfocusable, and the browser moves focus
 * out on its own instead of blocking. Where that focus lands is handled by
 * <SiteProvider>, which returns it to whatever opened the modal.
 */
export function CaseModal() {
  const { caseIdx, closeCase } = useSite();
  const { t } = useLocale();
  const open = caseIdx >= 0;
  const p = PROJECTS[Math.max(0, caseIdx)];
  const closeRef = useRef<HTMLButtonElement | null>(null);

  // Move focus into the dialog when it opens, so the keyboard is not left
  // behind the overlay on the row that opened it.
  useEffect(() => {
    if (open) closeRef.current?.focus({ preventScroll: true });
  }, [open]);

  return (
    <div
      className={`${shell.overlay} ${styles.overlay}`}
      data-open={open}
      role="dialog"
      aria-modal="true"
      aria-label={open ? `${p.name} case study` : undefined}
      inert={!open}
    >
      <button
        type="button"
        className={`${shell.backdrop} ${styles.backdrop}`}
        onClick={closeCase}
        aria-label="Close"
        tabIndex={-1}
      />

      <div className={`${shell.panelBorder} ${styles.panelBorder}`}>
        <div className={shell.panel}>
          <div className={styles.header}>
            <span className={styles.liveDot} aria-hidden="true" />

            <div className={styles.headMain}>
              <div className={`${styles.live} hx-mono`}>LIVE &middot; {p.host}</div>
              <h3 className={styles.name}>{p.name}</h3>
              <div className={styles.cat}>{t(p.cat)}</div>
              <div className={styles.tags}>
                {p.tags.map((tag) => (
                  <span key={tag} className={styles.tag}>
                    {t(tag)}
                  </span>
                ))}
              </div>
            </div>

            <button
              ref={closeRef}
              type="button"
              className={`${shell.close} ${styles.close}`}
              onClick={closeCase}
              aria-label="Close"
            >
              &times;
            </button>
          </div>

          <div className={styles.body}>
            <div className={styles.hero}>
              {/* Only mounted while open, so the modal costs nothing at rest. */}
              {open && (
                <Image src={p.img} alt={p.name} fill sizes="(max-width: 720px) 100vw, 680px" />
              )}
            </div>

            <div className={styles.block}>
              <div className={`${styles.blockLabel} hx-mono`}>{t("PROBLEM")}</div>
              <p className={styles.blockText}>{t(p.problem)}</p>
            </div>

            <div className={styles.block}>
              <div className={`${styles.blockLabel} hx-mono`}>{t("SOLUTION")}</div>
              <p className={styles.blockText}>{t(p.solution)}</p>

              <div className={styles.facts}>
                {p.facts.map(([k, v]) => (
                  <div key={k} className={styles.fact}>
                    <div className={styles.factKey}>{t(k)}</div>
                    <div className={styles.factValue}>{t(v)}</div>
                  </div>
                ))}
              </div>
            </div>

            <div className={styles.linkRow}>
              <a href={p.url} target="_blank" rel="noopener noreferrer" className={styles.liveLink}>
                {t("Open the live product")}
                <span aria-hidden="true" style={{ fontSize: 13 }}>
                  &#8599;
                </span>
              </a>
              <span className={`${styles.url} hx-mono`}>{p.url}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
