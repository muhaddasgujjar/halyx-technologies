/**
 * Every source the assistant cites must land somewhere real.
 *
 * The assistant shows a "Sources" strip under its answers, built from the
 * `href` and `url` on each corpus chunk. Those anchors are hand-written strings
 * with nothing binding them to the sections they name, so they rot silently:
 * "Proof of work — Maiku AI" pointed at `#company`, which is Our Story, and
 * clicking it scrolled a prospect past the case studies to the wrong section
 * with no error anywhere. Renaming or removing a section id does the same thing
 * to every chunk that referenced it.
 *
 * This walks the rendered sections for their real ids and fails the build if a
 * chunk cites one that does not exist. A chunk with an external `url` is fine —
 * it opens the live product and never touches the page.
 *
 * Run by `npm run build`, alongside the other checks.
 */

import { readFileSync, readdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");

/** Section ids that actually exist in a component. */
function pageAnchors() {
  const found = new Set();
  const walk = (dir) => {
    for (const entry of readdirSync(dir, { withFileTypes: true })) {
      const path = join(dir, entry.name);
      if (entry.isDirectory()) {
        if (entry.name !== "node_modules") walk(path);
      } else if (entry.name.endsWith(".tsx")) {
        for (const m of readFileSync(path, "utf8").matchAll(/<section[^>]*\sid="([a-z0-9-]+)"/g)) {
          found.add(m[1]);
        }
      }
    }
  };
  walk(join(root, "components"));
  return found;
}

/**
 * Chunk links, read from the source rather than by importing the corpus.
 *
 * `corpus.ts` pulls in `server-only`, so it cannot be imported from a plain
 * node script. The shapes here are simple and stable — an `href:` string and an
 * optional `url:` — and reading them textually keeps this check free of the
 * app's module graph.
 */
function chunkLinks() {
  const files = ["lib/rag/corpus.ts"].map((f) => join(root, f));
  const links = [];
  for (const file of files) {
    const src = readFileSync(file, "utf8");
    // Each `href: "#anchor"` with the nearest following `url:` on the same chunk.
    for (const m of src.matchAll(/href:\s*"#([a-z0-9-]+)"/g)) {
      const after = src.slice(m.index, m.index + 260);
      links.push({ anchor: m[1], external: /\burl:\s*\S/.test(after), line: lineOf(src, m.index) });
    }
  }
  return links;
}

const lineOf = (src, index) => src.slice(0, index).split("\n").length;

const anchors = pageAnchors();
const links = chunkLinks();
const broken = links.filter((l) => !l.external && !anchors.has(l.anchor));

if (broken.length) {
  console.error("source-links: FAIL — chunks cite anchors that do not exist on the page\n");
  for (const b of broken) {
    console.error(`  lib/rag/corpus.ts:${b.line}  href "#${b.anchor}"`);
  }
  console.error(`\n  anchors that do exist: ${[...anchors].sort().join(", ")}`);
  console.error("  Add the id to the section, or point the chunk at one of the above.");
  process.exit(1);
}

console.log(
  `source-links: OK — ${links.length} chunk link(s) across ${anchors.size} page anchors, none broken.`,
);
