import "server-only";
import { CHUNKS_BY_ID } from "./corpus";
import type { ChatRequest } from "./guard";
import { deliverLead } from "./leads";
import { buildUserTurn, renderContext, systemPromptFor } from "./prompt";
import {
  isConfigured,
  ProviderError,
  selectProviders,
  type CoreMessage,
  type Provider,
  type ToolCall,
  type ToolResult,
  type ToolSpec,
} from "./providers";
import { retrieve, retrieveForConversation } from "./retriever";
import type { ChatEvent, Chunk, Hit } from "./types";

/**
 * The assistant's turn: retrieve, generate, run tools, stream.
 *
 * Exposed as an async generator of `ChatEvent` rather than as an HTTP response,
 * so the transport (SSE today, something else tomorrow) is the route handler's
 * problem and this file stays testable without a server. The model is reached
 * through the `Provider` seam, so Claude and Groq run the identical loop.
 */

export { isConfigured };

/**
 * Tool-loop bound. Two is the realistic worst case (one search, one capture);
 * four leaves room for a retry without letting a loop bill indefinitely.
 */
const MAX_TOOL_ROUNDS = 4;

/** Passages returned to a model-initiated search. Tighter than the opening retrieval. */
const SEARCH_TOP_K = 4;

/* ────────────────────────────  Tools  ──────────────────────────── */

/**
 * Tool definitions, in provider-neutral JSON Schema.
 *
 * Frozen and ordered: on the Anthropic path these render into the cached prefix,
 * so any change here — reordering included — invalidates every cached prompt.
 * Treat this array as append-only.
 *
 * Every property is listed in `required`, with nullable fields typed as
 * `["string", "null"]` rather than omitted. That is what Anthropic's `strict`
 * mode and OpenAI-style structured tool calls both want, and it means a missing
 * value arrives as an explicit `null` instead of an absent key — so `leads.ts`
 * can tell "the visitor did not say" from "the model forgot to ask".
 */
const TOOLS: ToolSpec[] = [
  {
    name: "search_halyx",
    description:
      "Search Halyx's knowledge base — services, case studies, pricing model, process, team, client quotes. Use this whenever the visitor asks about something the passages already in front of you do not cover, or when the conversation moves to a new topic. Prefer searching over saying you do not know.",
    parameters: {
      type: "object",
      additionalProperties: false,
      properties: {
        query: {
          type: "string",
          description:
            "What to look up, in the visitor's own words plus any terms that would help — e.g. 'voice agent latency case study' rather than 'voice'.",
        },
        section: {
          type: ["string", "null"],
          enum: [
            "company", "service", "case-study", "testimonial", "team",
            "process", "pricing", "faq", "contact", null,
          ],
          description: "Narrow to one section. Pass null to search everything, which is usually right.",
        },
      },
      required: ["query", "section"],
    },
  },
  {
    name: "capture_lead",
    description:
      "Send a visitor's details straight to the Halyx studio inbox. Call this as soon as someone gives you a name and an email, or asks to be contacted, quoted, or put in front of the team. Ask for anything missing before calling — never guess an email address. Call it once per conversation unless the details change.",
    parameters: {
      type: "object",
      additionalProperties: false,
      properties: {
        name: { type: "string", description: "The visitor's full name, as they gave it." },
        email: { type: "string", description: "Their email address, exactly as they typed it." },
        company: { type: ["string", "null"], description: "Company or organisation, or null if not given." },
        need: {
          type: "string",
          description:
            "What they are trying to build or fix, in your words — specific enough that the team can prepare before replying. Include the constraint if you learned it.",
        },
        budget: { type: ["string", "null"], description: "Any budget indication they gave, verbatim, or null." },
        timeline: { type: ["string", "null"], description: "Any timing or deadline they gave, verbatim, or null." },
      },
      required: ["name", "email", "company", "need", "budget", "timeline"],
    },
  },
];

/* ────────────────────────────  Helpers  ──────────────────────────── */

function toSource(chunk: Chunk) {
  return {
    id: chunk.id,
    title: chunk.title,
    section: chunk.section,
    href: chunk.href,
    url: chunk.url,
  };
}

/** Turns a normalised provider failure into a visitor-safe event plus a log line. */
function describeFailure(error: unknown): {
  event: Extract<ChatEvent, { type: "error" }>;
  log: string;
} {
  if (error instanceof ProviderError) {
    const log = `${error.provider}${error.status ? ` ${error.status}` : ""} [${error.kind}]: ${error.message}`;

    switch (error.kind) {
      case "auth":
      case "model_gone":
        // Both are operator errors. The visitor gets a route to a human; the
        // detail that distinguishes them is in the log, where it is actionable.
        return {
          event: {
            type: "error",
            code: "not_configured",
            message: "The assistant is not available right now. Email hello@halyx.tech and the team will pick it up.",
          },
          log,
        };
      case "rate_limit":
        return {
          event: {
            type: "error",
            code: "rate_limited",
            message: "I am getting more questions than I can keep up with. Try again in a moment.",
          },
          log,
        };
      default:
        return {
          event: {
            type: "error",
            code: "upstream",
            message: "That did not go through. Ask me again, or email hello@halyx.tech.",
          },
          log,
        };
    }
  }

  return {
    event: {
      type: "error",
      code: "internal",
      message: "Something went wrong on my side. Email hello@halyx.tech and the team will pick it up.",
    },
    log: error instanceof Error ? error.message : String(error),
  };
}

function isAbort(error: unknown): boolean {
  return error instanceof Error && error.name === "AbortError";
}

/* ────────────────────────────  Turn  ──────────────────────────── */

export interface RunOptions {
  signal?: AbortSignal;
}

/**
 * Runs one visitor turn end to end.
 *
 * Order matters: retrieval happens before any model is called, and `sources` is
 * emitted first, so the UI can show what the answer is grounded in while the
 * first tokens are still arriving.
 */
export async function* runChat(
  request: ChatRequest,
  { signal }: RunOptions = {},
): AsyncGenerator<ChatEvent> {
  const { primary, fallback } = selectProviders();

  if (!primary) {
    yield {
      type: "error",
      code: "not_configured",
      message: "The assistant is offline right now. Email hello@halyx.tech and the team will pick it up.",
    };
    return;
  }

  const priorUserTurns = request.history.filter((t) => t.role === "user").map((t) => t.content);
  const retrieval = retrieveForConversation(request.message, priorUserTurns);

  // Everything the visitor is shown as a source, model-initiated searches included.
  const cited = new Map<string, Chunk>();
  for (const hit of retrieval.hits) cited.set(hit.chunk.id, hit.chunk);

  yield { type: "sources", sources: [...cited.values()].map(toSource) };

  const baseMessages: CoreMessage[] = [
    ...request.history.map((turn) => ({ role: turn.role, content: turn.content }) as CoreMessage),
    { role: "user", content: buildUserTurn(request.message, retrieval.hits) },
  ];

  /*
   * Failover is only safe before the visitor has seen anything. Once a token is
   * on screen we are committed to that provider: half a sentence in one model's
   * voice followed by half in another's reads worse than a clean error.
   */
  let spoken = false;

  /*
   * Resolved once per turn, not per tool round: it is the cache prefix on the
   * Anthropic path, so it has to be byte-identical across the whole loop.
   */
  const system = systemPromptFor(request.mode, request.locale);

  const attempt = async function* (provider: Provider): AsyncGenerator<ChatEvent> {
    const messages = [...baseMessages];
    let rounds = 0;

    while (true) {
      rounds += 1;

      let calls: ToolCall[] = [];
      let native: unknown = null;
      let stopReason: string | null = null;
      let usage = { input: 0, output: 0, cacheRead: 0 };

      for await (const event of provider.stream({
        system,
        messages,
        tools: TOOLS,
        signal,
      })) {
        if (event.type === "text") {
          if (event.text) spoken = true;
          yield { type: "delta", text: event.text };
          continue;
        }
        calls = event.calls;
        native = event.native;
        stopReason = event.stopReason;
        usage = event.usage;
      }

      if (calls.length === 0 || rounds >= MAX_TOOL_ROUNDS) {
        if (calls.length > 0) console.warn("[chat] tool-round ceiling reached; ending turn");
        yield {
          type: "done",
          usage,
          stopReason,
          provider: provider.id,
          model: provider.model,
        };
        return;
      }

      messages.push({ role: "assistant-tools", calls, native });

      const results: ToolResult[] = [];

      for (const call of calls) {
        yield { type: "tool", name: call.name, status: "running" };

        if (call.name === "search_halyx") {
          const input = call.input as { query?: unknown; section?: unknown };
          const query = typeof input.query === "string" ? input.query : "";
          const section =
            typeof input.section === "string" ? (input.section as Chunk["section"]) : undefined;

          const found = retrieve(query, { topK: SEARCH_TOP_K, section });
          for (const hit of found.hits) cited.set(hit.chunk.id, hit.chunk);

          results.push({ callId: call.id, content: renderContext(found.hits), isError: false });

          yield { type: "tool", name: call.name, status: "done" };
          yield { type: "sources", sources: [...cited.values()].map(toSource) };
          continue;
        }

        if (call.name === "capture_lead") {
          const outcome = await deliverLead(call.input, request.mode);

          results.push({ callId: call.id, content: outcome.detail, isError: !outcome.ok });

          yield { type: "tool", name: call.name, status: outcome.ok ? "done" : "failed" };
          if (outcome.ok) {
            yield { type: "lead", captured: true, message: outcome.visitorMessage };
          }
          continue;
        }

        // Unreachable unless TOOLS and this branch drift apart. Tell the model
        // rather than throwing — it can recover inside the same turn.
        results.push({
          callId: call.id,
          content: `Unknown tool "${call.name}". Answer from what you already have.`,
          isError: true,
        });
        yield { type: "tool", name: call.name, status: "failed" };
      }

      messages.push({ role: "tool-results", results });
    }
  };

  try {
    yield* attempt(primary);
  } catch (error) {
    if (isAbort(error)) return;

    const shouldFailOver =
      !spoken &&
      fallback !== null &&
      error instanceof ProviderError &&
      error.kind !== "rate_limit";

    if (shouldFailOver && fallback) {
      console.warn(
        `[chat] ${primary.id} failed (${(error as ProviderError).kind}); falling back to ${fallback.id}`,
      );
      try {
        yield* attempt(fallback);
        return;
      } catch (fallbackError) {
        if (isAbort(fallbackError)) return;
        const { event, log } = describeFailure(fallbackError);
        console.error("[chat] fallback failed:", log);
        yield event;
        return;
      }
    }

    const { event, log } = describeFailure(error);
    console.error("[chat] turn failed:", log);
    yield event;
  }
}

/** Exposed for the health check and for tests that assert corpus wiring. */
export const CORPUS_SIZE = CHUNKS_BY_ID.size;

export type { Hit };
