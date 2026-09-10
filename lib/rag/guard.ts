import { DEFAULT_LOCALE, isLanguageCode } from "../i18n/languages";
import type { ChatMode } from "./prompt";
import type { ErrorCode, Turn } from "./types";

/**
 * Request validation for the chat endpoint.
 *
 * The transcript arrives from the browser, which means it is attacker-supplied
 * in full: a caller can send any history they like, including a fabricated
 * assistant turn that "already agreed" to something. Two defences, both here:
 * the caps below bound what it can cost, and the assistant turns are re-labelled
 * as prior *replies* rather than trusted instructions when they are replayed.
 * The system prompt is never client-supplied, which is the part that matters.
 */

/** One visitor message. Long enough for a real brief, short enough to bound cost. */
export const MAX_MESSAGE_CHARS = 1_200;

/** Turns of history replayed to the model. Ten exchanges is more than the dock shows. */
export const MAX_HISTORY_TURNS = 20;

/** Per-turn cap on replayed history. Assistant turns are ours and stay well under. */
export const MAX_TURN_CHARS = 2_000;

/** Whole-transcript cap, the real cost ceiling. */
export const MAX_TRANSCRIPT_CHARS = 12_000;

export interface ChatRequest {
  message: string;
  history: Turn[];
  /**
   * Which persona answers. `voice` is the Halyx AI console — it speaks aloud,
   * answers off-topic questions and refuses to quote prices. Anything the client
   * does not recognise falls back to `text`, so a malformed value degrades to
   * the stricter persona rather than the looser one.
   */
  mode: ChatMode;
  /**
   * The language the visitor picked in the navbar, as a registry code.
   *
   * A *default*, not a lock: it decides which language the agent opens in and
   * falls back to, while the persona is still told to follow the visitor if
   * they write in something else. Validated against the registry rather than
   * passed through, because it is interpolated into the system prompt — an
   * unchecked string there is a prompt-injection hole with a very short path.
   */
  locale: string;
}

export type Validation =
  | { ok: true; value: ChatRequest }
  | { ok: false; code: ErrorCode; message: string };

/**
 * Strips control characters and normalises whitespace.
 *
 * Control characters are worth removing for their own sake, but the specific
 * reason here is that they are a standard way to smuggle instructions past a
 * reviewer's eyes while the model still reads them.
 */
function clean(input: string): string {
  return input
    .normalize("NFC")
    // eslint-disable-next-line no-control-regex -- deliberate: C0/C1 minus \n and \t.
    .replace(/[\u0000-\u0008\u000B-\u001F\u007F-\u009F]/g, "")
    .replace(/[\u200B-\u200D\uFEFF]/g, "")
    .replace(/[ \t]+/g, " ")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function isTurn(value: unknown): value is { role: string; content: string } {
  if (typeof value !== "object" || value === null) return false;
  const turn = value as Record<string, unknown>;
  return typeof turn.role === "string" && typeof turn.content === "string";
}

/** Parses and bounds a raw request body. Never throws. */
export function validate(body: unknown): Validation {
  if (typeof body !== "object" || body === null) {
    return { ok: false, code: "bad_request", message: "Expected a JSON object." };
  }

  const raw = body as Record<string, unknown>;

  if (typeof raw.message !== "string") {
    return { ok: false, code: "bad_request", message: "`message` must be a string." };
  }

  const message = clean(raw.message);

  if (message.length === 0) {
    return { ok: false, code: "bad_request", message: "Ask me something about Halyx." };
  }
  if (message.length > MAX_MESSAGE_CHARS) {
    return {
      ok: false,
      code: "too_long",
      message: `That is longer than I can take in one message — keep it under ${MAX_MESSAGE_CHARS} characters, or send the brief through the contact form.`,
    };
  }

  let history: Turn[] = [];

  if (raw.history !== undefined) {
    if (!Array.isArray(raw.history)) {
      return { ok: false, code: "bad_request", message: "`history` must be an array." };
    }

    history = raw.history
      .filter(isTurn)
      .filter((turn) => turn.role === "user" || turn.role === "assistant")
      .map((turn) => ({
        role: turn.role as Turn["role"],
        content: clean(turn.content).slice(0, MAX_TURN_CHARS),
      }))
      .filter((turn) => turn.content.length > 0)
      // Keep the most recent turns — the tail is what a follow-up refers to.
      .slice(-MAX_HISTORY_TURNS);

    /*
     * The Messages API requires the first turn to be `user`, and the dock's
     * transcript opens with the bot's greeting — so a well-behaved caller sends
     * a leading assistant turn every time. Trim it rather than 400-ing them.
     * A *trailing* assistant turn is fine: the live question is appended after
     * it, which is exactly the alternating shape the API wants.
     */
    while (history.length > 0 && history[0].role === "assistant") history.shift();
  }

  const transcriptChars =
    message.length + history.reduce((sum, turn) => sum + turn.content.length, 0);

  if (transcriptChars > MAX_TRANSCRIPT_CHARS) {
    // Drop from the front until it fits: older turns are the cheapest to lose.
    let budget = MAX_TRANSCRIPT_CHARS - message.length;
    const kept: Turn[] = [];
    for (let i = history.length - 1; i >= 0; i -= 1) {
      budget -= history[i].content.length;
      if (budget < 0) break;
      kept.unshift(history[i]);
    }
    while (kept.length > 0 && kept[0].role === "assistant") kept.shift();
    history = kept;
  }

  const mode: ChatMode = raw.mode === "voice" ? "voice" : "text";
  const locale = isLanguageCode(raw.locale) ? raw.locale : DEFAULT_LOCALE;

  return { ok: true, value: { message, history, mode, locale } };
}
