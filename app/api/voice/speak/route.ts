import { DEFAULT_LOCALE, isLanguageCode } from "@/lib/i18n/languages";
import { clientKey, hit } from "@/lib/rag/ratelimit";
import { MAX_SPEECH_CHARS, speak, voiceConfigured } from "@/lib/rag/voice";

/**
 * `POST /api/voice/speak` — text in, audio out.
 *
 * Body: `{ "text": string }`. Returns `audio/wav` on success.
 *
 * The failure worth knowing about is `409 terms_required`: Groq gates its TTS
 * model behind a one-time acceptance that only an org admin can give. That is a
 * normal, expected state rather than an error, so it gets its own status code
 * and the client answers it by speaking through the browser instead. Everything
 * keeps working; it just sounds less good until somebody clicks accept.
 */

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 30;

export async function POST(request: Request): Promise<Response> {
  if (!voiceConfigured()) {
    return Response.json(
      { error: { code: "not_configured", message: "Voice is offline." } },
      { status: 503 },
    );
  }

  const limit = hit(clientKey(request.headers));
  if (!limit.ok) {
    return Response.json(
      { error: { code: "rate_limited", message: "Too many requests." } },
      { status: 429, headers: { "Retry-After": String(limit.retryAfter) } },
    );
  }

  let text = "";
  let locale = DEFAULT_LOCALE;
  try {
    const body = (await request.json()) as { text?: unknown; locale?: unknown };
    if (typeof body.text === "string") text = body.text;
    // Anything unrecognised falls back to English, which is the only language
    // Orpheus can actually say — so a bad code degrades to a try, not a refusal.
    if (isLanguageCode(body.locale)) locale = body.locale;
  } catch {
    return Response.json(
      { error: { code: "bad_request", message: "Body must be JSON." } },
      { status: 400 },
    );
  }

  if (!text.trim()) {
    return Response.json(
      { error: { code: "bad_request", message: "`text` is required." } },
      { status: 400 },
    );
  }

  const result = await speak(text.slice(0, MAX_SPEECH_CHARS), locale);

  if (!result.ok) {
    if (result.code === "unsupported_language") {
      // 415: the request is fine, the *media type* we can produce is not. Unlike
      // 409 this is per-utterance — the client must not stop asking, because the
      // next reply may well be English again.
      return Response.json(
        { error: { code: "unsupported_language", message: result.detail } },
        { status: 415 },
      );
    }

    if (result.code === "terms_required") {
      // Logged as a warning, not an error: the pipeline is fine, the account
      // just has not opted in yet. The detail names the exact console URL.
      console.warn("[voice] Groq TTS unavailable —", result.detail);
      return Response.json(
        { error: { code: "terms_required", message: result.detail } },
        { status: 409 },
      );
    }
    console.error("[voice] synthesis failed:", result.code, result.detail);
    return Response.json(
      { error: { code: result.code, message: "Speech synthesis is unavailable." } },
      { status: 502 },
    );
  }

  return new Response(result.audio, {
    headers: {
      "Content-Type": result.contentType,
      "Content-Length": String(result.audio.byteLength),
      "Cache-Control": "no-store",
    },
  });
}
