#!/usr/bin/env node
/**
 * Generates the site's translation catalogues.
 *
 * Reads `lib/i18n/source-strings.json` — produced by `i18n-extract.mjs` — and
 * writes one `lib/i18n/messages/<code>.json` per language, translated by the
 * Groq model this project already runs on. The output is committed: it is
 * reviewable in a diff, editable by hand when somebody who speaks the language
 * disagrees with a phrase, and costs nothing at runtime.
 *
 * Usage:
 *   node scripts/translate-copy.mjs            # every language missing strings
 *   node scripts/translate-copy.mjs de fr      # only these
 *   node scripts/translate-copy.mjs --force de # retranslate, ignoring cache
 *
 * Existing translations are kept. Only strings absent from a catalogue are
 * sent, so re-running after a copy edit costs one small request rather than
 * fifteen full ones, and hand-corrections are never silently overwritten.
 */

import { readFileSync, writeFileSync, mkdirSync, existsSync } from "node:fs";
import { join } from "node:path";
import Groq from "groq-sdk";

const ROOT = process.cwd();
const MESSAGES_DIR = join(ROOT, "lib", "i18n", "messages");

/* The registry is TypeScript the way Node cannot import it, so the one thing
   needed from it — code and English name — is read out of the source. */
function languagesFromRegistry() {
  const source = readFileSync(join(ROOT, "lib", "i18n", "languages.ts"), "utf8");
  const out = [];
  for (const match of source.matchAll(
    /code:\s*"([a-z-]+)"[\s\S]{0,400}?promptName:\s*"([^"]+)"/g,
  )) {
    out.push({ code: match[1], name: match[2] });
  }
  return out;
}

const KEY = (() => {
  if (process.env.GROQ_API_KEY) return process.env.GROQ_API_KEY;
  try {
    const env = readFileSync(join(ROOT, ".env"), "utf8");
    const match = /^GROQ_API_KEY\s*=\s*(.+)$/m.exec(env);
    return match ? match[1].trim().replace(/^["']|["']$/g, "") : null;
  } catch {
    return null;
  }
})();

if (!KEY) {
  console.error("translate-copy: no GROQ_API_KEY (env or .env). Nothing to do.");
  process.exit(1);
}

const MODEL = process.env.GROQ_MODEL ?? "openai/gpt-oss-120b";
const client = new Groq({ apiKey: KEY, timeout: 120_000, maxRetries: 2 });

/**
 * Strings per request.
 *
 * Small enough that one bad batch is cheap to retry and the model does not
 * start dropping entries near the end of a long JSON object, which is the
 * characteristic failure when you ask for two hundred at once.
 */
const BATCH = 25;

function systemPrompt(name) {
  return `You are translating the website copy of Halyx Technologies, an applied-AI and product-engineering studio, from English into ${name}.

You will receive a JSON object whose keys are English strings and whose values are empty. Return the SAME object with each value filled in with the ${name} translation of its key.

Rules, in order of importance:
1. Return valid JSON and nothing else. No commentary, no code fence. Every key you were given must appear exactly once, byte-identical to how it was given — the keys are lookup keys and a changed key silently breaks that string on the site.
2. Translate the VALUE only. Never translate a key.
3. Keep these in English, always: the brand name Halyx and Halyx Technologies; product names (Maiku AI, ArchitectXpert, Axiom, Cartesia Assistant, H&B Event Solution); technology and platform names (Next.js, PyTorch, Postgres, AWS, Groq, Whisper, LLaMA, Zoom, Figma, DXF, AutoCAD); and established technical nouns that professionals in ${name} use in English anyway (API, MVP, UI/UX, LLM, MLOps, CI, DevOps, SaaS, cloud, sprint, scope, roadmap). Translating these makes the copy read as machine output.
4. Preserve formatting exactly: leading and trailing spaces, punctuation like — and ’, and any [[double square brackets]]. The brackets mark emphasised words in a headline — keep them around the corresponding words in your translation, wherever those words land in the sentence.
5. A string in ALL CAPS is a label and should come back in ALL CAPS, if that is natural for ${name}. Scripts without letter case simply ignore this.
6. This is marketing copy for a studio selling engineering work. Translate for tone, not word by word: it should read like it was written by a native speaker who works in the industry, not like a dictionary. Keep it about the same length — these strings sit in a fixed layout.
7. If a string is genuinely untranslatable — a bare product name, a number — return it unchanged.`;
}

function parse(raw) {
  const text = raw.trim().replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/, "");
  try {
    return JSON.parse(text);
  } catch {
    return null;
  }
}

async function translateBatch(strings, name) {
  const blank = Object.fromEntries(strings.map((s) => [s, ""]));

  const response = await client.chat.completions.create({
    model: MODEL,
    temperature: 0.3,
    // The catalogues are the product here, so the model gets room to think and
    // room to answer; a truncated batch is a silently half-translated page.
    max_tokens: 8_000,
    reasoning_effort: "low",
    response_format: { type: "json_object" },
    messages: [
      { role: "system", content: systemPrompt(name) },
      { role: "user", content: JSON.stringify(blank, null, 0) },
    ],
  });

  const parsed = parse(response.choices[0]?.message?.content ?? "");
  if (!parsed) return null;

  const out = {};
  for (const key of strings) {
    const value = parsed[key];
    if (typeof value === "string" && value.trim()) out[key] = value.trim();
  }
  return out;
}

/* ────────────────────────────  Run  ──────────────────────────── */

const args = process.argv.slice(2);
const force = args.includes("--force");
const wanted = args.filter((a) => !a.startsWith("--"));

const sources = JSON.parse(readFileSync(join(ROOT, "lib", "i18n", "source-strings.json"), "utf8"));
const languages = languagesFromRegistry().filter((l) => l.code !== "en");
const targets = wanted.length ? languages.filter((l) => wanted.includes(l.code)) : languages;

if (!targets.length) {
  console.error(`translate-copy: no matching languages. Known: ${languages.map((l) => l.code).join(", ")}`);
  process.exit(1);
}

mkdirSync(MESSAGES_DIR, { recursive: true });

for (const { code, name } of targets) {
  const file = join(MESSAGES_DIR, `${code}.json`);
  const existing = !force && existsSync(file) ? JSON.parse(readFileSync(file, "utf8")) : {};

  const missing = sources.filter((s) => typeof existing[s] !== "string" || !existing[s]);
  if (!missing.length) {
    console.log(`${code} (${name}): complete — ${Object.keys(existing).length} strings`);
    continue;
  }

  process.stdout.write(`${code} (${name}): ${missing.length} to translate `);

  const merged = { ...existing };
  let failed = 0;

  for (let i = 0; i < missing.length; i += BATCH) {
    const batch = missing.slice(i, i + BATCH);
    let got = null;
    try {
      got = await translateBatch(batch, name);
    } catch (error) {
      process.stdout.write("!");
      console.error(`\n  ${code}: ${error instanceof Error ? error.message.split("\n")[0] : error}`);
    }
    if (got) {
      Object.assign(merged, got);
      failed += batch.length - Object.keys(got).length;
      process.stdout.write(".");
    } else {
      failed += batch.length;
    }
  }

  /*
   * Sorted, so a regenerated catalogue produces a readable diff instead of a
   * reshuffle. Only keys still in the source survive — a string removed from
   * the site should not linger in fifteen files forever.
   */
  const ordered = {};
  for (const key of [...sources].sort((a, b) => a.localeCompare(b))) {
    if (merged[key]) ordered[key] = merged[key];
  }

  writeFileSync(file, `${JSON.stringify(ordered, null, 2)}\n`, "utf8");

  const done = Object.keys(ordered).length;
  console.log(
    ` -> ${done}/${sources.length}${failed ? ` (${failed} missing, re-run to fill)` : ""}`,
  );
}

console.log("\ntranslate-copy: done. Untranslated strings fall back to English at runtime.");
