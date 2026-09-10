import { DEFAULT_LOCALE, isLanguageCode } from "@/lib/i18n/languages";
import { clientKey, hit } from "@/lib/rag/ratelimit";
import { MAX_AUDIO_BYTES, transcribe, voiceConfigured } from "@/lib/rag/voice";

/**
 * `POST /api/voice/transcribe` — audio in, text out.
 *
 * Body: `multipart/form-data` with an `audio` file. Returns `{ text }`.
 *
 * Kept separate from `/api/chat` on purpose: the browser records a clip, gets it
 * transcribed, shows the visitor what it heard, and only then sends the text
 * through the normal chat pipeline. One endpoint doing both would mean a
 * mis-heard question is answered before anyone can see it was mis-heard.
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

  // Transcription is billed per request, so it shares the chat limiter's budget.
  const limit = hit(clientKey(request.headers));
  if (!limit.ok) {
    return Response.json(
      { error: { code: "rate_limited", message: "Too many requests. Give me a moment." } },
      { status: 429, headers: { "Retry-After": String(limit.retryAfter) } },
    );
  }

  let audio: File | null = null;
  let locale = DEFAULT_LOCALE;
  try {
    const form = await request.formData();
    const value = form.get("audio");
    if (value instanceof File) audio = value;
    // Which language the visitor said they speak. A hint for the decoder, not
    // a constraint — see `primer()` in lib/rag/voice.ts for why.
    const picked = form.get("locale");
    if (isLanguageCode(picked)) locale = picked;
  } catch {
    return Response.json(
      { error: { code: "bad_request", message: "Expected multipart/form-data." } },
      { status: 400 },
    );
  }

  if (!audio) {
    return Response.json(
      { error: { code: "bad_request", message: "No `audio` file in the request." } },
      { status: 400 },
    );
  }
  if (audio.size > MAX_AUDIO_BYTES) {
    return Response.json(
      { error: { code: "too_long", message: "That clip is too long. Keep it under a minute." } },
      { status: 413 },
    );
  }

  const result = await transcribe(audio, locale);

  if (!result.ok) {
    console.error("[voice] transcription failed:", result.code, result.detail);
    const status = result.code === "too_large" ? 413 : result.code === "unsupported" ? 415 : 502;
    return Response.json(
      { error: { code: result.code, message: "I could not make that out. Try again." } },
      { status },
    );
  }

  return Response.json({ text: result.text }, { headers: { "Cache-Control": "no-store" } });
}
