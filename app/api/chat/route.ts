import { CORPUS_SIZE, isConfigured, runChat } from "@/lib/rag/chat";
import { validate } from "@/lib/rag/guard";
import { checkModel, providerStatus } from "@/lib/rag/providers";
import { clientKey, hit } from "@/lib/rag/ratelimit";
import type { ChatEvent, ErrorCode } from "@/lib/rag/types";

/**
 * `POST /api/chat` — the Halyx assistant.
 *
 * Request:
 *   { "message": string, "history"?: { role: "user" | "assistant", content: string }[] }
 *
 * Response: `text/event-stream`. One JSON `ChatEvent` per `data:` frame — see
 * `lib/rag/types.ts` for the union. The stream always terminates with a `done`
 * or an `error` frame, so a client can treat either as the end of a turn.
 *
 * Everything upstream of the model — validation, rate limiting, retrieval — runs
 * before a single token is bought, and failures there return ordinary JSON with
 * a real status code rather than a stream carrying an error. A client therefore
 * only has to parse SSE once it has a 200.
 */

/** Resend and `server-only` need Node; the Edge runtime cannot load either. */
export const runtime = "nodejs";

/** Never prerender or cache: every request is a distinct conversation. */
export const dynamic = "force-dynamic";

/**
 * Ceiling for the whole turn, tool rounds included. The SDK client gives up at
 * 45s per call, so this only bites if a tool loop runs long.
 */
export const maxDuration = 60;

const encoder = new TextEncoder();

/** One SSE frame. The trailing blank line is what terminates an event. */
function frame(event: ChatEvent): Uint8Array {
  return encoder.encode(`data: ${JSON.stringify(event)}\n\n`);
}

function fail(status: number, code: ErrorCode, message: string, headers?: HeadersInit) {
  return Response.json({ error: { code, message } }, { status, headers });
}

export async function POST(request: Request): Promise<Response> {
  if (!isConfigured()) {
    // A missing key is an operator error, so say so in the log and stay vague
    // to the visitor — the fallback is a real address, not a dead end.
    console.error(
      "[chat] no provider configured: set GROQ_API_KEY or ANTHROPIC_API_KEY (see GET /api/chat)",
    );
    return fail(
      503,
      "not_configured",
      "The assistant is offline right now. Email hello@halyx.tech and the team will pick it up.",
    );
  }

  const limit = hit(clientKey(request.headers));
  if (!limit.ok) {
    return fail(
      429,
      "rate_limited",
      "That is a lot of questions at once. Give me a few seconds.",
      { "Retry-After": String(limit.retryAfter) },
    );
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return fail(400, "bad_request", "Body must be valid JSON.");
  }

  const parsed = validate(body);
  if (!parsed.ok) {
    return fail(parsed.code === "too_long" ? 413 : 400, parsed.code, parsed.message);
  }

  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      try {
        for await (const event of runChat(parsed.value, { signal: request.signal })) {
          controller.enqueue(frame(event));
        }
      } catch (error) {
        // `runChat` handles its own failures; anything arriving here is a bug in
        // the generator itself, so the stream still has to close cleanly.
        console.error("[chat] stream aborted:", error);
        try {
          controller.enqueue(
            frame({
              type: "error",
              code: "internal",
              message: "Something went wrong on my side. Email hello@halyx.tech and the team will pick it up.",
            }),
          );
        } catch {
          // Client already gone; nothing to report to.
        }
      } finally {
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream; charset=utf-8",
      // `no-transform` matters as much as `no-cache`: a proxy that gzips this
      // will buffer it, and a buffered stream is just a slow response.
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
      // Tells nginx not to buffer. Harmless everywhere else.
      "X-Accel-Buffering": "no",
      "X-RateLimit-Remaining": String(limit.remaining),
    },
  });
}

/**
 * `GET /api/chat` — readiness probe.
 *
 * Catches the three deployment failures that actually happen: no provider key,
 * a corpus that failed to assemble, and — the one worth building for — a Groq
 * model that has been decommissioned underneath a working deployment. Groq
 * retires model ids on a rolling schedule and does not keep them alive, so
 * `groqModel.live === false` here is an early warning rather than a 400 in
 * front of a visitor. The catalogue lookup is cached for ten minutes inside
 * `checkModel`, so this is safe to poll.
 */
export async function GET(): Promise<Response> {
  const providers = providerStatus();
  const groqModel = providers.keys.groq ? await checkModel() : null;

  return Response.json(
    {
      service: "halyx-assistant",
      ready: isConfigured(),
      corpusChunks: CORPUS_SIZE,
      providers,
      groqModel,
    },
    { headers: { "Cache-Control": "no-store" } },
  );
}
