#!/usr/bin/env node
/**
 * Collects every English string the site needs translated.
 *
 * Two sources, because the copy lives in two shapes:
 *
 *  1. **Data modules.** `SERVICES`, `PROJECTS`, `BELIEFS` and the rest are
 *     structured records. Only the prose fields are collected — an allowlist
 *     per module, spelled out below. That is deliberately not a denylist: a
 *     new field defaults to *not* translated, which is the safe direction. A
 *     URL, an image path or a stack name that slips into a catalogue comes
 *     back from the model rewritten, and a rewritten URL is a broken link.
 *
 *  2. **Components.** Anything wrapped in `t("…")`.
 *
 * Parsed from source rather than imported, for the same reason as
 * `check-react-keys.mjs`: the data modules import each other with extensionless
 * and `@/`-aliased specifiers Node cannot resolve, and nothing here should
 * execute app code.
 *
 * Writes `lib/i18n/source-strings.json`, which `translate-copy.mjs` consumes.
 * Run it with `npm run i18n:extract`.
 */

import { readFileSync, writeFileSync, readdirSync, statSync } from "node:fs";
import { join, relative } from "node:path";

const ROOT = process.cwd();

/**
 * Which fields carry prose, per data module.
 *
 * Everything absent here stays English on purpose. The notable exclusions:
 * `stack` and project `name` are product and technology names (PyTorch, Go,
 * Maiku AI) that read as errors when translated; `metric` and `num` are
 * numerals; `host`, `url`, `img`, `focus` and `linkedin` are addresses.
 */
const DATA_FIELDS = {
  "lib/content.ts": ["metricLabel", "title", "blurb", "more", "lead", "trail", "bio", "label", "text"],
  "lib/services.ts": ["title", "blurb", "services"],
  "lib/projects.ts": ["cat", "note", "tags", "problem", "solution", "facts"],
  "lib/people.ts": ["name", "quote"],
  "lib/hubs.ts": ["label", "t"],
};

/** Standalone string arrays worth translating, by module and export name. */
const DATA_ARRAYS = {
  "lib/content.ts": ["INTERESTS"],
};

const strings = new Set();
const sources = new Map();

function add(value) {
  const text = value.trim();
  // A lone symbol, a number, or an arrow has nothing to translate and only
  // gives the model a chance to invent something.
  if (!text || text.length < 2) return;
  if (!/[A-Za-z]{2}/.test(text)) return;
  strings.add(text);
}

/**
 * Makes a captured literal equal the string it renders as.
 *
 * A source file writes an em dash as `\u2014` inside a double-quoted string;
 * the catalogue is keyed by what the component renders, so the key must carry
 * the *character* — a key stored with the literal escape can never match the
 * runtime string, and that lookup silently stays English forever (`We move fast
 * — but never…` was exactly that until this was unescaped).
 */
function unescape(raw) {
  return raw
    .replace(/\\u([0-9a-fA-F]{4})/g, (_, hex) => String.fromCharCode(parseInt(hex, 16)))
    .replace(/\\x([0-9a-fA-F]{2})/g, (_, hex) => String.fromCharCode(parseInt(hex, 16)))
    .replace(/\\n/g, "\n")
    .replace(/\\t/g, "\t")
    .replace(/\\r/g, "\r")
    .replace(/\\"/g, '"')
    .replace(/\\'/g, "'");
}

/** Every double- or single-quoted literal inside a chunk of source. */
function quotedIn(chunk) {
  const out = [];
  for (const match of chunk.matchAll(/"((?:[^"\\]|\\.)*)"|'((?:[^'\\]|\\.)*)'/g)) {
    const raw = match[1] ?? match[2] ?? "";
    out.push(unescape(raw));
  }
  return out;
}

/* ────────────────────────────  Data modules  ──────────────────────────── */

for (const [file, fields] of Object.entries(DATA_FIELDS)) {
  const path = join(ROOT, file);
  let source;
  try {
    source = readFileSync(path, "utf8");
  } catch {
    console.error(`i18n-extract: missing ${file}`);
    process.exit(1);
  }

  for (const field of fields) {
    // `field: "…"` — a single string, possibly wrapped to the next line.
    for (const match of source.matchAll(
      new RegExp(`\\b${field}\\s*:\\s*("(?:[^"\\\\]|\\\\.)*"|'(?:[^'\\\\]|\\\\.)*')`, "g"),
    )) {
      for (const value of quotedIn(match[1])) {
        add(value);
        sources.set(value, file);
      }
    }

    // `field: [ … ]` — a list, or a list of pairs as in `facts`.
    for (const match of source.matchAll(new RegExp(`\\b${field}\\s*:\\s*\\[([\\s\\S]*?)\\]\\s*,?\\s*\\n`, "g"))) {
      for (const value of quotedIn(match[1])) {
        add(value);
        sources.set(value, file);
      }
    }
  }
}

for (const [file, names] of Object.entries(DATA_ARRAYS)) {
  const source = readFileSync(join(ROOT, file), "utf8");
  for (const name of names) {
    const match = new RegExp(`\\b${name}\\s*=\\s*\\[([\\s\\S]*?)\\]`).exec(source);
    if (!match) continue;
    for (const value of quotedIn(match[1])) {
      add(value);
      sources.set(value, file);
    }
  }
}

/**
 * Const objects and arrays inside components whose string values are passed
 * through `t` at render but whose definition is a name, not a `t("…")`
 * literal — so the payload scan above can never see them. Without this the
 * chat dock's chrome and the hero pills stay English in every language.
 *
 * Kept an explicit allowlist for the same reason as `DATA_FIELDS`: a
 * `float: "hx-float-a 7s …"` animation string inside the same block must not
 * reach the translator, and a rewritten animation string is a dead animation.
 *
 * Three shapes:
 *   `{ ALL: true }`            — every quoted value in the block (keys excluded),
 *                                e.g. the dock chrome, where all values are prose.
 *   `{ fields: ["label"] }`    — only the named fields, e.g. hero pill labels
 *                                next to `float`/`pos`/`mark` that must not move.
 *
 * Keys are excluded from `ALL` by the `[,}]` lookahead: in an object literal
 * only a *value* is followed by a comma or the closing brace; a key is followed
 * by a colon.
 */
const COMPONENT_CONSTANTS = {
  "components/overlays/ChatDock.tsx": { DOCK_COPY: { ALL: true }, TOOL_STATUS: { ALL: true } },
  "components/Counters.tsx": { LABELS: { ALL: true } },
  "components/Hero.tsx": { PILLS: { fields: ["label"] } },
};

function constantBlock(source, name) {
  // `const NAME: T = …` or `const NAME = …`, up to the first `;` after `=`.
  return new RegExp(`\\bconst\\s+${name}\\s*(?::[^=]+)?=\\s*([\\s\\S]*?);`).exec(source);
}

for (const [file, constants] of Object.entries(COMPONENT_CONSTANTS)) {
  const source = readFileSync(join(ROOT, file), "utf8");
  for (const [name, spec] of Object.entries(constants)) {
    const block = constantBlock(source, name);
    if (!block) continue;

    for (const value of spec.fields
      ? // `name: "…"` pairs only, so `float`/`pos`/`mark` neighbours stay out.
        block[1]
          .matchAll(
            new RegExp(
              `\\b(?:${spec.fields.map((f) => f.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")).join("|")})\\s*:\\s*("(?:[^"\\\\]|\\\\.)*"|'(?:[^'\\\\]|\\\\.)*')`,
              "g",
            ),
          )
          .flatMap((m) => quotedIn(m[1]))
      : // Every value, but never a key (a key is followed by `:`).
        [...block[1].matchAll(/("(?:[^"\\]|\\.)*"|'(?:[^'\\]|\\.)*')\s*(?=[,}\]])/g)].map((m) =>
          unescape(m[1].slice(1, -1)),
        ) ?? []) {
      add(value);
      sources.set(value, relative(ROOT, file));
    }
  }
}

/* ────────────────────────────  Components  ──────────────────────────── */

function walk(dir, out = []) {
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) {
      if (entry === "node_modules" || entry === ".next") continue;
      walk(full, out);
    } else if (entry.endsWith(".tsx") || entry.endsWith(".ts")) {
      out.push(full);
    }
  }
  return out;
}

const componentFiles = [join(ROOT, "components"), join(ROOT, "app"), join(ROOT, "lib", "i18n")]
  .filter((dir) => {
    try {
      return statSync(dir).isDirectory();
    } catch {
      return false;
    }
  })
  .flatMap((dir) => walk(dir));

for (const file of componentFiles) {
  const source = readFileSync(file, "utf8");
  // `t("…")` and `t('…')`. Template literals are skipped on purpose: an
  // interpolated string is not a translatable unit, it is a sentence assembled
  // at runtime, and the pieces have to be wrapped individually.
  for (const match of source.matchAll(/\bt\(\s*("(?:[^"\\]|\\.)*"|'(?:[^'\\]|\\.)*')\s*\)/g)) {
    for (const value of quotedIn(match[1])) {
      add(value);
      sources.set(value, relative(ROOT, file));
    }
  }
}

/* ────────────────────────────  Write  ──────────────────────────── */

const sorted = [...strings].sort((a, b) => a.localeCompare(b));
const out = join(ROOT, "lib", "i18n", "source-strings.json");

writeFileSync(out, `${JSON.stringify(sorted, null, 2)}\n`, "utf8");

const words = sorted.reduce((n, s) => n + s.split(/\s+/).length, 0);
console.log(
  `i18n-extract: ${sorted.length} source strings (~${words} words) -> ${relative(ROOT, out)}`,
);
