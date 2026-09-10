import "server-only";

/**
 * Per-client rate limiting for the chat endpoint.
 *
 * **Scope, honestly stated.** This is an in-process sliding window. On a single
 * long-lived Node server it is exact; on serverless it is per-instance, so a
 * visitor spread across N warm instances gets up to N times the allowance. That
 * is still worth having — it stops the single-tab scripted abuse that actually
 * happens, and it costs nothing. The moment this endpoint is worth attacking
 * properly, replace `hit()` with a Redis/Upstash `INCR` + `EXPIRE` against the
 * same signature; nothing else has to change.
 *
 * Every request to this route reaches a paid model, so the limit is a cost
 * control first and an abuse control second.
 */

export interface Limit {
  /** Requests permitted inside the window. */
  max: number;
  /** Window length in milliseconds. */
  windowMs: number;
}

/** Burst guard: a human cannot type this fast, a script can. */
export const BURST: Limit = { max: 6, windowMs: 30_000 };

/** Session guard: caps what one visitor can cost in an hour. */
export const SUSTAINED: Limit = { max: 60, windowMs: 60 * 60_000 };

export interface Verdict {
  ok: boolean;
  /** Seconds until the caller may retry. Feeds the `Retry-After` header. */
  retryAfter: number;
  /** Requests left in the tighter of the two windows. */
  remaining: number;
}

/** client key -> ascending timestamps of recent requests. */
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
  const cutoff = now - SUSTAINED.windowMs;
  for (const [key, times] of hits) {
    if (times.length === 0 || times[times.length - 1] < cutoff) hits.delete(key);
  }
}

/**
 * Records a request against `key` and reports whether it is allowed.
 *
 * A rejected request is *not* recorded, so a client hammering a closed door
 * does not extend its own lockout indefinitely.
 */
export function hit(key: string): Verdict {
  const now = Date.now();
  sweep(now);

  const times = (hits.get(key) ?? []).filter((t) => now - t < SUSTAINED.windowMs);

  for (const limit of [BURST, SUSTAINED]) {
    const inWindow = times.filter((t) => now - t < limit.windowMs);
    if (inWindow.length >= limit.max) {
      hits.set(key, times);
      const oldest = inWindow[0];
      return {
        ok: false,
        retryAfter: Math.max(1, Math.ceil((limit.windowMs - (now - oldest)) / 1000)),
        remaining: 0,
      };
    }
  }

  times.push(now);
  hits.set(key, times);

  const burstUsed = times.filter((t) => now - t < BURST.windowMs).length;
  return { ok: true, retryAfter: 0, remaining: Math.max(0, BURST.max - burstUsed) };
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
