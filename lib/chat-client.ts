import { DEFAULT_LOCALE } from "@/lib/i18n/languages";
import type { ChatMode } from "@/lib/rag/prompt";
import type { ChatEvent, Turn } from "@/lib/rag/types";

/**
 * Browser half of the assistant transport.
 *
 * Deliberately separate from the component: the dock owns rendering and focus
 * behaviour, this owns the network and the SSE frame parsing. Type-only imports
 * from `lib/rag` keep the server code out of the client bundle while still
 * making the event union a compile-time contract on both sides — add a case to
 * `ChatEvent` and the dock stops building until it handles it.
 */

export interface StreamHandlers {
  onEvent(event: ChatEvent): void;
}

/** Thrown for failures that happen before the stream opens. */
export class ChatRequestError extends Error {
  constructor(
    readonly code: string,
    message: string,
    readonly status: number,
  ) {
    super(message);
    this.name = "ChatRequestError";
  }
}

/** Number of turns replayed to the server. The server caps this again. */
export const HISTORY_LIMIT = 12;

/**
 * Sends one turn and dispatches events as they arrive.
 *
 * Resolves when the stream ends. Rejects only for pre-stream failures and
 * network errors — once the stream is open, problems arrive as `error` events
 * so the dock can render them in the transcript rather than as a thrown state.
 */
export async function streamChat(
  message: string,
  history: Turn[],
  { onEvent }: StreamHandlers,
  signal?: AbortSignal,
  mode: ChatMode = "text",
  /** Registry code from the navbar switcher. The server re-validates it. */
  locale: string = DEFAULT_LOCALE,
): Promise<void> {
  const response = await fetch("/api/chat", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ message, history: history.slice(-HISTORY_LIMIT), mode, locale }),
    signal,
  });

  if (!response.ok) {
    // Pre-stream failures are ordinary JSON with a real status code, which is
    // why this branch never has to parse SSE to find out what went wrong.
    let code = "upstream";
    let detail = "The assistant is unavailable right now.";
    try {
      const body = (await response.json()) as { error?: { code?: string; message?: string } };
      if (body.error?.code) code = body.error.code;
      if (body.error?.message) detail = body.error.message;
    } catch {
      // Non-JSON body (a proxy error page, say). The status is enough.
    }
    throw new ChatRequestError(code, detail, response.status);
  }

  if (!response.body) throw new ChatRequestError("internal", "No response body.", 500);

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });

      /*
       * A blank line terminates an SSE event. Anything after the last one is a
       * partial frame — a `delta` split across two TCP reads is normal, so the
       * remainder stays in the buffer rather than being parsed and dropped.
       */
      let boundary = buffer.indexOf("\n\n");
      while (boundary !== -1) {
        const raw = buffer.slice(0, boundary);
        buffer = buffer.slice(boundary + 2);
        boundary = buffer.indexOf("\n\n");

        for (const line of raw.split("\n")) {
          if (!line.startsWith("data:")) continue;
          const payload = line.slice(5).trim();
          if (!payload) continue;
          try {
            onEvent(JSON.parse(payload) as ChatEvent);
          } catch {
            // A malformed frame is a server bug; dropping it keeps the rest of
            // the answer flowing rather than killing the turn.
            console.warn("[chat] unparseable event frame");
          }
        }
      }
    }
  } finally {
    // Releasing the lock lets an aborted fetch tear the connection down instead
    // of leaving it half-read.
    reader.releaseLock();
  }
}
