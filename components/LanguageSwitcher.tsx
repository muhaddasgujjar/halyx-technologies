"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useLocale } from "./LocaleProvider";
import { LANGUAGES } from "@/lib/i18n/languages";
import styles from "./LanguageSwitcher.module.css";

/**
 * The navbar language control.
 *
 * It switches the whole site to the chosen language — catalogues in
 * `lib/i18n/messages/` cover the page copy, and the same choice drives what
 * Halyx AI greets, listens and answers in. A visitor who picks German gets the
 * page in German and an agent that speaks German; a language with no catalogue
 * yet degrades to English rather than breaking.
 *
 * Two shapes from one component. `bar` is the popover on the desktop bar;
 * `sheet` is a flat grid inside the mobile menu, because a popover inside a
 * sheet is a menu inside a menu and phones handle that badly.
 */

export function LanguageSwitcher({
  variant = "bar",
  onPick,
}: {
  variant?: "bar" | "sheet";
  onPick?: () => void;
}) {
  const { locale, lang, setLocale, t } = useLocale();
  const [open, setOpen] = useState(false);

  const rootRef = useRef<HTMLDivElement | null>(null);
  const buttonRef = useRef<HTMLButtonElement | null>(null);
  const optionRefs = useRef<(HTMLButtonElement | null)[]>([]);

  const close = useCallback((refocus = false) => {
    setOpen(false);
    if (refocus) buttonRef.current?.focus();
  }, []);

  const choose = useCallback(
    (code: string) => {
      setLocale(code);
      setOpen(false);
      onPick?.();
    },
    [onPick, setLocale],
  );

  /* Click away and Escape both dismiss. Pointerdown, not click: a click that
     started inside and ended outside should not count as leaving. */
  useEffect(() => {
    if (!open) return;

    const onPointerDown = (event: PointerEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false);
    };
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.stopPropagation();
        close(true);
      }
    };

    document.addEventListener("pointerdown", onPointerDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open, close]);

  /* Opening lands focus on the current language, so a keyboard visitor starts
     where they are rather than at the top of a fifteen-item list. */
  useEffect(() => {
    if (!open) return;
    const index = LANGUAGES.findIndex((l) => l.code === locale);
    optionRefs.current[index < 0 ? 0 : index]?.focus();
  }, [open, locale]);

  const onListKey = useCallback(
    (event: React.KeyboardEvent, index: number) => {
      const step = event.key === "ArrowDown" ? 1 : event.key === "ArrowUp" ? -1 : 0;
      if (step === 0) return;
      event.preventDefault();
      const next = (index + step + LANGUAGES.length) % LANGUAGES.length;
      optionRefs.current[next]?.focus();
    },
    [],
  );

  const options = (
    <>
      {LANGUAGES.map((entry, i) => (
        <button
          key={entry.code}
          ref={(el) => {
            optionRefs.current[i] = el;
          }}
          type="button"
          role="option"
          aria-selected={entry.code === locale}
          className={styles.option}
          lang={entry.tag}
          dir={entry.dir}
          onClick={() => choose(entry.code)}
          onKeyDown={variant === "bar" ? (e) => onListKey(e, i) : undefined}
        >
          <span className={styles.optionLabel}>{entry.label}</span>
          {/* The English name is the way out for somebody who cannot read the
              script they are looking at — it is never the primary label. */}
          <span className={`${styles.optionEnglish} hx-mono`} dir="ltr">
            {entry.english}
          </span>
        </button>
      ))}
    </>
  );

  if (variant === "sheet") {
    return (
      <div className={styles.sheetBlock}>
        <div className={`${styles.sheetHead} hx-mono`}>
          {lang.ui.language.toUpperCase()} · HALYX AI
        </div>
        <div className={styles.sheetGrid} role="listbox" aria-label={lang.ui.language}>
          {options}
        </div>
      </div>
    );
  }

  return (
    <div ref={rootRef} className={styles.root}>
      <button
        ref={buttonRef}
        type="button"
        className={`${styles.trigger} hx-tap-target`}
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        aria-haspopup="listbox"
        /* Names the control *and* reads back the current value, so a screen
           reader announces "Language, English" rather than just "EN". */
        aria-label={`${lang.ui.language}: ${lang.english}`}
        title={lang.ui.language}
      >
        <GlobeIcon />
        <span className={`${styles.code} hx-mono`}>{lang.short}</span>
        <span className={styles.chevron} data-open={open} aria-hidden="true" />
      </button>

      <div
        className={styles.panel}
        data-open={open}
        role="listbox"
        aria-label={lang.ui.language}
        /* Kept mounted so it can transition; `inert` keeps it out of the tab
           order and the a11y tree while closed. */
        inert={!open}
      >
        <div className={`${styles.panelHead} hx-mono`}>{t("SITE LANGUAGE")}</div>
        {options}
      </div>
    </div>
  );
}

/** Meridians only — a filled globe at 15px is a grey blob. */
function GlobeIcon() {
  return (
    <svg
      className={styles.globe}
      viewBox="0 0 16 16"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.2"
      aria-hidden="true"
    >
      <circle cx="8" cy="8" r="6.2" />
      <ellipse cx="8" cy="8" rx="2.6" ry="6.2" />
      <path d="M1.9 6h12.2M1.9 10h12.2" />
    </svg>
  );
}
