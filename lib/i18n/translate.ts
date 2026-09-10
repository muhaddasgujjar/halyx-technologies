/**
 * Site copy translation.
 *
 * Keyed by the English string itself rather than by an id — the gettext model.
 * `t("Design first, always.")` looks that sentence up in the active catalogue
 * and returns the English back when there is no entry.
 *
 * The reason is failure behaviour. With ids, a missing or misspelled key
 * renders `home.beliefs.01.lead` on the page, or nothing at all; here the worst
 * case is a sentence that stays English while the ones around it translate.
 * That degrades in the right direction for a marketing site, and it means a
 * catalogue can be regenerated, half-written or absent without the page ever
 * breaking.
 *
 * The cost is that two identical English strings always share one translation,
 * and that editing English copy orphans its old entry. Both are fine here:
 * duplicated strings on this page are genuinely the same phrase, and the
 * catalogue is regenerated from source by `npm run i18n:build`.
 */

/** One language's catalogue: English source string to translated string. */
export type Messages = Record<string, string>;

/** Looks a string up, falling back to the English it was given. */
export type Translate = (english: string) => string;

/**
 * Builds a lookup over a catalogue.
 *
 * An empty string maps to itself: a catalogue entry that came back blank —
 * a truncated generation, a model that decided a heading needed no translation —
 * must not blank the page.
 */
export function makeTranslate(messages: Messages | null): Translate {
  if (!messages) return (english) => english;
  return (english) => {
    const found = messages[english];
    return typeof found === "string" && found.length > 0 ? found : english;
  };
}

/** The identity translator, for English and for the first render. */
export const IDENTITY: Translate = (english) => english;

/**
 * Loads a language's catalogue.
 *
 * Dynamic so each one is its own chunk: fifteen catalogues statically imported
 * would ship every language to every visitor, and the largest share of them
 * would never be read.
 *
 * English has no catalogue by construction — it is the key space — so it
 * resolves to null without a request.
 */
export async function loadMessages(code: string): Promise<Messages | null> {
  if (code === "en") return null;
  try {
    const mod = await import(`./messages/${code}.json`);
    return (mod.default ?? mod) as Messages;
  } catch {
    // A language in the registry with no catalogue yet. The site stays English
    // rather than breaking, which is the whole point of keying on the source.
    return null;
  }
}
