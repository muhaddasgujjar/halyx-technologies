/**
 * The seam between the assistant's logic and whoever is generating the tokens.
 *
 * Two providers ship: Anthropic (Claude) and Groq. They disagree about almost
 * everything at the wire level — Anthropic puts tool results in a `user` turn
 * as content blocks, Groq puts each one in its own `tool` message; Anthropic
 * streams typed events, Groq streams OpenAI-style deltas that have to be
 * reassembled by index. This file is the neutral vocabulary both are translated
 * into, so `chat.ts` runs one tool loop rather than two.
 */

/** A tool the model asked to run. `input` is already JSON-parsed. */
export interface ToolCall {
  id: string;
  name: string;
  input: unknown;
}

export interface ToolResult {
  callId: string;
  /** What the model reads back. Written for a reader — it acts on this. */
  content: string;
  isError: boolean;
}

/**
 * Provider-neutral conversation.
 *
 * `assistant-tools` carries `native` alongside the parsed calls: Anthropic
 * requires its own content blocks — thinking blocks included — echoed back
 * verbatim on the next request, and re-synthesising them from the parsed form
 * loses information. Each adapter reads `native` only if it wrote it.
 */
export type CoreMessage =
  | { role: "user"; content: string }
  | { role: "assistant"; content: string }
  | { role: "assistant-tools"; calls: ToolCall[]; native: unknown }
  | { role: "tool-results"; results: ToolResult[] };

/** A tool definition in plain JSON Schema, translated per provider. */
export interface ToolSpec {
  name: string;
  description: string;
  /** Object schema. Keep `additionalProperties: false` and list every key in `required`. */
  parameters: Record<string, unknown>;
}

export interface Usage {
  input: number;
  output: number;
  /** Tokens served from a prompt cache. Always 0 on providers without one. */
  cacheRead: number;
}

/**
 * What a provider emits for one request.
 *
 * Exactly one `final` is emitted, last. `text` events are the visible answer;
 * reasoning is suppressed at the provider level rather than filtered here.
 */
export type ProviderEvent =
  | { type: "text"; text: string }
  | { type: "final"; calls: ToolCall[]; native: unknown; stopReason: string | null; usage: Usage };

export interface StreamArgs {
  system: string;
  messages: CoreMessage[];
  tools: ToolSpec[];
  signal?: AbortSignal;
}

export interface Provider {
  /** Stable identifier, surfaced in logs and the health check. */
  id: "anthropic" | "groq";
  /** The exact model id in use, so a decommissioned model is visible from outside. */
  model: string;
  stream(args: StreamArgs): AsyncGenerator<ProviderEvent>;
}

/** Why a provider call failed, in terms the route can turn into a status code. */
export type FailureKind = "auth" | "rate_limit" | "model_gone" | "upstream" | "unknown";

/**
 * Normalised provider failure.
 *
 * `kind` is what the failover logic branches on: an `auth` or `model_gone`
 * failure on the primary is worth retrying on the secondary, a `rate_limit` is
 * worth surfacing, and `unknown` is worth logging loudly.
 */
export class ProviderError extends Error {
  constructor(
    readonly kind: FailureKind,
    readonly provider: Provider["id"],
    message: string,
    readonly status?: number,
  ) {
    super(message);
    this.name = "ProviderError";
  }
}
