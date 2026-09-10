#!/usr/bin/env node
/**
 * Reports translation coverage.
 *
 * Deliberately does not fail the build on a gap. An untranslated string falls
 * back to its English source at runtime — that is the whole design of
 * `lib/i18n/translate.ts` — so a missing entry is a page that reads slightly
 * English, not a page that breaks. Blocking a deploy on it would mean nobody
 * could touch a headline without regenerating fifteen catalogues first, and the
 * check would be removed within a week.
 *
 * It does fail on a malformed catalogue, because that is not a gap: a JSON file
 * the bundler cannot parse takes the whole language down.
 */

import { readFileSync, readdirSync, existsSync } from "node:fs";
import { join } from "node:path";

const ROOT = process.cwd();
const DIR = join(ROOT, "lib", "i18n", "messages");
const SOURCE = join(ROOT, "lib", "i18n", "source-strings.json");

if (!existsSync(SOURCE)) {
  console.log("i18n: SKIPPED — no source-strings.json (run `npm run i18n:extract`).");
  process.exit(0);
}

const sources = JSON.parse(readFileSync(SOURCE, "utf8"));

if (!existsSync(DIR)) {
  console.log(`i18n: no catalogues yet — the site is English only (${sources.length} strings).`);
  process.exit(0);
}

const files = readdirSync(DIR).filter((f) => f.endsWith(".json"));
const broken = [];
const partial = [];
let complete = 0;

for (const file of files) {
  const code = file.replace(/\.json$/, "");
  let messages;
  try {
    messages = JSON.parse(readFileSync(join(DIR, file), "utf8"));
  } catch (error) {
    broken.push(`  ${file} — ${error instanceof Error ? error.message.split("\n")[0] : error}`);
    continue;
  }

  const missing = sources.filter((s) => typeof messages[s] !== "string" || !messages[s]);
  if (missing.length === 0) complete += 1;
  else partial.push(`  ${code}: ${sources.length - missing.length}/${sources.length}`);
}

if (broken.length) {
  console.error("i18n: FAILED — unparseable catalogue(s):");
  for (const line of broken) console.error(line);
  process.exit(1);
}

if (partial.length) {
  console.log(`i18n: ${complete}/${files.length} languages complete; the rest fall back to English:`);
  for (const line of partial) console.log(line);
  console.log("  Run `npm run i18n:build` to fill them.");
} else {
  console.log(`i18n: OK — ${files.length} languages, ${sources.length} strings each.`);
}
