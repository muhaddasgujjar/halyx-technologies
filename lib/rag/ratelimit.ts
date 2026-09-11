import "server-only";

/**
 * Per-client rate limiting for the paid endpoints.
 *
 * **Scope, honestly stated.** This is an in-process sliding window. On a single
 * long-lived Node server it is exact; on serverless it is per-instance, so a
 * visitor spread across N warm instances gets up to N times the allowance. That
 * is still worth having — it stops the single-tab scripted abuse that actually
 * happens, and it costs nothing. The moment this endpoint is worth attacking
 * properly, replace `hit()` with a Redis/Upstash `INCR` + `EXPIRE` against the
 * same signature; nothing else has to change.
 *
 * Every request to these routes reaches a paid model, so the limit is a cost
 * control first and an abuse control second.
 *
 * **Budgets are per route, not shared.** They used to be one counter across
 * chat, transcription and synthesis, which was a bug rather than a policy: one
 * spoken turn spends a transcription, a chat and one synthesis per sentence, so
 * a visitor who asked two questions in half a minute hit a 429 and was told the
 * assistant was overloaded. The three have genuinely different shapes — a
 * sentence of speech is a hundredth of the cost of a chat turn and happens ten
 * times as often — so each gets a window sized to what it actually does.
 */

export interface Limit {
  /** Requests permitted inside the window. */
  max: number;
  /** Window length in milliseconds. */
  windowMs: number;
}

/** Which budget a request spends from. */
export type Bucket = "chat" | "stt" | "tts";

interface Budget {
  /** Burst guard: a human cannot go this fast, a script can. */
  burst: Limit;
  /** Session guard: caps what one visitor can cost in an hour. */
  sustained: Limit;
}

/**
 * The three budgets.
 *
 * Sized from one real conversation rather than from a round number. A spoken
 * turn is: one transcription, one chat turn, and one synthesis per sentence —
 * call it three or four. A brisk exchange runs a turn every fifteen seconds, so
 * the burst windows are set at roughly three times that rate, which leaves an
 * excited visitor room while still catching a script.
 */
const BUDGETS: Record<Bucket, Budget> = {
  chat: {
    burst: { max: 8, windowMs: 30_000 },
    sustained: { max: 80, windowMs: 60 * 60_000 },
  },
  stt: {
    burst: { max: 12, windowMs: 30_000 },
    sustained: { max: 200, windowMs: 60 * 60_000 },
  },
  /*
   * Synthesis is called per sentence rather than per reply — that is what lets
   * the agent start speaking before it has finished thinking — so a single
   * four-sentence answer spends four of these. The budget is sized for that,
   * and each call is a fraction of a chat turn's cost.
   */
  tts: {
    burst: { max: 30, windowMs: 30_000 },
    sustained: { max: 500, windowMs: 60 * 60_000 },
  },
};

/** Kept as named exports because the chat budget is the one worth quoting. */
export const BURST: Limit = BUDGETS.chat.burst;
export const SUSTAINED: Limit = BUDGETS.chat.sustained;

/** The longest window any budget uses. Drives eviction. */
const MAX_WINDOW_MS = Math.max(...Object.values(BUDGETS).map((b) => b.sustained.windowMs));

export interface Verdict {
  ok: boolean;
  /** Seconds until the caller may retry. Feeds the `Retry-After` header. */
  retryAfter: number;
  /** Requests left in the tighter of the two windows. */
  remaining: number;
}

/** `bucket|client key` -> ascending timestamps of recent requests. */
const hits = new Map<string, number[]>();

/**
 * Drops keys whose newest entry has aged out of the longest window, so an
 * always-warm instance does not accumulate a map entry per visitor forever.
 * Runs opportunistically on write rather than on a timer — a timer would keep
 * a serverless instance alive.
 */
let lastSweep = 0;
const SWEEP_INTERVAL_MS = 5 * 60_000;

function sweep(now: number) {
  if (now - lastSweep < SWEEP_INTERVAL_MS) return;
  lastSweep = now;
  const cutoff = now - MAX_WINDOW_MS;
  for (const [key, times] of hits) {
    if (times.length === 0 || times[times.length - 1] < cutoff) hits.delete(key);
  }
}

/**
 * Records a request against `key` in `bucket` and reports whether it is allowed.
 *
 * A rejected request is *not* recorded, so a client hammering a closed door
 * does not extend its own lockout indefinitely.
 */
export function hit(key: string, bucket: Bucket = "chat"): Verdict {
  const now = Date.now();
  sweep(now);

  const budget = BUDGETS[bucket];
  const slot = `${bucket}|${key}`;
  const times = (hits.get(slot) ?? []).filter((t) => now - t < budget.sustained.windowMs);

  for (const limit of [budget.burst, budget.sustained]) {
    const inWindow = times.filter((t) => now - t < limit.windowMs);
    if (inWindow.length >= limit.max) {
      hits.set(slot, times);
      const oldest = inWindow[0];
      return {
        ok: false,
        retryAfter: Math.max(1, Math.ceil((limit.windowMs - (now - oldest)) / 1000)),
        remaining: 0,
      };
    }
  }

  times.push(now);
  hits.set(slot, times);

  const burstUsed = times.filter((t) => now - t < budget.burst.windowMs).length;
  return { ok: true, retryAfter: 0, remaining: Math.max(0, budget.burst.max - burstUsed) };
}

/**
 * Best-effort client identity.
 *
 * `x-forwarded-for` is trivially spoofable in general, but on Vercel and every
 * mainstream proxy the left-most entry is set by the edge and is the only value
 * available. Treat the result as a coarse bucket, never as an identity.
 */
export function clientKey(headers: Headers): string {
  const forwarded = headers.get("x-forwarded-for");
  if (forwarded) {
    const first = forwarded.split(",")[0]?.trim();
    if (first) return first;
  }
  return headers.get("x-real-ip") ?? headers.get("cf-connecting-ip") ?? "unknown";
}
