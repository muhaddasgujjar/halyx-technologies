import "server-only";
import Groq from "groq-sdk";
import {
  ProviderError,
  type CoreMessage,
  type Provider,
  type ProviderEvent,
  type StreamArgs,
  type ToolCall,
  type ToolSpec,
} from "./types";

/**
 * Groq adapter — fast inference, OpenAI-shaped wire format.
 *
 * **Model choice is the whole risk here.** Groq retires models on a rolling
 * schedule and does not keep the old id alive: `llama-3.3-70b-versatile` and
 * `llama-3.1-8b-instant` — the two ids most code reaches for by reflex — were
 * shut down on 2026-08-16, and a request naming either now fails outright.
 *
 * Two defences:
 *   1. The default below is a current production model that Groq itself names
 *      as the replacement for the retired 70B tier, and it is overridable with
 *      `GROQ_MODEL` so a retirement is an env change, not a deploy.
 *   2. `liveModels()` checks the configured id against Groq's live catalogue
 *      and is surfaced by `GET /api/chat`, so the next retirement shows up as a
 *      failing health check instead of a broken chat widget.
 */

/**
 * `openai/gpt-oss-120b` — production, 131K context, 65K max output, supports
 * tool use, and is Groq's own recommended replacement for the retired
 * `llama-3.3-70b-versatile`. Its 20B sibling (`openai/gpt-oss-20b`) is the
 * cheaper drop-in if latency ever matters more than answer quality.
 */
const DEFAULT_MODEL = "openai/gpt-oss-120b";

const MODEL = process.env.GROQ_MODEL ?? DEFAULT_MODEL;

/** A ceiling, not a target: answers here are two to four sentences. */
const MAX_TOKENS = 4_096;

let cached: Groq | null = null;

function client(): Groq {
  if (!cached) {
    cached = new Groq({ maxRetries: 2, timeout: 45_000 });
  }
  return cached;
}

export function groqConfigured(): boolean {
  return Boolean(process.env.GROQ_API_KEY);
}

export const groqModel = MODEL;

/* ────────────────────────────  Translation  ──────────────────────────── */

function toTools(tools: ToolSpec[]): Groq.Chat.Completions.ChatCompletionTool[] {
  return tools.map((tool) => ({
    type: "function",
    function: {
      name: tool.name,
      description: tool.description,
      parameters: tool.parameters,
    },
  }));
}

/**
 * Flattens the neutral transcript into OpenAI-shaped messages.
 *
 * The shape difference that matters: Anthropic returns every tool result in one
 * `user` turn, Groq wants one `tool` message per call. Getting this wrong does
 * not error — the model just silently stops making parallel calls.
 */
function toMessages(
  system: string,
  messages: CoreMessage[],
): Groq.Chat.Completions.ChatCompletionMessageParam[] {
  const out: Groq.Chat.Completions.ChatCompletionMessageParam[] = [
    { role: "system", content: system },
  ];

  for (const message of messages) {
    switch (message.role) {
      case "user":
      case "assistant":
        out.push({ role: message.role, content: message.content });
        break;
      case "assistant-tools":
        out.push({
          role: "assistant",
          content: null,
          tool_calls: message.native as Groq.Chat.Completions.ChatCompletionMessageToolCall[],
        });
        break;
      case "tool-results":
        for (const result of message.results) {
          out.push({ role: "tool", tool_call_id: result.callId, content: result.content });
        }
        break;
    }
  }

  return out;
}

/** Partial tool call being reassembled from stream deltas. */
interface PartialCall {
  id: string;
  name: string;
  /** JSON arrives a fragment at a time and is only parseable once complete. */
  args: string;
}

/**
 * Maps an SDK exception onto the neutral failure vocabulary.
 *
 * The `model_gone` branch is the one that earns its keep: a retired Groq model
 * comes back as a 404 or a 400 whose body mentions the model, and that is
 * worth distinguishing from a generic upstream error because it is the failure
 * that will actually happen, months from now, with no code change to blame.
 */
function translate(error: unknown): ProviderError {
  if (error instanceof Groq.AuthenticationError) {
    return new ProviderError("auth", "groq", error.message, error.status);
  }
  if (error instanceof Groq.RateLimitError) {
    return new ProviderError("rate_limit", "groq", error.message, error.status);
  }
  if (error instanceof Groq.NotFoundError) {
    return new ProviderError("model_gone", "groq", `model "${MODEL}": ${error.message}`, error.status);
  }
  if (error instanceof Groq.BadRequestError) {
    const text = error.message.toLowerCase();
    const retired =
      text.includes("model") &&
      (text.includes("decommission") ||
        text.includes("deprecat") ||
        text.includes("not found") ||
        text.includes("does not exist"));
    return new ProviderError(
      retired ? "model_gone" : "upstream",
      "groq",
      `model "${MODEL}": ${error.message}`,
      error.status,
    );
  }
  if (error instanceof Groq.APIError) {
    return new ProviderError("upstream", "groq", error.message, error.status);
  }
  return new ProviderError("unknown", "groq", error instanceof Error ? error.message : String(error));
}

/**
 * How much of a declared tool name a mangled one has to get right.
 *
 * The observed corruptions all keep a long, correct head and lose the tail —
 * `search_halyqjson`, `search_halyqary` — so a prefix test catches them.
 * Six characters is past the point where the two declared tools diverge
 * (`search` vs `captur`) without being so long that a corruption starting
 * earlier is missed.
 */
const MIN_REPAIR_PREFIX = 6;

/** Length of the common prefix of two strings. */
function sharedPrefix(a: string, b: string): number {
  const limit = Math.min(a.length, b.length);
  let i = 0;
  while (i < limit && a[i] === b[i]) i += 1;
  return i;
}

/**
 * Maps a mangled tool name back to the declared one it was meant to be.
 *
 * Returns null unless *exactly one* declared tool is a plausible match. That
 * strictness is the point: guessing wrong runs the wrong tool, which is worse
 * than dropping the call and letting the model try again with the round it has
 * left. Ambiguity means drop.
 *
 * Only ever narrows to a name the caller declared, so nothing this returns can
 * reach Groq's validator as an undeclared tool — which is the failure it exists
 * to prevent.
 */
function repairToolName(mangled: string, declared: Set<string>): string | null {
  let match: string | null = null;

  for (const name of declared) {
    const shared = sharedPrefix(mangled, name);
    if (shared < Math.min(MIN_REPAIR_PREFIX, name.length)) continue;
    // A second candidate makes it ambiguous; stop rather than pick.
    if (match) return null;
    match = name;
  }

  return match;
}

/* ────────────────────────────  Provider  ──────────────────────────── */

export const groqProvider: Provider = {
  id: "groq",
  model: MODEL,

  async *stream({ system, messages, tools, signal }: StreamArgs): AsyncGenerator<ProviderEvent> {
    try {
      const stream = await client().chat.completions.create(
        {
          model: MODEL,
          messages: toMessages(system, messages),
          tools: toTools(tools),
          tool_choice: "auto",
          max_completion_tokens: MAX_TOKENS,
          // A sales assistant that paraphrases its source is worse than one that
          // quotes it. Low, not zero: zero makes repeated answers robotic.
          temperature: 0.4,
          /*
           * gpt-oss is a reasoning model. `include_reasoning: false` keeps the
           * chain of thought out of the response entirely — without it the
           * reasoning arrives in a sibling field that is easy to leak into the
           * chat bubble by accident. `reasoning_effort: "low"` is the chat-surface
           * setting: first-token latency beats depth on "what do you charge".
           */
          include_reasoning: false,
          reasoning_effort: "low",
          stream: true,
        },
        { signal },
      );

      // Tool calls stream as fragments keyed by index, not by id — the id
      // arrives once, the arguments arrive character by character.
      const partial = new Map<number, PartialCall>();
      let finishReason: string | null = null;
      let usage: { input: number; output: number } = { input: 0, output: 0 };

      for await (const chunk of stream) {
        // Usage only appears on the final chunk, and only when the run completes.
        if (chunk.x_groq?.usage) {
          usage = {
            input: chunk.x_groq.usage.prompt_tokens ?? 0,
            output: chunk.x_groq.usage.completion_tokens ?? 0,
          };
        }

        const choice = chunk.choices[0];
        if (!choice) continue;

        if (choice.finish_reason) finishReason = choice.finish_reason;

        if (choice.delta.content) {
          yield { type: "text", text: choice.delta.content };
        }

        for (const call of choice.delta.tool_calls ?? []) {
          const slot = partial.get(call.index) ?? { id: "", name: "", args: "" };
          if (call.id) slot.id = call.id;
          if (call.function?.name) slot.name = call.function.name;
          if (call.function?.arguments) slot.args += call.function.arguments;
          partial.set(call.index, slot);
        }
      }

      const calls: ToolCall[] = [];
      const native: Groq.Chat.Completions.ChatCompletionMessageToolCall[] = [];
      const declared = new Set(tools.map((tool) => tool.name));

      for (const [index, slot] of [...partial].sort(([a], [b]) => a - b)) {
        if (!slot.name) continue;

        /*
         * Never echo a tool name we did not declare.
         *
         * gpt-oss occasionally emits a mangled name — `search_halyqjson` and
         * `search_halyqary` have both been seen in this deployment, the harmony
         * control tokens bleeding into the function name. Groq's own validator
         * rejects those, and because the malformed call goes back out in the
         * next request's assistant message, one bad token kills the whole turn
         * with "attempted to call tool X which was not in request.tools".
         *
         * A mangled name is still recognisable, so repair it when exactly one
         * declared tool matches on a decent prefix, and drop it otherwise. A
         * dropped call costs a round; a poisoned message list costs the turn.
         */
        if (!declared.has(slot.name)) {
          const repaired = repairToolName(slot.name, declared);
          if (repaired) {
            console.warn(`[groq] repaired mangled tool name "${slot.name}" -> "${repaired}"`);
            slot.name = repaired;
          } else {
            console.warn(`[groq] dropped unrecognised tool call "${slot.name}"`);
            continue;
          }
        }

        let input: unknown;
        try {
          // Never string-match serialised tool arguments — parse them.
          input = slot.args ? JSON.parse(slot.args) : {};
        } catch {
          // A truncated argument stream is a real outcome when the model hits
          // the token ceiling. Hand the call through with empty input so the
          // tool's own validation produces a message the model can recover from,
          // rather than throwing and killing the turn.
          console.warn("[groq] unparseable tool arguments", { index, name: slot.name });
          input = {};
        }

        const id = slot.id || `call_${index}`;
        calls.push({ id, name: slot.name, input });
        native.push({
          id,
          type: "function",
          function: { name: slot.name, arguments: slot.args || "{}" },
        });
      }

      yield {
        type: "final",
        calls,
        native,
        stopReason: finishReason,
        // Groq has no prompt cache, so the saving the Anthropic path gets from
        // a cached prefix simply is not available here.
        usage: { ...usage, cacheRead: 0 },
      };
    } catch (error) {
      if (error instanceof Error && error.name === "AbortError") throw error;
      if (error instanceof Groq.APIUserAbortError) {
        throw Object.assign(new Error("aborted"), { name: "AbortError" });
      }
      throw translate(error);
    }
  },
};

/* ────────────────────────────  Liveness  ──────────────────────────── */

interface ModelCheck {
  model: string;
  /** `null` when the catalogue could not be read — unknown, not "missing". */
  live: boolean | null;
  checkedAt: string;
  /** Present when `live` is false: what Groq currently offers instead. */
  available?: string[];
}

let modelCheck: { value: ModelCheck; expires: number } | null = null;
const CHECK_TTL_MS = 10 * 60_000;

/**
 * Asks Groq whether the configured model still exists.
 *
 * This is the durable answer to model retirement: rather than trusting a
 * hardcoded id to stay valid, the health endpoint reports the truth from the
 * catalogue. Cached for ten minutes so a monitoring probe cannot turn into a
 * rate-limit problem of its own.
 */
export async function checkModel(): Promise<ModelCheck> {
  const now = Date.now();
  if (modelCheck && modelCheck.expires > now) return modelCheck.value;

  if (!groqConfigured()) {
    return { model: MODEL, live: null, checkedAt: new Date(now).toISOString() };
  }

  try {
    const list = await client().models.list();
    const ids = (list.data ?? []).map((m) => m.id);
    const live = ids.includes(MODEL);

    const value: ModelCheck = {
      model: MODEL,
      live,
      checkedAt: new Date(now).toISOString(),
      ...(live ? {} : { available: ids.sort() }),
    };

    if (!live) {
      console.error(
        `[groq] configured model "${MODEL}" is not in Groq's catalogue — it has probably been decommissioned. Set GROQ_MODEL to one of: ${ids.join(", ")}`,
      );
    }

    modelCheck = { value, expires: now + CHECK_TTL_MS };
    return value;
  } catch (error) {
    // A failed catalogue read says nothing about the model, so do not cache it
    // as a verdict.
    console.warn("[groq] model catalogue unreadable:", error instanceof Error ? error.message : error);
    return { model: MODEL, live: null, checkedAt: new Date(now).toISOString() };
  }
}
