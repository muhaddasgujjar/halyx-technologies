import { Fragment, type ReactNode } from "react";

/**
 * Renders a translated string that contains emphasis.
 *
 * A headline like "We Build **Intelligent Systems** That Matter" cannot be
 * translated in three pieces: German puts the verb at the end, Arabic and
 * Japanese reorder it further, and a sentence reassembled from separately
 * translated fragments comes out as word salad in half the languages on the
 * switcher. So the whole sentence is one translatable unit and the emphasis
 * travels inside it, marked with double square brackets:
 *
 *     rich(t("We Build [[Intelligent Systems]] That Matter"))
 *
 * The translator is instructed to keep the brackets around whatever the
 * emphasised words become. If it drops them the sentence still renders, just
 * without the highlight — the failure is cosmetic, which is the only acceptable
 * kind here.
 */
export function rich(text: string, emphasis = "strong"): ReactNode {
  const parts = text.split(/\[\[(.+?)\]\]/gs);
  if (parts.length === 1) return text;

  return parts.map((part, i) =>
    // Odd indices are the captured groups, i.e. the emphasised runs.
    i % 2 === 1 ? (
      emphasis === "em" ? (
        <em key={i}>{part}</em>
      ) : (
        <strong key={i}>{part}</strong>
      )
    ) : (
      <Fragment key={i}>{part}</Fragment>
    ),
  );
}
