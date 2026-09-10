"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { DEFAULT_LOCALE, isLanguageCode, language, type Language } from "@/lib/i18n/languages";
import { IDENTITY, loadMessages, makeTranslate, type Translate } from "@/lib/i18n/translate";

/**
 * The visitor's chosen language.
 *
 * Lives above `<SiteProvider>` because two very distant things need it: the
 * navbar switcher sets it, and the voice console — most of a page away — greets
 * and answers in it.
 *
 * **English is the default, always.** The browser's `navigator.language` is
 * deliberately *not* consulted. It is a poor proxy for what somebody wants to
 * be sold in — a German engineer working in English on a machine set to German
 * gets a page that guessed wrong — and a marketing site that silently changes
 * language under a visitor is worse than one that waits to be asked. The
 * switcher is one click away and it starts on English, which is what was asked
 * for.
 */

const STORAGE_KEY = "halyx.locale";

interface LocaleContextValue {
  /** The chosen code, e.g. `"de"`. */
  locale: string;
  /** The resolved registry entry. Never null — falls back to English. */
  lang: Language;
  /**
   * Translates one English string into the active language.
   *
   * Identity until that language's catalogue has loaded, so the page renders
   * English for a frame rather than empty. See `lib/i18n/translate.ts`.
   */
  t: Translate;
  setLocale: (code: string) => void;
  /**
   * True once the stored choice has been read.
   *
   * The first paint is always English so the server and client markup agree;
   * a returning German visitor's choice lands one tick later. The console uses
   * this to hold its greeting until it knows which language to say it in, which
   * is the one place where greeting in the wrong language would be noticed.
   */
  hydrated: boolean;
}

const LocaleContext = createContext<LocaleContextValue | null>(null);

export function useLocale(): LocaleContextValue {
  const ctx = useContext(LocaleContext);
  if (!ctx) throw new Error("useLocale must be used inside <LocaleProvider>");
  return ctx;
}

export function LocaleProvider({ children }: { children: ReactNode }) {
  const [locale, setLocaleState] = useState(DEFAULT_LOCALE);
  const [hydrated, setHydrated] = useState(false);

  /*
   * Restore in an effect rather than a lazy initialiser: reading localStorage
   * during render would produce different markup on the server and the client
   * and hydration would tear. One extra tick in English is the cost.
   */
  useEffect(() => {
    try {
      const stored = window.localStorage.getItem(STORAGE_KEY);
      if (isLanguageCode(stored)) setLocaleState(stored);
    } catch {
      // Private mode, or storage blocked. English it is.
    }
    setHydrated(true);
  }, []);

  const setLocale = useCallback((code: string) => {
    if (!isLanguageCode(code)) return;
    setLocaleState(code);
    try {
      window.localStorage.setItem(STORAGE_KEY, code);
    } catch {
      // Not being able to remember the choice does not stop it applying now.
    }
  }, []);

  const lang = useMemo(() => language(locale), [locale]);

  /*
   * The active catalogue.
   *
   * Loaded per language and kept as the translator rather than the raw map, so
   * a component never has to think about whether it has arrived. Between the
   * switch and the chunk landing, `t` is the identity function and the page is
   * English — one frame, and never blank.
   *
   * `stale` guards the race: switching quickly between two languages can settle
   * the requests out of order, and without it the page would end up in
   * whichever one happened to load last rather than the one that was picked.
   */
  const [t, setT] = useState<Translate>(() => IDENTITY);

  useEffect(() => {
    let stale = false;
    setT(() => IDENTITY);

    void loadMessages(locale).then((messages) => {
      if (!stale) setT(() => makeTranslate(messages));
    });

    return () => {
      stale = true;
    };
  }, [locale]);

  /*
   * `<html lang>` follows the choice so screen readers switch voice and the
   * browser offers the right translation prompt.
   *
   * `dir` follows it too, now that the page itself translates rather than only
   * the agent. A full page of Arabic or Urdu set left-to-right is not a styling
   * preference — punctuation lands on the wrong end of every sentence and the
   * text is genuinely hard to read. Flipping the document is the correct answer
   * and CSS logical properties carry most of the layout across; `globals.css`
   * holds the handful of corrections for the places that pin a physical side.
   */
  useEffect(() => {
    document.documentElement.lang = lang.tag;
    document.documentElement.dir = lang.dir;
  }, [lang]);

  const value = useMemo<LocaleContextValue>(
    () => ({ locale, lang, t, setLocale, hydrated }),
    [locale, lang, t, setLocale, hydrated],
  );

  return <LocaleContext.Provider value={value}>{children}</LocaleContext.Provider>;
}
