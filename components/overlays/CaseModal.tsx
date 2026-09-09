"use client";

import Image from "next/image";
import { PROJECTS } from "@/lib/projects";
import { useSite } from "@/components/SiteProvider";
import shell from "./Modal.module.css";
import styles from "./CaseModal.module.css";

/** Opened from either case-study column; backdrop click or Escape closes it. */
export function CaseModal() {
  const { caseIdx, closeCase } = useSite();
  const open = caseIdx >= 0;
  const p = PROJECTS[Math.max(0, caseIdx)];

  return (
    <div
      className={`${shell.overlay} ${styles.overlay}`}
      data-open={open}
      role="dialog"
      aria-modal="true"
      aria-label={open ? `${p.name} case study` : undefined}
      aria-hidden={!open}
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
              <div className={styles.cat}>{p.cat}</div>
              <div className={styles.tags}>
                {p.tags.map((t) => (
                  <span key={t} className={styles.tag}>
                    {t}
                  </span>
                ))}
              </div>
            </div>

            <button
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
              <div className={`${styles.blockLabel} hx-mono`}>PROBLEM</div>
              <p className={styles.blockText}>{p.problem}</p>
            </div>

            <div className={styles.block}>
              <div className={`${styles.blockLabel} hx-mono`}>SOLUTION</div>
              <p className={styles.blockText}>{p.solution}</p>

              <div className={styles.facts}>
                {p.facts.map(([k, v]) => (
                  <div key={k} className={styles.fact}>
                    <div className={styles.factKey}>{k}</div>
                    <div className={styles.factValue}>{v}</div>
                  </div>
                ))}
              </div>
            </div>

            <div className={styles.linkRow}>
              <a href={p.url} target="_blank" rel="noopener noreferrer" className={styles.liveLink}>
                Open the live product
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
