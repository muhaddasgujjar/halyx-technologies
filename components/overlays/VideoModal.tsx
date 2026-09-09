"use client";

import { useEffect, useRef } from "react";
import { useSite } from "@/components/SiteProvider";
import shell from "./Modal.module.css";
import styles from "./VideoModal.module.css";

/**
 * The `<video>` element is only mounted while the modal is open, so the
 * showcase film costs nothing — not even a metadata request — until asked for.
 * On close it is paused and rewound before unmounting.
 */
export function VideoModal() {
  const { videoOpen, closeVideo } = useSite();
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const closeRef = useRef<HTMLButtonElement | null>(null);

  useEffect(() => {
    const v = videoRef.current;
    if (!v) return;
    if (videoOpen) {
      closeRef.current?.focus({ preventScroll: true });
      v.currentTime = 0;
      void v.play().catch(() => {
        /* Autoplay can be blocked; the controls are right there. */
      });
    } else {
      v.pause();
    }
  }, [videoOpen]);

  return (
    <div
      className={`${shell.overlay} ${styles.overlay}`}
      data-open={videoOpen}
      role="dialog"
      aria-modal="true"
      aria-label="Inside Halyx — showcase film"
      // See the note in CaseModal.tsx: `aria-hidden` on a subtree that still
      // holds focus is blocked by the browser. `inert` hides and unfocuses.
      inert={!videoOpen}
    >
      <button
        type="button"
        className={`${shell.backdrop} ${styles.backdrop}`}
        onClick={closeVideo}
        aria-label="Close"
        tabIndex={-1}
      />

      <div className={`${shell.panelBorder} ${styles.panelBorder}`}>
        <div className={shell.panel}>
          <div className={styles.header}>
            <span className={styles.mark} aria-hidden="true">
              <i />
              <i />
              <i />
            </span>

            <div className={styles.headText}>
              <div className={styles.title}>Inside Halyx &mdash; showcase film</div>
              <div className={`${styles.meta} hx-mono`}>APPLIED AI STUDIO</div>
            </div>

            <button
              ref={closeRef}
              type="button"
              className={`${shell.close} ${styles.close}`}
              onClick={closeVideo}
              aria-label="Close"
            >
              &times;
            </button>
          </div>

          {videoOpen ? (
            <video
              ref={videoRef}
              src="/media/halyx-showcase.mp4"
              controls
              playsInline
              preload="metadata"
              className={styles.video}
            />
          ) : (
            <div className={styles.videoPlaceholder} aria-hidden="true" />
          )}
        </div>
      </div>
    </div>
  );
}
