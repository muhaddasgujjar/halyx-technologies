import "server-only";
import Anthropic from "@anthropic-ai/sdk";
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
 * Claude adapter.
 *
 * The quality ceiling of the two providers, and the only one with prompt
 * caching — which is why the system prompt is passed as a content block with a
 * cache breakpoint rather than as a bare string.
 */

/** The studio's shop window is the wrong place to save on model choice. */
const MODEL = process.env.ANTHROPIC_MODEL ?? "claude-opus-5";

/** A ceiling, not a target: answers here are two to four sentences. */
const MAX_TOKENS = 8_192;

let cached: Anthropic | null = null;

function client(): Anthropic {
  if (!cached) {
    cached = new Anthropic({
      maxRetries: 2,
      // Milliseconds in this SDK. A chat reply that takes 45s has already failed.
      timeout: 45_000,
    });
  }
  return cached;
}

export function anthropicConfigured(): boolean {
  return Boolean(process.env.ANTHROPIC_API_KEY);
}

function toTools(tools: ToolSpec[]): Anthropic.Tool[] {
  return tools.map((tool) => ({
    name: tool.name,
    description: tool.description,
    // Guarantees the arguments validate, so a missing field is a real gap in
    // the conversation rather than a malformed call.
    strict: true,
    input_schema: tool.parameters as Anthropic.Tool.InputSchema,
  }));
}

function toMessages(messages: CoreMessage[]): Anthropic.MessageParam[] {
  return messages.map((message) => {
    switch (message.role) {
      case "user":
      case "assistant":
        return { role: message.role, content: message.content };
      case "assistant-tools":
        // Echoed back verbatim — thinking blocks must survive the round trip.
        return { role: "assistant", content: message.native as Anthropic.ContentBlockParam[] };
      case "tool-results":
        return {
          role: "user",
          content: message.results.map((result) => ({
            type: "tool_result" as const,
            tool_use_id: result.callId,
            content: result.content,
            is_error: result.isError,
          })),
        };
    }
  });
}

/** Maps an SDK exception onto the neutral failure vocabulary. */
function translate(error: unknown): ProviderError {
  if (error instanceof Anthropic.AuthenticationError) {
    return new ProviderError("auth", "anthropic", error.message, error.status);
  }
  if (error instanceof Anthropic.RateLimitError) {
    return new ProviderError("rate_limit", "anthropic", error.message, error.status);
  }
  if (error instanceof Anthropic.NotFoundError) {
    // A 404 on /messages with a valid key means the model id is wrong or retired.
    return new ProviderError("model_gone", "anthropic", error.message, error.status);
  }
  if (error instanceof Anthropic.APIError) {
    return new ProviderError("upstream", "anthropic", error.message, error.status);
  }
  return new ProviderError("unknown", "anthropic", error instanceof Error ? error.message : String(error));
}

export const anthropicProvider: Provider = {
  id: "anthropic",
  model: MODEL,

  async *stream({ system, messages, tools, signal }: StreamArgs): AsyncGenerator<ProviderEvent> {
    try {
      const stream = client().messages.stream(
        {
          model: MODEL,
          max_tokens: MAX_TOKENS,
          // Chat latency beats reasoning depth on "what do you charge".
          // Thinking stays on: explicitly disabling it on this model risks tool
          // calls being written into visible text instead of a tool_use block.
          output_config: { effort: "low" },
          system: [
            {
              type: "text",
              text: system,
              /*
               * The cache breakpoint. Tools and the persona are byte-identical
               * on every request (~1.6K tokens, over Opus 5's 512 minimum), so
               * they read from cache at roughly a tenth of the input price.
               * Everything volatile lives in `messages`, after this point.
               *
               * Default 5-minute TTL, not 1h: a read refreshes the timer, so one
               * conversation stays warm for free, while an hour-long entry costs
               * 2x to write and is still cold for tomorrow's visitor.
               */
              cache_control: { type: "ephemeral" },
            },
          ],
          tools: toTools(tools),
          messages: toMessages(messages),
        },
        { signal },
      );

      for await (const event of stream) {
        if (event.type === "content_block_delta" && event.delta.type === "text_delta") {
          yield { type: "text", text: event.delta.text };
        }
      }

      const message = await stream.finalMessage();

      const calls: ToolCall[] = message.content
        .filter((block): block is Anthropic.ToolUseBlock => block.type === "tool_use")
        .map((block) => ({ id: block.id, name: block.name, input: block.input }));

      yield {
        type: "final",
        calls,
        native: message.content,
        stopReason: message.stop_reason,
        usage: {
          input: message.usage.input_tokens,
          output: message.usage.output_tokens,
          cacheRead: message.usage.cache_read_input_tokens ?? 0,
        },
      };
    } catch (error) {
      if (error instanceof Error && error.name === "AbortError") throw error;
      throw translate(error);
    }
  },
};
