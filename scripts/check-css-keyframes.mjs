#!/usr/bin/env node
/**
 * Guards against a silent, invisible class of bug.
 *
 * CSS Modules scopes `@keyframes` names — and it rewrites the *reference* too.
 * A bare `animation: hx-shine 6s …` inside a `*.module.css` compiles to
 * `animation: Foo-module__hash__hx-shine 6s …`, which matches nothing, because
 * this project's keyframes are global (app/globals.css). No build error, no
 * console warning — the animation just never runs.
 *
 * Modules must reference keyframes through the `--hx-kf-*` tokens instead:
 *
 *     animation: var(--hx-kf-shine) 6s linear infinite;
 *
 * (`:global(name)` does not work: Turbopack emits it verbatim and the browser
 * drops the declaration.)
 */

import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative } from "node:path";

const ROOT = process.cwd();
const GLOBALS = join(ROOT, "app", "globals.css");

/** Every `@keyframes` name declared globally. */
const declared = new Set(
  [...readFileSync(GLOBALS, "utf8").matchAll(/@keyframes\s+([A-Za-z_][\w-]*)/g)].map(
    (m) => m[1],
  ),
);

/** Every `--hx-kf-*` token declared globally. */
const tokens = new Set(
  [...readFileSync(GLOBALS, "utf8").matchAll(/--hx-kf-([\w-]+)\s*:\s*([A-Za-z_][\w-]*)/g)].map(
    (m) => m[2],
  ),
);

function walk(dir, out = []) {
  for (const entry of readdirSync(dir)) {
    if (entry === "node_modules" || entry === ".next" || entry.startsWith(".")) continue;
    const p = join(dir, entry);
    if (statSync(p).isDirectory()) walk(p, out);
    else if (entry.endsWith(".module.css")) out.push(p);
  }
  return out;
}

const problems = [];

for (const file of walk(ROOT)) {
  const lines = readFileSync(file, "utf8").split(/\r?\n/);
  lines.forEach((line, i) => {
    const m = line.match(/animation(?:-name)?\s*:\s*([^;}]*)/);
    if (!m) return;
    const value = m[1];

    // A bare keyframe ident anywhere in the value is the bug.
    for (const name of declared) {
      const bare = new RegExp(`(^|[\\s,])${name}(?![\\w-])`);
      if (bare.test(value)) {
        problems.push({
          file: relative(ROOT, file),
          line: i + 1,
          text: line.trim(),
          fix: `animation: var(--hx-kf-${name.replace(/^hx-/, "")}) …`,
        });
      }
    }

    // `:global()` compiles to invalid CSS here.
    if (value.includes(":global(")) {
      problems.push({
        file: relative(ROOT, file),
        line: i + 1,
        text: line.trim(),
        fix: "use the --hx-kf-* token; :global() is emitted verbatim and dropped",
      });
    }
  });
}

// Every declared keyframe should have a token, so modules always have a handle.
const missingTokens = [...declared].filter((n) => !tokens.has(n));

if (problems.length === 0 && missingTokens.length === 0) {
  console.log(
    `css-keyframes: OK — ${declared.size} global keyframes, ${tokens.size} tokens, no bare refs in modules.`,
  );
  process.exit(0);
}

for (const p of problems) {
  console.error(`\n${p.file}:${p.line}\n  ${p.text}\n  -> ${p.fix}`);
}
for (const n of missingTokens) {
  console.error(`\napp/globals.css\n  @keyframes ${n} has no --hx-kf-* token`);
}
console.error(
  `\ncss-keyframes: ${problems.length + missingTokens.length} problem(s). ` +
    `These animations would silently never run.`,
);
process.exit(1);
