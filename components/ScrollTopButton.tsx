"use client";

import styles from "./Footer.module.css";

export function ScrollTopButton() {
  return (
    <button
      type="button"
      className={`${styles.top} hx-mono`}
      onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
    >
      SCROLL TOP
      <span className={styles.topBadge} aria-hidden="true">
        &#94;
      </span>
    </button>
  );
}
