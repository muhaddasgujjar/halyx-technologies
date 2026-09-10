"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useLocale } from "@/components/LocaleProvider";
import { streamChat } from "@/lib/chat-client";
import { DEFAULT_LOCALE, type Language } from "@/lib/i18n/languages";
import type { ChatEvent, Turn } from "@/lib/rag/types";

/**
 * The voice loop.
 *
 * listen ─▶ /api/voice/transcribe ─▶ /api/chat (voice persona) ─▶ speak ─▶ listen
 *
 * Every hop runs on Groq: Whisper for the ear, gpt-oss-120b with retrieval for
 * the answer, Orpheus for the mouth. The only piece that is not Groq is the
 * fallback voice, and only because Groq gates its TTS model behind a one-time
 * terms acceptance — see `lib/rag/voice.ts`.
 *
 * The whole loop is language-aware. The visitor's choice in the navbar decides
 * which greeting is spoken, which language Whisper is primed for, which persona
 * directive the model gets, and which installed voice reads the reply back. It
 * follows the visitor mid-conversation too: they can pick French halfway
 * through and the agent says hello in French and carries on.
 */

export type AgentState = "idle" | "listening" | "thinking" | "speaking";

export interface Line {
  id: number;
  who: "agent" | "visitor";
  text: string;
  /** Still streaming, so the UI can show a caret. */
  pending?: boolean;
}

/**
 * Systems that ship no voice for a language, and the nearest one that works.
 *
 * Only two entries, and both are phonetic neighbours rather than guesses: Urdu
 * and Hindi share a phonology, so a Hindi voice reading Urdu is accented while
 * an English voice reading Urdu is unintelligible; Windows has no Urdu voice at
 * all, and Arabic is the usual stand-in nobody ships either. Anything not
 * listed falls back to whatever the browser picks for the tag, which is the
 * right answer for the European languages — every desktop OS has those.
 */
const VOICE_FALLBACKS: Record<string, string[]> = {
  ur: ["hi", "ar"],
  hi: ["ur"],
};

/**
 * Picks the best installed voice for a reply.
 *
 * Matching is by primary subtag, not by full tag: a machine with `de-AT`
 * installed and nothing else should still read German, and insisting on
 * `de-DE` would drop it to the English default — which reads German as
 * gibberish rather than as accented German.
 */
function pickVoice(lang: Language, text: string): { voice: SpeechSynthesisVoice | null; lang: string } {
  const voices = speechSynthesis.getVoices();
  const bySubtag = (code: string) =>
    voices.find((v) => v.lang.toLowerCase().split(/[-_]/)[0] === code) ?? null;

  /*
   * Urdu script in an otherwise English conversation. The visitor may be on
   * English and typing Urdu anyway — the persona follows them, so the voice
   * has to as well, or the reply is read out letter by letter.
   */
  const script = /[؀-ۿ]/.test(text) && lang.code !== "ur" ? "ur" : lang.code;

  if (script === DEFAULT_LOCALE) {
    // Prefer a natural English voice over whatever the OS defaults to.
    const natural = voices.find(
      (v) => /^en\b|^en[-_]/.test(v.lang) && /natural|google|premium|enhanced/i.test(v.name),
    );
    const voice =
      natural ?? voices.find((v) => /^en-GB/i.test(v.lang)) ?? bySubtag("en");
    return { voice, lang: voice?.lang ?? lang.tag };
  }

  for (const code of [script, ...(VOICE_FALLBACKS[script] ?? [])]) {
    const voice = bySubtag(code);
    // The tag stays the *intended* language even when the voice is a neighbour:
    // it is what assistive tech reads, and claiming Hindi for Urdu text is
    // worse than an accent.
    if (voice) return { voice, lang: script === lang.code ? lang.tag : voice.lang };
  }

  /*
   * Nothing installed. Still set the tag: some engines synthesise from it alone,
   * and the ones that do not were going to read it in English regardless.
   */
  return { voice: null, lang: script === lang.code ? lang.tag : script };
}

/**
 * `speechSynthesis.getVoices()` is empty on first call in Chrome and fills in
 * asynchronously. Without this, the very first utterance — which is the
 * greeting, the one that matters — always gets the default voice.
 */
function voicesReady(): Promise<void> {
  if (typeof speechSynthesis === "undefined") return Promise.resolve();
  if (speechSynthesis.getVoices().length) return Promise.resolve();

  return new Promise((resolve) => {
    const done = () => {
      speechSynthesis.removeEventListener("voiceschanged", done);
      clearTimeout(timer);
      resolve();
    };
    speechSynthesis.addEventListener("voiceschanged", done);
    // Some browsers never fire the event. Do not hang the greeting on it.
    const timer = setTimeout(done, 1_000);
  });
}

/** Stop after this much silence once the visitor has actually said something. */
const SILENCE_MS = 1_400;

/** Hard stop, so a hot mic in an empty room cannot record forever. */
const MAX_UTTERANCE_MS = 20_000;

/**
 * RMS below this counts as silence.
 *
 * Tuned by ear against laptop mics: room tone sits near 0.006, speech peaks well
 * above 0.05. Too low and an air conditioner holds the recorder open; too high
 * and it clips the end of a quiet sentence.
 */
const SILENCE_RMS = 0.014;

/** Below this, the clip is a mis-click rather than speech — do not pay to transcribe it. */
const MIN_CLIP_BYTES = 2_400;

/** Recording container, in the browser's order of preference. */
function pickMimeType(): string | undefined {
  if (typeof MediaRecorder === "undefined") return undefined;
  for (const type of ["audio/webm;codecs=opus", "audio/webm", "audio/mp4", "audio/ogg"]) {
    if (MediaRecorder.isTypeSupported(type)) return type;
  }
  return undefined;
}

/** Filename extension Groq will accept for a given container. */
function extensionFor(mime: string): string {
  if (mime.includes("webm")) return "webm";
  if (mime.includes("mp4")) return "m4a";
  if (mime.includes("ogg")) return "ogg";
  return "wav";
}

export function useVoiceAgent() {
  const { locale, lang, hydrated } = useLocale();
  const [state, setState] = useState<AgentState>("idle");
  const [lines, setLines] = useState<Line[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [active, setActive] = useState(false);
  /** True once we know Groq TTS is unavailable, so we stop asking. */
  const [browserVoice, setBrowserVoice] = useState(false);
  /** Drives the reactive waveform ring. 0–1. */
  const [level, setLevel] = useState(0);
  /**
   * Set when the browser refused to play the greeting without a user gesture.
   * The console turns this into a visible "tap to hear" affordance rather than
   * leaving the visitor with a silent agent and no idea why.
   */
  const [blocked, setBlocked] = useState(false);
  /** True once the greeting has been delivered, so it happens once per visit. */
  const greeted = useRef(false);
  /** Which language that greeting was in, so a switch can be noticed. */
  const greetedIn = useRef<string | null>(null);

  /*
   * The live language, readable from inside async continuations.
   *
   * `listen()` and `ask()` run across several awaits, and a callback that closed
   * over `lang` would hold whichever value it had when the turn started — so a
   * visitor who switches to German while the agent is thinking would get the
   * answer spoken by an English voice. A ref is read at the moment it is used.
   */
  const langRef = useRef(lang);
  langRef.current = lang;

  const nextId = useRef(1);
  const history = useRef<Turn[]>([]);

  const stream = useRef<MediaStream | null>(null);
  const recorder = useRef<MediaRecorder | null>(null);
  const audioCtx = useRef<AudioContext | null>(null);
  const analyser = useRef<AnalyserNode | null>(null);
  const meterRaf = useRef<number | null>(null);
  const player = useRef<HTMLAudioElement | null>(null);
  const abort = useRef<AbortController | null>(null);

  /** Guards every async continuation: the visitor may have hung up mid-flight. */
  const live = useRef(false);

  const say = useCallback((who: Line["who"], text: string, pending = false) => {
    const id = nextId.current++;
    setLines((all) => [...all, { id, who, text, pending }]);
    return id;
  }, []);

  const update = useCallback((id: number, change: Partial<Line>) => {
    setLines((all) => all.map((l) => (l.id === id ? { ...l, ...change } : l)));
  }, []);

  /* ────────────────────────  Teardown  ──────────────────────── */

  const releaseMic = useCallback(() => {
    if (meterRaf.current !== null) {
      cancelAnimationFrame(meterRaf.current);
      meterRaf.current = null;
    }
    recorder.current?.state === "recording" && recorder.current.stop();
    recorder.current = null;
    stream.current?.getTracks().forEach((t) => t.stop());
    stream.current = null;
    analyser.current = null;
    void audioCtx.current?.close().catch(() => {});
    audioCtx.current = null;
    setLevel(0);
  }, []);

  const hangUp = useCallback(() => {
    live.current = false;
    abort.current?.abort();
    abort.current = null;
    releaseMic();
    if (player.current) {
      player.current.pause();
      player.current = null;
    }
    if (typeof speechSynthesis !== "undefined") speechSynthesis.cancel();
    setActive(false);
    setState("idle");
  }, [releaseMic]);

  useEffect(() => () => hangUp(), [hangUp]);

  /* ────────────────────────  Speaking  ──────────────────────── */

  /**
   * Speaks a line and resolves when the audio finishes.
   *
   * Groq's Orpheus voice first; the browser's own synthesiser if that is
   * unavailable. The fallback is not a degraded error path — it is the path this
   * deployment runs on until somebody accepts the model terms in the Groq
   * console — so it has to sound deliberate rather than broken.
   */
  const speakAloud = useCallback(
    async (text: string) => {
      if (!text.trim() || !live.current) return;

      const speaking = langRef.current;

      /*
       * Orpheus is English-only, so a non-English reply skips it entirely rather
       * than paying a round trip to be told 415. The server refuses it too — this
       * is the same rule applied a hop earlier, where it costs nothing.
       */
      const orpheus = !browserVoice && speaking.code === DEFAULT_LOCALE;

      if (orpheus) {
        try {
          const response = await fetch("/api/voice/speak", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ text, locale: speaking.code }),
          });

          if (response.ok) {
            const url = URL.createObjectURL(await response.blob());
            const played = await new Promise<boolean>((resolve) => {
              const audio = new Audio(url);
              player.current = audio;
              let settled = false;
              const finish = (ok: boolean) => {
                if (settled) return;
                settled = true;
                URL.revokeObjectURL(url);
                if (player.current === audio) player.current = null;
                resolve(ok);
              };
              audio.onended = () => finish(true);
              audio.onerror = () => finish(false);
              audio.play().then(
                () => setBlocked(false),
                // NotAllowedError: autoplay without a gesture. Not a voice
                // problem — speechSynthesis will be refused for the same reason,
                // so surface it rather than silently trying the other path.
                () => {
                  setBlocked(true);
                  finish(true);
                },
              );
            });
            if (played) return;
          } else if (response.status === 409) {
            // The terms gate. Permanent for the session — stop asking.
            setBrowserVoice(true);
          }
          // 415 is per-utterance (a non-Latin script Orpheus cannot say). Fall
          // through to the browser voice for this line only, and keep asking.
        } catch {
          setBrowserVoice(true);
        }
      }

      if (typeof speechSynthesis === "undefined") return;

      await voicesReady();

      await new Promise<void>((resolve) => {
        speechSynthesis.cancel();
        const utterance = new SpeechSynthesisUtterance(text);
        const { voice, lang: tag } = pickVoice(speaking, text);
        if (voice) utterance.voice = voice;
        utterance.lang = tag;
        utterance.rate = 1.03;
        utterance.pitch = 1;

        let settled = false;
        const finish = () => {
          if (settled) return;
          settled = true;
          resolve();
        };

        utterance.onstart = () => setBlocked(false);
        utterance.onend = finish;
        utterance.onerror = (event) => {
          // "not-allowed" is the autoplay refusal; anything else is a real
          // synthesis failure and there is nothing useful to say about it.
          if (event.error === "not-allowed") setBlocked(true);
          finish();
        };

        speechSynthesis.speak(utterance);

        /*
         * Chrome silently drops an utterance queued before any user gesture:
         * no `onstart`, no `onerror`, no `onend`, and the promise would never
         * settle — which would hang the whole turn. If nothing has started
         * shortly after speaking, treat it as blocked and move on.
         */
        setTimeout(() => {
          if (settled || speechSynthesis.speaking) return;
          setBlocked(true);
          finish();
        }, 700);
      });
    },
    [browserVoice],
  );

  /* ────────────────────────  Listening  ──────────────────────── */

  const listen = useCallback(async () => {
    if (!live.current) return;

    const media = stream.current;
    const mime = pickMimeType();
    if (!media || !mime) {
      setError("This browser cannot record audio. Try Chrome, Edge or Safari.");
      setState("idle");
      return;
    }

    setState("listening");

    const chunks: BlobPart[] = [];
    const rec = new MediaRecorder(media, { mimeType: mime });
    recorder.current = rec;

    const blob = await new Promise<Blob | null>((resolve) => {
      let settled = false;
      const finish = (value: Blob | null) => {
        if (settled) return;
        settled = true;
        clearTimeout(hardStop);
        if (meterRaf.current !== null) {
          cancelAnimationFrame(meterRaf.current);
          meterRaf.current = null;
        }
        resolve(value);
      };

      rec.ondataavailable = (e) => e.data.size > 0 && chunks.push(e.data);
      rec.onstop = () => finish(chunks.length ? new Blob(chunks, { type: mime }) : null);
      rec.onerror = () => finish(null);

      const hardStop = setTimeout(() => rec.state === "recording" && rec.stop(), MAX_UTTERANCE_MS);

      /*
       * Voice activity detection. The recorder is stopped once the level has
       * been under the floor for SILENCE_MS *and* the visitor has actually
       * spoken — without the second condition, a visitor who takes a breath
       * before starting gets cut off before saying a word.
       */
      const node = analyser.current;
      if (node) {
        const buffer = new Float32Array(node.fftSize);
        let spoke = false;
        let quietSince = 0;

        const tick = () => {
          if (rec.state !== "recording") return;
          meterRaf.current = requestAnimationFrame(tick);

          node.getFloatTimeDomainData(buffer);
          let sum = 0;
          for (const sample of buffer) sum += sample * sample;
          const rms = Math.sqrt(sum / buffer.length);

          setLevel(Math.min(1, rms * 9));

          const now = performance.now();
          if (rms > SILENCE_RMS) {
            spoke = true;
            quietSince = 0;
          } else if (spoke) {
            if (quietSince === 0) quietSince = now;
            else if (now - quietSince > SILENCE_MS) rec.stop();
          }
        };
        meterRaf.current = requestAnimationFrame(tick);
      }

      rec.start(120);
    });

    recorder.current = null;
    setLevel(0);

    if (!live.current) return;

    if (!blob || blob.size < MIN_CLIP_BYTES) {
      // Nothing worth sending. Go round again rather than announcing a failure.
      void listen();
      return;
    }

    setState("thinking");

    let heard = "";
    try {
      const form = new FormData();
      form.append("audio", new File([blob], `utterance.${extensionFor(mime)}`, { type: mime }));
      // Primes the decoder toward the language they said they speak. A bias,
      // not a pin — they are still free to ask one question in English.
      form.append("locale", langRef.current.code);
      const response = await fetch("/api/voice/transcribe", { method: "POST", body: form });
      if (!response.ok) throw new Error(String(response.status));
      heard = ((await response.json()) as { text?: string }).text?.trim() ?? "";
    } catch {
      if (!live.current) return;
      setError("I could not make that out. Try again.");
      void listen();
      return;
    }

    if (!live.current) return;

    if (!heard) {
      void listen();
      return;
    }

    say("visitor", heard);
    history.current = [...history.current, { role: "user", content: heard }];

    /* ────────────────────  Answering  ──────────────────── */

    const replyId = say("agent", "", true);
    let reply = "";

    const controller = new AbortController();
    abort.current = controller;

    const onEvent = (event: ChatEvent) => {
      if (event.type === "delta") {
        reply += event.text;
        update(replyId, { text: reply });
      } else if (event.type === "lead") {
        say("agent", event.message);
      } else if (event.type === "error") {
        setError(event.message);
      }
    };

    try {
      await streamChat(
        heard,
        history.current.slice(0, -1),
        { onEvent },
        controller.signal,
        "voice",
        langRef.current.code,
      );
    } catch {
      if (!live.current || controller.signal.aborted) return;
      reply = "I lost the connection there. Ask me again.";
      update(replyId, { text: reply });
    } finally {
      if (abort.current === controller) abort.current = null;
    }

    update(replyId, { pending: false });

    if (!live.current || !reply.trim()) {
      if (live.current) void listen();
      return;
    }

    history.current = [...history.current, { role: "assistant", content: reply }];

    setState("speaking");
    await speakAloud(reply);

    if (live.current) void listen();
  }, [say, speakAloud, update]);

  /* ────────────────────────  Activation  ──────────────────────── */

  /**
   * First click. Asks for the microphone, greets, then starts the loop.
   *
   * The greeting is a client-side constant rather than a model call: it is
   * always the same sentence, and paying a round trip to be told so would put a
   * second of dead air between the click and any sign of life.
   */
  /**
   * The unprompted hello.
   *
   * Speaks the welcome line when the visitor first reaches the console, without
   * opening the microphone — greeting somebody is not a reason to start
   * recording them, and a permission prompt nobody asked for is a worse first
   * impression than silence.
   *
   * Once per page load, and once more per language the visitor picks. Re-greeting
   * every time the section scrolls back into view would be a talking billboard;
   * staying silent after somebody switches to German would leave them wondering
   * whether the control did anything.
   *
   * Autoplay is the catch: a browser refuses to make noise until the visitor has
   * interacted with the page somewhere, and scrolling does not count. When that
   * happens `blocked` is set, the console offers a tap, and this runs again from
   * inside that gesture — where it is always allowed.
   *
   * `transcript` is what separates the two forced calls. The autoplay retry is
   * re-speaking a line that is already on screen; a language switch is a new
   * line, in a new language, and belongs in the log.
   */
  const greet = useCallback(
    async ({ force = false, transcript = true } = {}) => {
      if (greeted.current && !force) return;

      const hello = langRef.current.greeting;
      greeted.current = true;
      greetedIn.current = langRef.current.code;

      live.current = true;
      setError(null);
      setState("speaking");

      // The line goes in the transcript even if the audio is refused, so a muted
      // visitor still gets greeted — they just read it instead of hearing it.
      if (transcript) say("agent", hello);

      await speakAloud(hello);

      if (live.current && !active) setState("idle");
    },
    [active, say, speakAloud],
  );

  /*
   * Say hello again when the visitor changes language.
   *
   * This is the whole proof of the feature: picking Deutsch in the navbar and
   * hearing the agent answer in German a second later is what tells somebody it
   * is real, and it costs nothing — the greeting is a local string, not a model
   * call.
   *
   * Held back in two cases. Before the stored choice has been read, because the
   * first render is always English and greeting on that would mean greeting
   * twice for a returning visitor. And mid-turn, because cutting off an answer
   * to introduce yourself is rude in any language — the switch still applies, it
   * just applies to the next thing said.
   */
  useEffect(() => {
    if (!hydrated || !greeted.current) return;
    if (greetedIn.current === locale) return;
    if (state === "thinking" || state === "speaking") return;

    void greet({ force: true });
  }, [hydrated, locale, state, greet]);

  const activate = useCallback(async () => {
    if (active) {
      hangUp();
      return;
    }

    setError(null);
    setBlocked(false);
    live.current = true;
    setActive(true);
    setState("speaking");

    try {
      const media = await navigator.mediaDevices.getUserMedia({
        audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true },
      });
      if (!live.current) {
        media.getTracks().forEach((t) => t.stop());
        return;
      }
      stream.current = media;

      const ctx = new AudioContext();
      audioCtx.current = ctx;
      const node = ctx.createAnalyser();
      node.fftSize = 1024;
      ctx.createMediaStreamSource(media).connect(node);
      analyser.current = node;
    } catch {
      /*
       * A refused or missing microphone is not the end of the session. The agent
       * still greets and the console falls back to typed input, which is the
       * whole reason `ask()` exists below.
       */
      setError("I could not reach your microphone. You can still type to me below.");
    }

    if (!live.current) return;

    /*
     * Do not greet twice. If the console already said hello on arrival, the
     * button's job is to start listening, not to repeat the introduction —
     * being greeted a second time by something you just walked up to is worse
     * than not being greeted at all.
     */
    if (!greeted.current) {
      const hello = langRef.current.greeting;
      greeted.current = true;
      greetedIn.current = langRef.current.code;
      say("agent", hello);
      await speakAloud(hello);
      if (!live.current) return;
    }

    if (stream.current) void listen();
    else setState("idle");
  }, [active, hangUp, listen, say, speakAloud]);

  /* ────────────────────────  Typed input  ──────────────────────── */

  /**
   * The same turn, without the microphone.
   *
   * Needed for more than accessibility: `getUserMedia` is refused outright on a
   * page served over plain HTTP, and a visitor in a shared office will not talk
   * to a website. Typing has to reach the same agent, not a lesser one.
   */
  const ask = useCallback(
    async (question: string) => {
      const text = question.trim();
      if (!text || state === "thinking") return;

      setError(null);
      live.current = true;
      setActive(true);

      say("visitor", text);
      history.current = [...history.current, { role: "user", content: text }];

      setState("thinking");
      const replyId = say("agent", "", true);
      let reply = "";

      const controller = new AbortController();
      abort.current = controller;

      try {
        await streamChat(
          text,
          history.current.slice(0, -1),
          {
            onEvent: (event) => {
              if (event.type === "delta") {
                reply += event.text;
                update(replyId, { text: reply });
              } else if (event.type === "lead") {
                say("agent", event.message);
              } else if (event.type === "error") {
                setError(event.message);
              }
            },
          },
          controller.signal,
          "voice",
          langRef.current.code,
        );
      } catch {
        reply = reply || "I lost the connection there. Ask me again.";
        update(replyId, { text: reply });
      } finally {
        if (abort.current === controller) abort.current = null;
      }

      update(replyId, { pending: false });
      if (!reply.trim()) {
        setState("idle");
        return;
      }

      history.current = [...history.current, { role: "assistant", content: reply }];

      setState("speaking");
      await speakAloud(reply);

      // Typing does not hand the turn back to the microphone: a visitor who
      // typed has told us which input they want.
      setState(stream.current && live.current ? "listening" : "idle");
      if (stream.current && live.current) void listen();
    },
    [listen, say, speakAloud, state, update],
  );

  return {
    state,
    lines,
    error,
    active,
    level,
    browserVoice,
    blocked,
    /** The live language, so the console can label itself in it. */
    lang,
    greet,
    activate,
    hangUp,
    ask,
    dismissError: useCallback(() => setError(null), []),
  };
}
