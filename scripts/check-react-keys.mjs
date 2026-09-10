#!/usr/bin/env node
/**
 * Guards rendered lists against duplicate React keys.
 *
 * React only complains about a duplicate key when the branch that produces it
 * actually renders, in development, with somebody watching the console. That is
 * a bad place to find out: `TrustedBy` shipped a metrics row keyed on
 * `m.value`, where the values are counts of three unrelated collections. Five
 * products and five practices meant two siblings keyed `5`, and React quietly
 * dropped one of the two.
 *
 * The rule enforced here is narrow and mechanical: wherever a component maps a
 * statically knowable collection and keys on a field of it, those key values
 * must be distinct.
 *
 * Everything is read from source rather than imported. That matters more than
 * it sounds: the data modules import each other with extensionless and
 * `@/`-aliased specifiers, which Node's ESM resolver cannot follow, so an
 * import-based version of this check reported the very bug it was written for
 * as "could not evaluate" and exited zero. Parsing also means no app code is
 * executed at build time, and no dependency on a Node new enough to strip
 * types.
 *
 * It deliberately does not guess. A collection it cannot resolve is reported as
 * unverified rather than assumed fine — run with `CHECK_KEYS_VERBOSE=1` to list
 * them. Failing the build on anything unreadable would make the check a
 * nuisance and it would be deleted within a month.
 */

import { readFileSync, readdirSync, statSync } from "node:fs";
import { join, dirname, resolve, relative } from "node:path";

const ROOT = process.cwd();

/* ────────────────────────────  Source access  ──────────────────────────── */

const sources = new Map();

function read(file) {
  if (!sources.has(file)) {
    try {
      sources.set(file, readFileSync(file, "utf8"));
    } catch {
      sources.set(file, null);
    }
  }
  return sources.get(file);
}

function walk(dir, out = []) {
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) {
      if (entry === "node_modules" || entry === ".next") continue;
      walk(full, out);
    } else if (entry.endsWith(".tsx")) {
      out.push(full);
    }
  }
  return out;
}

const files = [join(ROOT, "components"), join(ROOT, "app")]
  .filter((dir) => {
    try {
      return statSync(dir).isDirectory();
    } catch {
      return false;
    }
  })
  .flatMap((dir) => walk(dir));

/** Where a name is imported from, if it is. */
function importSpec(source, name) {
  for (const match of source.matchAll(/import\s*\{([^}]+)\}\s*from\s*["']([^"']+)["']/g)) {
    const names = match[1].split(",").map((n) => n.trim().split(/\s+as\s+/)[0].trim());
    if (names.includes(name)) return match[2];
  }
  return null;
}

/** Resolves `@/lib/foo` or `./foo` to a real `.ts` path. */
function moduleFile(fromFile, spec) {
  const base = spec.startsWith("@/") ? resolve(ROOT, spec.slice(2)) : resolve(dirname(fromFile), spec);
  for (const candidate of [`${base}.ts`, join(base, "index.ts")]) {
    try {
      if (statSync(candidate).isFile()) return candidate;
    } catch {
      // Next candidate.
    }
  }
  return null;
}

/**
 * Follows a name to the file that declares it.
 *
 * Returns the declaring file and the name as spelled there, so a collection
 * used in a component can be traced back through however many data modules to
 * the literal that defines it.
 */
function declarationOf(file, name) {
  const source = read(file);
  if (!source) return null;
  if (new RegExp(`\\bconst\\s+${name}\\b`).test(source)) return { file, name, source };

  const spec = importSpec(source, name);
  if (!spec) return null;
  const target = moduleFile(file, spec);
  if (!target) return null;

  const targetSource = read(target);
  if (!targetSource) return null;
  return { file: target, name, source: targetSource };
}

/* ────────────────────────────  Literal parsing  ──────────────────────────── */

/** Body of `const NAME[: Type] = [ … ]`, brace-matched. */
function arrayBody(source, name) {
  const start = new RegExp(`\\bconst\\s+${name}\\b[^=\\n]*=\\s*\\[`).exec(source);
  if (!start) return null;

  let depth = 0;
  let i = start.index + start[0].length - 1;
  for (; i < source.length; i += 1) {
    if (source[i] === "[") depth += 1;
    else if (source[i] === "]") {
      depth -= 1;
      if (depth === 0) break;
    }
  }
  return depth === 0 ? source.slice(start.index + start[0].length, i) : null;
}

/** Top-level entries of an array-literal body. */
function entriesOf(body) {
  const entries = [];
  let depth = 0;
  let start = 0;
  let quote = null;

  for (let i = 0; i < body.length; i += 1) {
    const ch = body[i];
    if (quote) {
      if (ch === "\\") i += 1;
      else if (ch === quote) quote = null;
      continue;
    }
    if (ch === '"' || ch === "'" || ch === "`") quote = ch;
    else if (ch === "{" || ch === "[" || ch === "(") depth += 1;
    else if (ch === "}" || ch === "]" || ch === ")") depth -= 1;
    else if (ch === "," && depth === 0) {
      entries.push(body.slice(start, i));
      start = i + 1;
    }
  }
  entries.push(body.slice(start));

  return entries.filter((entry) => entry.trim().length > 0);
}

/**
 * How many items a named array holds.
 *
 * Follows the derived form as well as the literal one: `PROOF_POINTS` is
 * `PROJECTS.map(…)`, so its length is `PROJECTS`'s length, one module over.
 * That chain is exactly what produced the duplicate — the metric read a count
 * of a count — so not following it would leave the check blind to its own
 * motivating case.
 */
function arrayLength(file, name, seen = new Set()) {
  const found = declarationOf(file, name);
  if (!found) return null;

  const fingerprint = `${found.file}#${found.name}`;
  if (seen.has(fingerprint)) return null;
  seen.add(fingerprint);

  const body = arrayBody(found.source, found.name);
  if (body !== null) return entriesOf(body).length;

  // `const X = Y.map(…)` / `Y.filter(…)` — same cardinality for map, so only
  // map is followed. filter and slice can shorten, and guessing there would be
  // worse than reporting the site unverified.
  const derived = new RegExp(`\\bconst\\s+${found.name}\\b[^=\\n]*=\\s*([A-Za-z_$][\\w$]*)\\.map\\(`).exec(
    found.source,
  );
  if (derived) return arrayLength(found.file, derived[1], seen);

  return null;
}

/**
 * Values of one field across an array literal's entries.
 *
 * Understands the value forms these literals actually use: a quoted string, a
 * number, and `String(X.length)`. The quoted form is matched directly rather
 * than by reading to the next comma, because "Practices, discovery to
 * production" contains one and splitting on it silently truncated the value.
 */
function fieldValues(file, body, field) {
  const values = [];

  for (const entry of entriesOf(body)) {
    /*
     * A list of bare strings keyed on the string itself — `SOCIALS.map((s) =>
     * <a key={s}>)`. Idiomatic, and unique right up until the day somebody adds
     * a repeat, which is precisely the case worth checking.
     */
    if (field === null) {
      const scalar = /^\s*("(?:[^"\\]|\\.)*"|'(?:[^'\\]|\\.)*'|-?\d+(?:\.\d+)?)\s*$/s.exec(entry);
      if (!scalar) return null;
      const literal = scalar[1];
      const quoted = /^["'](.*)["']$/s.exec(literal);
      values.push(quoted ? quoted[1] : literal);
      continue;
    }

    const prop = new RegExp(
      `\\b${field}\\s*:\\s*("(?:[^"\\\\]|\\\\.)*"|'(?:[^'\\\\]|\\\\.)*'|String\\([^)]*\\)|-?\\d+(?:\\.\\d+)?)`,
    ).exec(entry);
    if (!prop) return null;

    const expr = prop[1].trim();

    const quoted = /^["'](.*)["']$/s.exec(expr);
    if (quoted) {
      values.push(quoted[1]);
      continue;
    }
    if (/^-?\d+(\.\d+)?$/.test(expr)) {
      values.push(expr);
      continue;
    }

    const counted = /^String\(\s*([A-Za-z_$][\w$]*)\.length\s*\)$/.exec(expr);
    if (counted) {
      const length = arrayLength(file, counted[1]);
      if (length === null) return null;
      values.push(String(length));
      continue;
    }

    return null;
  }

  return values;
}

/* ────────────────────────────  Finding the sites  ──────────────────────────── */

/**
 * `COLLECTION.map((item[, i]) => … key={…} …)`.
 *
 * Regex rather than a parser because the shape is house style and completely
 * regular. A list written some other way is simply not matched, which lands it
 * in `unresolved` rather than being mis-read.
 */
const MAP_SITE =
  /\b([A-Za-z_$][\w$]*(?:\.[\w$]+)*)\s*\.map\(\s*\(?\s*([A-Za-z_$][\w$]*)\s*(?:,\s*([A-Za-z_$][\w$]*)\s*)?\)?\s*=>/g;

function findSites(file) {
  const source = read(file);
  if (!source) return [];
  const sites = [];

  for (const match of source.matchAll(MAP_SITE)) {
    const [, collection, param, indexParam] = match;

    const after = source.slice(match.index + match[0].length, match.index + match[0].length + 1200);
    const keyMatch = /key=\{([^}]+)\}/.exec(after);
    if (!keyMatch) continue;

    const key = keyMatch[1].trim();
    const line = source.slice(0, match.index).split("\n").length;

    /*
     * `key={i}` is position-as-identity: unique by construction whatever the
     * data holds, and the right key for a fixed sequence. Verified, not
     * unreadable.
     */
    if (indexParam && key === indexParam) {
      sites.push({ file, line, collection, key, kind: "index" });
      continue;
    }

    const field = new RegExp(`^${param}\\.([\\w$]+)$`).exec(key);
    if (!field && key !== param) {
      sites.push({ file, line, collection, key, kind: "opaque" });
      continue;
    }

    sites.push({ file, line, collection, key, kind: "field", field: field ? field[1] : null, source });
  }

  return sites;
}

/* ────────────────────────────  Checking  ──────────────────────────── */

const duplicates = [];
const unresolved = [];
let checked = 0;

for (const file of files) {
  for (const site of findSites(file)) {
    const where = `${relative(ROOT, site.file)}:${site.line}`;

    if (site.kind === "index") {
      checked += 1;
      continue;
    }

    if (site.kind === "opaque") {
      unresolved.push(`  ${where} — key={${site.key}} is not a plain field of ${site.collection}`);
      continue;
    }

    // A dotted collection (`p.tags`) is a property of a runtime value, not a
    // module-level array; nothing static to read.
    const root = site.collection.includes(".") ? null : declarationOf(site.file, site.collection);
    const body = root ? arrayBody(root.source, root.name) : null;
    // `site.field` is null when the key is the item itself, which is a valid
    // shape for a list of scalars — pass it through rather than skipping.
    const values = body !== null ? fieldValues(root.file, body, site.field) : null;

    if (!values) {
      unresolved.push(`  ${where} — could not evaluate ${site.collection} / key={${site.key}}`);
      continue;
    }

    checked += 1;

    const counts = new Map();
    for (const value of values) counts.set(String(value), (counts.get(String(value)) ?? 0) + 1);

    const clashes = [...counts].filter(([, n]) => n > 1);
    if (clashes.length) {
      duplicates.push(
        `  ${where} — ${site.collection} keyed on \`${site.key}\` repeats: ` +
          clashes.map(([v, n]) => `"${v}" ×${n}`).join(", "),
      );
    }
  }
}

if (duplicates.length) {
  console.error(`react-keys: FAILED — ${duplicates.length} list(s) render duplicate keys:`);
  for (const line of duplicates) console.error(line);
  console.error(
    "\n  A key has to identify the item, not describe it. Key on the field that is\n" +
      "  unique by construction — an id, a name, a label — or on the index when the\n" +
      "  list is a fixed sequence.",
  );
  process.exit(1);
}

console.log(
  `react-keys: OK — ${checked} keyed list(s) verified unique` +
    (unresolved.length ? `, ${unresolved.length} not statically checkable.` : "."),
);

if (unresolved.length && process.env.CHECK_KEYS_VERBOSE) {
  for (const line of unresolved) console.log(line);
}
