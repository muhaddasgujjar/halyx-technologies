/**
 * The agent's name must be identical in all three places that mention it.
 *
 * A LiveKit worker that registers with an `agent_name` is never dispatched
 * automatically — only explicitly, by name, from the room configuration in the
 * visitor's token. So the string in `agent.py`, the string in the token route,
 * and the string in the deployment manifest have to agree exactly.
 *
 * When they do not, nothing errors. The browser gets a valid token, joins a
 * real room, publishes its microphone, and waits — in a room no worker is ever
 * told to join. The visitor sees a connected console and hears silence, and the
 * worker's logs are empty because it was never asked to do anything. It is the
 * most expensive failure in this architecture to diagnose and the cheapest to
 * prevent, which is what this file is for.
 *
 * Run by `npm run build`, alongside the other checks.
 */

import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");

const sources = [
  {
    file: "agent/agent.py",
    // AGENT_NAME = "halyx-agent"
    pattern: /^AGENT_NAME\s*=\s*"([^"]+)"/m,
  },
  {
    file: "app/api/livekit/token/route.ts",
    // const AGENT_NAME = "halyx-agent";
    pattern: /const\s+AGENT_NAME\s*=\s*"([^"]+)"/,
  },
  {
    file: "agent/livekit.toml",
    // agent_name = "halyx-agent"
    pattern: /^\s*agent_name\s*=\s*"([^"]+)"/m,
  },
];

const found = [];
for (const { file, pattern } of sources) {
  let text;
  try {
    text = readFileSync(join(root, file), "utf8");
  } catch {
    console.error(`agent-name: FAIL — ${file} is missing.`);
    process.exit(1);
  }
  const match = pattern.exec(text);
  if (!match) {
    console.error(`agent-name: FAIL — no agent name found in ${file}.`);
    process.exit(1);
  }
  found.push({ file, name: match[1] });
}

const names = new Set(found.map((f) => f.name));
if (names.size !== 1) {
  console.error("agent-name: FAIL — the agent name disagrees between files\n");
  for (const f of found) console.error(`  ${f.file.padEnd(38)} "${f.name}"`);
  console.error(
    "\n  A named worker is dispatched by name. While these differ, visitors join\n" +
      "  a room the worker is never asked to enter — no error, just silence.",
  );
  process.exit(1);
}

console.log(`agent-name: OK — "${[...names][0]}" matches across ${found.length} files.`);
