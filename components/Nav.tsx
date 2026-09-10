"use client";

import { useCallback, useEffect, useState } from "react";
import { NAV_LINKS } from "@/lib/content";
import { applyScrollLock } from "@/lib/scroll-lock";
import { LanguageSwitcher } from "./LanguageSwitcher";
import styles from "./Nav.module.css";

/**
 * Five links, a wordmark and a CTA fit on a desktop bar and nowhere near a
 * 360px one, so below 860px they collapse into a sheet behind a hamburger.
 *
 * The breakpoint is duplicated here as a media query because the CSS and the JS
 * have to agree on it: CSS decides what is visible, and this decides when an
 * open menu should force itself shut (rotating a phone to landscape can cross
 * the breakpoint while the sheet is open, which would otherwise leave the page
 * scroll-locked behind a menu that is no longer painted).
 */
const MOBILE_QUERY = "(max-width: 860px)";

export function Nav() {
  const [open, setOpen] = useState(false);

  const close = useCallback(() => setOpen(false), []);

  /* The sheet covers the page; the page must not scroll under it. */
  useEffect(() => applyScrollLock(open), [open]);

  useEffect(() => {
    if (!open) return;

    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") close();
    };
    window.addEventListener("keydown", onKey);

    // Growing past the breakpoint hides the sheet in CSS; drop the state too.
    const mq = window.matchMedia(MOBILE_QUERY);
    const onChange = () => {
      if (!mq.matches) close();
    };
    mq.addEventListener("change", onChange);

    return () => {
      window.removeEventListener("keydown", onKey);
      mq.removeEventListener("change", onChange);
    };
  }, [open, close]);

  return (
    <nav className={styles.nav} aria-label="Primary" data-open={open}>
      <a href="#top" className={styles.wordmark} onClick={close}>
        HALYX
      </a>

      <div className={styles.links}>
        {NAV_LINKS.map((l) => (
          <a key={l.text} href={l.href} className={styles.link}>
            {l.text}
          </a>
        ))}
      </div>

      {/*
       * Left of the CTA, not right of it: the CTA is the bar's last word and
       * nothing should sit between it and the edge. Below 860px this hides
       * itself and reappears inside the sheet.
       */}
      <LanguageSwitcher />

      <a href="#contact" className={styles.cta}>
        <span className={styles.ctaText}>Start Your Project</span>
        <span className={styles.ctaBadge} aria-hidden="true">
          &#8599;
        </span>
      </a>

      <button
        type="button"
        className={`${styles.burger} hx-tap-target`}
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        aria-controls="nav-menu"
        aria-label={open ? "Close menu" : "Open menu"}
      >
        {/* Three bars that fold into a cross; `data-open` on the nav drives it. */}
        <span className={styles.burgerBars} aria-hidden="true">
          <i />
          <i />
          <i />
        </span>
      </button>

      {/*
       * Kept mounted and hidden rather than conditionally rendered, so the sheet
       * can transition in and out and so its links stay in the DOM for search
       * engines. `inert` takes it out of the tab order and the a11y tree while
       * closed, which `display: none` would also do but without the animation.
       */}
      <div
        id="nav-menu"
        className={styles.sheet}
        data-open={open}
        inert={!open}
        aria-label="Menu"
      >
        <div className={styles.sheetLinks}>
          {NAV_LINKS.map((l) => (
            <a key={l.text} href={l.href} className={styles.sheetLink} onClick={close}>
              {l.text}
            </a>
          ))}
        </div>

        {/* Picking a language closes the sheet: the choice is made, and leaving
            the menu open over the page afterwards reads as a failed tap. */}
        <LanguageSwitcher variant="sheet" onPick={close} />

        <a href="#contact" className={styles.sheetCta} onClick={close}>
          Start Your Project
          <span className={styles.ctaBadge} aria-hidden="true">
            &#8599;
          </span>
        </a>
      </div>

      {/* Tapping away from the sheet closes it. */}
      <button
        type="button"
        className={styles.scrim}
        data-open={open}
        onClick={close}
        aria-label="Close menu"
        tabIndex={-1}
      />
    </nav>
  );
}
