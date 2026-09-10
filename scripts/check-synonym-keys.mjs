#!/usr/bin/env node
/**
 * Guards the synonym table against rows that can never fire.
 *
 * `SYNONYMS` is keyed by *stemmed* tokens, because `expandQuery` looks each key
 * up against the output of `tokenize`. A key that is not its own stem is dead
 * weight: it sits there looking correct and is never once matched.
 *
 * The trap is not hypothetical. The stemmer strips `es` from anything five
 * characters or longer, so the obvious Roman Urdu row for "paise" has to be
 * keyed `pai` — spell it `paise` and the row silently does nothing. English
 * rows have the same hazard (`prices`, `reviews`, `weeks`).
 *
 * Skips itself, with a notice, on a runtime that cannot import TypeScript.
 * `package.json` allows Node 20, where type stripping does not exist; the check
 * is worth having on modern Node and in CI without making an older Node fail a
 * build over a linting concern.
 */

import { pathToFileURL } from "node:url";
import { join } from "node:path";

const source = join(process.cwd(), "lib", "rag", "tokenize.ts");

let mod;
try {
  mod = await import(pathToFileURL(source).href);
} catch (error) {
  const why = error instanceof Error ? error.message.split("\n")[0] : String(error);
  console.log(`synonym-keys: SKIPPED — this runtime cannot import ${source} (${why})`);
  process.exit(0);
}

const { SYNONYM_KEYS, tokenize } = mod;

if (!Array.isArray(SYNONYM_KEYS) || typeof tokenize !== "function") {
  console.error("synonym-keys: FAILED — tokenize.ts no longer exports SYNONYM_KEYS and tokenize.");
  process.exit(1);
}

/*
 * The rule is: tokenizing the key must give the key back.
 *
 * `stem` is not idempotent, so a handful of keys are legitimately reachable
 * without satisfying that — `databases` yields `databas` even though
 * `stem("databas")` is `databa`. Those are listed here rather than inferred,
 * because "is there a real word that stems to this?" cannot be decided
 * mechanically: appending suffixes to probe for one happily manufactures
 * `founderer` and declares a dead row healthy.
 *
 * Adding a key here should feel slightly annoying. That is the point — it is a
 * claim that a real word stems to it, and the word belongs in the comment.
 */
const PLURAL_DERIVED = new Map([
  ["databas", "databases"],
  ["proces", "process"],
  ["process", "processes"],
]);

const problems = [];

for (const key of SYNONYM_KEYS) {
  if (tokenize(key).includes(key)) continue;

  if (PLURAL_DERIVED.has(key)) {
    const witness = PLURAL_DERIVED.get(key);
    if (tokenize(witness).includes(key)) continue;
    problems.push(`  "${key}" — allowlisted as the stem of "${witness}", but no longer is`);
    continue;
  }

  const stemmed = tokenize(key)[0];
  problems.push(
    stemmed
      ? `  "${key}" — never produced by tokenize; it reduces to "${stemmed}". Key it as "${stemmed}".`
      : `  "${key}" — dropped by tokenize entirely (a stopword?), so the row can never be reached`,
  );
}

if (problems.length) {
  console.error(`synonym-keys: FAILED — ${problems.length} unreachable row(s) in SYNONYMS:`);
  for (const problem of problems) console.error(problem);
  process.exit(1);
}

console.log(`synonym-keys: OK — ${SYNONYM_KEYS.length} keys, all reachable.`);
