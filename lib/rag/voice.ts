import "server-only";
import Groq from "groq-sdk";
import { DEFAULT_LOCALE, language } from "../i18n/languages";

/**
 * Speech in and speech out, both on Groq.
 *
 * The voice agent is a three-hop pipeline and every hop is a Groq model:
 *
 *   mic ──▶ whisper-large-v3-turbo ──▶ /api/chat (gpt-oss-120b + RAG) ──▶ orpheus ──▶ speaker
 *
 * Only the middle hop is new work; the two ends live here.
 *
 * Language: the console takes every language in `lib/i18n/languages.ts`.
 * Whisper detects which one it is hearing (see `transcribe`), and anything that
 * is not English skips Orpheus for the browser's own voice, because Orpheus is
 * English-only (see `speak`). The ear is multilingual; the good mouth is not.
 *
 * **Transcription works today.** **Synthesis needs one click first:** Groq gates
 * `canopylabs/orpheus-v1-english` behind a per-organisation terms acceptance, so
 * an account that has not accepted them gets a 400 with `model_terms_required`.
 * That is an owner action — nobody else can accept licence terms on the
 * account's behalf — so `speak()` reports it as a distinct, recognisable outcome
 * and the browser falls back to its own speech synthesis. Accept the terms and
 * the same code upgrades to the better voice with no redeploy.
 */

/** Groq's fastest Whisper. Real-time transcription is the whole point here. */
const STT_MODEL = process.env.GROQ_STT_MODEL ?? "whisper-large-v3-turbo";

/** Replaced `playai-tts`, which Groq retired on 2025-12-31. */
const TTS_MODEL = process.env.GROQ_TTS_MODEL ?? "canopylabs/orpheus-v1-english";

/** Orpheus voice name. Warm and even-paced, which suits a receptionist role. */
const TTS_VOICE = process.env.GROQ_TTS_VOICE ?? "tara";

/** A visitor talking to a widget does not monologue; this bounds upload cost. */
export const MAX_AUDIO_BYTES = 8 * 1024 * 1024;

/** Roughly two sentences of speech. Longer replies are truncated before synthesis. */
export const MAX_SPEECH_CHARS = 900;

let cached: Groq | null = null;

function client(): Groq {
  if (!cached) cached = new Groq({ maxRetries: 1, timeout: 30_000 });
  return cached;
}

export function voiceConfigured(): boolean {
  return Boolean(process.env.GROQ_API_KEY);
}

export const voiceModels = { stt: STT_MODEL, tts: TTS_MODEL, voice: TTS_VOICE };

/* ────────────────────────────  Speech in  ──────────────────────────── */

/**
 * The Whisper priming prompt for a language.
 *
 * Two halves. The proper nouns are the ones a general model has no reason to
 * know and will otherwise mangle into something the retriever cannot match —
 * "Maiku" becomes "my coo", "Halyx" becomes "helix". The sentence after them is
 * the registry's own greeting, which is the cheapest correct sentence in the
 * language we have: real orthography, real diacritics, and no second string to
 * keep in sync.
 *
 * Roman Urdu gets a nudge of its own on the Urdu and English entries, because
 * it is the one input Whisper has no language code for at all.
 */
function primer(locale: string): string {
  const chosen = language(locale);
  const nouns =
    "Halyx Technologies, Halyx AI, Muhaddas, Aleem, Numan, Maiku, ArchitectXpert, Axiom, Cartesia.";
  const romanUrdu =
    chosen.code === "ur" || chosen.code === DEFAULT_LOCALE
      ? " Urdu aur Roman Urdu bhi. Qeemat, waqt, team, project, website, mobile app."
      : "";

  return `${nouns} ${chosen.greeting}${romanUrdu}`;
}

export type TranscribeResult =
  | { ok: true; text: string }
  | { ok: false; code: "not_configured" | "too_large" | "unsupported" | "upstream"; detail: string };

/**
 * Turns a recorded clip into text.
 *
 * The browser hands us whatever container it prefers — Chrome and Firefox record
 * WebM/Opus, Safari records MP4/AAC — so the filename extension is derived from
 * the blob's own MIME type rather than assumed. Groq rejects a mismatched
 * extension, and the resulting error says nothing useful about the cause.
 */
export async function transcribe(
  file: File,
  locale: string = DEFAULT_LOCALE,
): Promise<TranscribeResult> {
  if (!voiceConfigured()) {
    return { ok: false, code: "not_configured", detail: "GROQ_API_KEY is not set" };
  }
  if (file.size > MAX_AUDIO_BYTES) {
    return { ok: false, code: "too_large", detail: `${file.size} bytes exceeds the ${MAX_AUDIO_BYTES} cap` };
  }
  if (file.size < 1_024) {
    // A sub-kilobyte clip is a mis-fire — a tap that never became a recording.
    return { ok: true, text: "" };
  }

  try {
    const result = await client().audio.transcriptions.create({
      file,
      model: STT_MODEL,
      response_format: "json",
      /*
       * Language is deliberately NOT pinned, not even to the visitor's chosen
       * one.
       *
       * It used to be `"en"`, which stopped Whisper drifting to Welsh on short
       * noisy clips — but it also forced Urdu speech through an English decoder,
       * which does not fail cleanly. It returns confident nonsense: fluent-looking
       * English words that were never said. Pinning it to the navbar choice would
       * reintroduce exactly that failure one language over: a German visitor who
       * asks one question in English gets German-shaped gibberish back, and the
       * agent answers the gibberish.
       *
       * The priming prompt carries the load instead. It is a soft bias rather
       * than a lock: it tips a short, ambiguous clip toward the language the
       * visitor said they speak, while leaving Whisper free to hear something
       * else when they plainly said something else.
       */
      prompt: primer(locale),
    });

    return { ok: true, text: (result.text ?? "").trim() };
  } catch (error) {
    if (error instanceof Groq.APIError) {
      const unsupported = error.status === 400;
      return {
        ok: false,
        code: unsupported ? "unsupported" : "upstream",
        detail: `${error.status}: ${error.message}`,
      };
    }
    return { ok: false, code: "upstream", detail: error instanceof Error ? error.message : String(error) };
  }
}

/* ────────────────────────────  Speech out  ──────────────────────────── */

export type SpeakResult =
  | { ok: true; audio: ArrayBuffer; contentType: string }
  | {
      ok: false;
      code: "not_configured" | "terms_required" | "unsupported_language" | "upstream";
      detail: string;
    };

/**
 * Urdu, Arabic and Persian script.
 *
 * Orpheus is an English model. Roman Urdu goes through it acceptably — it is
 * Latin phonetics and comes out sounding like an English speaker reading Urdu,
 * which is roughly the right shape — but Urdu script does not degrade, it
 * fails: the model either spells characters out or produces nothing. Better to
 * hand the sentence to the browser, which on most systems has a real ur-PK or
 * hi-IN voice.
 */
const ARABIC_SCRIPT = /[؀-ۿݐ-ݿﭐ-﷿ﹰ-﻿]/;

/** True when the text is substantially non-Latin and Orpheus should not see it. */
export function needsNonEnglishVoice(text: string): boolean {
  return ARABIC_SCRIPT.test(text);
}

/**
 * Turns a reply into audio.
 *
 * `terms_required` is deliberately its own outcome rather than a generic
 * failure: it is not a bug, not transient, and not fixable from the code — it
 * means somebody has to click accept once in the Groq console. The client
 * treats it as "use browser speech", and the message says exactly what to do.
 */
export async function speak(
  text: string,
  locale: string = DEFAULT_LOCALE,
): Promise<SpeakResult> {
  if (!voiceConfigured()) {
    return { ok: false, code: "not_configured", detail: "GROQ_API_KEY is not set" };
  }

  const input = text.trim().slice(0, MAX_SPEECH_CHARS);
  if (!input) return { ok: false, code: "upstream", detail: "nothing to speak" };

  /*
   * Orpheus is an English model, and a French sentence read by an English voice
   * is not accented — it is wrong, word by word. So anything but English goes to
   * the browser, which ships a real voice for most of these languages and will
   * at worst pronounce them the way that visitor's own OS does.
   *
   * Checked on the *chosen* language rather than by sniffing the text, because
   * the persona is instructed to answer in it: by the time a reply gets here we
   * already know what language it is in, and guessing from the characters would
   * misfile every Latin-script language as English.
   */
  if (locale !== DEFAULT_LOCALE) {
    return {
      ok: false,
      code: "unsupported_language",
      detail: `${TTS_MODEL} is English-only; this reply is in ${language(locale).promptName}.`,
    };
  }

  if (needsNonEnglishVoice(input)) {
    // Not an error and not a permanent state — the next English reply goes back
    // through Orpheus. The client falls back for this utterance only.
    return {
      ok: false,
      code: "unsupported_language",
      detail: `${TTS_MODEL} is English-only; this reply is in a non-Latin script.`,
    };
  }

  try {
    const response = await client().audio.speech.create({
      model: TTS_MODEL,
      voice: TTS_VOICE,
      input,
      // WAV plays everywhere without a decoder hop and streams from a Blob URL.
      response_format: "wav",
    });

    return { ok: true, audio: await response.arrayBuffer(), contentType: "audio/wav" };
  } catch (error) {
    if (error instanceof Groq.APIError) {
      const body = String(error.message);
      if (body.includes("model_terms_required") || body.includes("requires terms acceptance")) {
        return {
          ok: false,
          code: "terms_required",
          detail: `Groq needs a one-time terms acceptance for ${TTS_MODEL}. An org admin can accept at https://console.groq.com/playground?model=${encodeURIComponent(TTS_MODEL)} — until then the browser's own speech synthesis is used.`,
        };
      }
      return { ok: false, code: "upstream", detail: `${error.status}: ${error.message}` };
    }
    return { ok: false, code: "upstream", detail: error instanceof Error ? error.message : String(error) };
  }
}
