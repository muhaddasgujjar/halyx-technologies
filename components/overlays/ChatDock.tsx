"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { ChatRequestError, streamChat } from "@/lib/chat-client";
import { answerFor, matchFor } from "@/lib/kb";
import type { ChatEvent, Turn } from "@/lib/rag/types";
import { useLocale } from "@/components/LocaleProvider";
import { useSite } from "@/components/SiteProvider";
import styles from "./ChatDock.module.css";

interface Source {
  id: string;
  title: string;
  href?: string;
  url?: string;
}

interface Msg {
  id: number;
  who: "bot" | "user";
  text: string;
  /** What the answer was grounded in. Rendered as chips under the bubble. */
  sources?: Source[];
  /** Streaming, so the caret shows and the bubble is not yet part of history. */
  pending?: boolean;
  /** Styles the bubble as a failure and keeps it out of the replayed transcript. */
  failed?: boolean;
  /** A confirmation the backend produced, not the model — e.g. lead delivered. */
  system?: boolean;
}

/**
 * Keeps a dragged launcher inside the viewport. Without this, a drag towards the
 * bottom-right pushes the button past the edge — it is anchored there — and there
 * is nothing left on screen to drag back. The margin is generous because the
 * panel opens upward and leftward from the launcher.
 */
function clampOffset(x: number, y: number) {
  const w = window.innerWidth || 1280;
  const h = window.innerHeight || 800;
  return {
    x: Math.min(0, Math.max(-(w - 96), x)),
    y: Math.min(0, Math.max(-(h - 96), y)),
  };
}

/** Header line while a turn is in flight, keyed by the tool the model is running. */
const TOOL_STATUS: Record<string, string> = {
  search_halyx: "Searching our work…",
  capture_lead: "Sending your details…",
};

/*
 * The dock's own chrome, gathered so the extractor can see it.
 *
 * These are passed through `t` at render like every other string; listing them
 * here rather than inline keeps the ones that are built conditionally — the
 * header status, the aria labels on the two toggle states — in one place
 * instead of scattered through a 200-line return.
 */
const DOCK_COPY = {
  thinkingStatus: "Thinking…",
  working: "Working…",
  greeting:
    "Hi, I'm the Halyx assistant. Ask me about our services, work, team or how to start a project.",
  name: "Halyx Assistant",
  idle: "Answers about our work and process",
  minimised: "Minimised",
  thinking: "Thinking",
  sources: "Sources",
  placeholder: "Ask about services, work, timelines…",
  ask: "Ask the Halyx assistant",
  minimise: "Minimise",
  expand: "Expand",
  close: "Close",
  stop: "Stop generating",
  send: "Send",
  openDock: "Open the Halyx assistant",
  closeDock: "Close the Halyx assistant",
} as const;

const GREETING: Msg = { id: 0, who: "bot", text: DOCK_COPY.greeting };

/**
 * The homepage assistant.
 *
 * Answers stream from `/api/chat`, which runs retrieval over the studio's own
 * content and generates through Claude or Groq (see `lib/rag/README.md`). If
 * that endpoint is unreachable or unconfigured, the dock falls back to the
 * canned matcher in `lib/kb.ts` rather than showing a dead widget — a visitor
 * who asks about pricing still gets an answer, just a blunter one.
 *
 * Typed only. It used to carry a microphone too, sharing a browser-side speech
 * loop with the homepage console; both are gone. Voice now lives entirely in
 * the LiveKit agent (`components/VoiceAgent.tsx` and `agent.py`), which is a
 * real-time call rather than something a chat widget can borrow.
 *
 * The launcher is draggable; a `moved` flag keeps a drag from registering as a
 * click and toggling the panel.
 */
export function ChatDock() {
  const { bot, toggleBot, toggleBotMin, toggleBotMax, closeBot } = useSite();

  /* Read inside an async turn, so a switch mid-answer is picked up rather than
     captured at the moment the send handler was created. */
  const { locale, t } = useLocale();
  const localeRef = useRef(locale);
  localeRef.current = locale;
  const [msgs, setMsgs] = useState<Msg[]>([GREETING]);
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState<string | null>(null);
  const [offset, setOffset] = useState({ x: 0, y: 0 });

  const logRef = useRef<HTMLDivElement | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);
  const launcherRef = useRef<HTMLButtonElement | null>(null);
  const wasOpen = useRef(false);
  const drag = useRef({ active: false, moved: false, sx: 0, sy: 0, ox: 0, oy: 0 });

  const nextId = useRef(1);
  const abortRef = useRef<AbortController | null>(null);
  /** Maps shared-hook line ids to dock bubble ids, so streaming updates land in place. */
  const mirror = useRef(new Map<number, number>());
  /** Repeats of the same voice-loop error become one bubble, not a spam of them. */
  const lastVoiceError = useRef<string | null>(null);

  /*
   * Token deltas arrive far faster than the screen refreshes — Groq streams
   * several hundred a second. Accumulating into a ref and flushing once per
   * frame keeps the transcript smooth instead of queueing a React render per
   * token.
   */
  const buffer = useRef("");
  const frame = useRef<number | null>(null);

  // Pin the transcript to the latest message.
  useEffect(() => {
    const el = logRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [msgs, bot.open, bot.max]);

  /*
   * Closing the panel makes it `inert`, and the browser answers that by moving
   * focus to <body> — which drops a keyboard user at the top of the document.
   * The launcher is where they were before they opened it, so send them back.
   */
  useEffect(() => {
    if (wasOpen.current && !bot.open) launcherRef.current?.focus({ preventScroll: true });
    wasOpen.current = bot.open;
  }, [bot.open]);

  // A turn in flight when the dock unmounts has nobody to render it.
  useEffect(
    () => () => {
      abortRef.current?.abort();
      if (frame.current !== null) cancelAnimationFrame(frame.current);
    },
    [],
  );

  const patch = useCallback((id: number, change: Partial<Msg>) => {
    setMsgs((all) => all.map((m) => (m.id === id ? { ...m, ...change } : m)));
  }, []);

  const flushBuffer = useCallback(
    (id: number) => {
      frame.current = null;
      const text = buffer.current;
      setMsgs((all) => all.map((m) => (m.id === id ? { ...m, text } : m)));
    },
    [],
  );

  const send = useCallback(async () => {
    const el = inputRef.current;
    if (!el || busy) return;

    const question = el.value.trim();
    if (!question) return;
    el.value = "";

    // Only completed exchanges are replayed. A failed bubble is not something
    // the model said, and a system confirmation is not part of the dialogue.
    const history: Turn[] = msgs
      .filter((m) => !m.failed && !m.system && !m.pending && m.id !== GREETING.id)
      .map((m) => ({ role: m.who === "bot" ? "assistant" : "user", content: m.text }));

    const userId = nextId.current++;
    const replyId = nextId.current++;

    setMsgs((all) => [
      ...all,
      { id: userId, who: "user", text: question },
      { id: replyId, who: "bot", text: "", pending: true },
    ]);
    setBusy(true);
    setStatus(DOCK_COPY.thinkingStatus);

    buffer.current = "";
    const controller = new AbortController();
    abortRef.current = controller;

    const onEvent = (event: ChatEvent) => {
      switch (event.type) {
        case "sources":
          patch(replyId, { sources: event.sources });
          break;

        case "delta":
          buffer.current += event.text;
          setStatus(null);
          if (frame.current === null) {
            frame.current = requestAnimationFrame(() => flushBuffer(replyId));
          }
          break;

        case "tool":
          setStatus(event.status === "running" ? (TOOL_STATUS[event.name] ?? DOCK_COPY.working) : null);
          break;

        case "lead":
          setMsgs((all) => [
            ...all,
            { id: nextId.current++, who: "bot", text: event.message, system: true },
          ]);
          break;

        case "error": {
          if (frame.current !== null) {
            cancelAnimationFrame(frame.current);
            frame.current = null;
          }
          /*
           * A turn that failed before saying a word is not an error the visitor
           * needs to read — it is a question that still deserves an answer. The
           * canned matcher covers the common ones, and it is the same recovery
           * the thrown-error path below already does; it just never reached
           * here, because an upstream 429 arrives as a frame inside a
           * successful stream rather than as a rejected request. That gap is
           * why an out-of-budget model showed a red banner and said nothing.
           */
          const rescued = buffer.current ? null : matchFor(question);
          if (rescued) buffer.current = rescued;

          setMsgs((all) => [
            ...all.flatMap((m) =>
              m.id === replyId
                ? buffer.current
                  ? [{ ...m, text: buffer.current, pending: false }]
                  : []
                : [m],
            ),
            ...(rescued
              ? []
              : [{ id: nextId.current++, who: "bot" as const, text: event.message, failed: true }]),
          ]);
          break;
        }

        case "done":
          break;
      }
    };

    try {
      // The dock answers in the visitor's chosen language too. Its own chrome
      // stays English — it is a widget on an English page, not a translation of
      // one — but a German question gets a German answer.
      await streamChat(question, history, { onEvent }, controller.signal, "text", localeRef.current);
    } catch (error) {
      // A stopped turn keeps whatever it managed to say; `finally` settles it.
      if (controller.signal.aborted) return;

      /*
       * The endpoint is down or has no provider key. Rather than leave the dock
       * dead, answer from the canned matcher — every question it covers is one
       * the assistant would have answered anyway.
       */
      const offline =
        error instanceof ChatRequestError &&
        (error.code === "not_configured" ||
          // A daily token cap reads as "not for hours", so retrying is not the
          // advice to give; answering from the brief is.
          error.code === "rate_limited" ||
          error.status >= 500);

      if (offline) {
        buffer.current = answerFor(question);
      } else if (error instanceof ChatRequestError) {
        buffer.current = error.message;
      } else {
        buffer.current = "I could not reach the studio just now. Email halyxtechnologies@gmail.com and the team will pick it up.";
      }

      patch(replyId, { text: buffer.current, pending: false, failed: !offline });
    } finally {
      if (frame.current !== null) {
        cancelAnimationFrame(frame.current);
        frame.current = null;
      }
      /*
       * Settle the reply bubble. A stop pressed before the first token, or an
       * error already handled above, leaves it with nothing to show — drop it
       * rather than render an empty bubble.
       */
      setMsgs((all) =>
        all.flatMap((m) => {
          if (m.id !== replyId) return [m];
          const text = buffer.current || m.text;
          return text ? [{ ...m, text, pending: false }] : [];
        }),
      );
      if (abortRef.current === controller) abortRef.current = null;
      setBusy(false);
      setStatus(null);
      // Focus goes back to the field so a follow-up needs no mouse.
      inputRef.current?.focus({ preventScroll: true });
    }
  }, [busy, flushBuffer, msgs, patch]);

  const stop = useCallback(() => abortRef.current?.abort(), []);

  const submitText = useCallback(() => {
    const el = inputRef.current;
    if (!el) return;
    if (!el.value.trim()) return;
    void send();
  }, [send]);


  /**
   * Dragging is a mouse affordance only.
   *
   * With a finger, the same gesture is how you scroll the page — and the launcher
   * needs `touch-action: none` for a drag to work at all, so touch-dragging meant
   * a swipe that started on the launcher moved the button instead of the page, and
   * could strand it off-screen with no way to bring it back. On a touchscreen the
   * launcher is just a button, and the tap is handled by `onClick` below.
   */
  const onPointerDown = (e: React.PointerEvent) => {
    if (e.pointerType !== "mouse") return;

    const d = drag.current;
    d.active = true;
    d.moved = false;
    d.sx = e.clientX;
    d.sy = e.clientY;
    d.ox = offset.x;
    d.oy = offset.y;

    const move = (ev: PointerEvent) => {
      if (!d.active) return;
      const dx = ev.clientX - d.sx;
      const dy = ev.clientY - d.sy;
      if (Math.abs(dx) > 4 || Math.abs(dy) > 4) d.moved = true;
      setOffset(clampOffset(d.ox + dx, d.oy + dy));
    };

    const up = () => {
      d.active = false;
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", up);
      if (!d.moved) toggleBot();
    };

    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", up);
  };

  /**
   * Handles every activation that is not a mouse press: a touch tap, and — for the
   * first time — Enter or Space, which `pointerdown` never saw at all. A click
   * produced by a mouse is skipped, because `onPointerDown` has already toggled on
   * its `pointerup`.
   */
  const onClick = (e: React.MouseEvent) => {
    if ((e.nativeEvent as PointerEvent).pointerType === "mouse") return;
    toggleBot();
  };

  const dockTransform = bot.dock
    ? `translate3d(${offset.x}px, ${offset.y}px, 0) scale(1)`
    : `translate3d(${offset.x}px, ${offset.y + 18}px, 0) scale(0.9)`;

  const headerStatus = bot.min
    ? t(DOCK_COPY.minimised)
    : status
      ? t(status)
      : t(DOCK_COPY.idle);

  return (
    <div
      className={styles.dock}
      data-docked={bot.dock}
      style={{ transform: dockTransform }}
      /*
       * Undocked, the whole dock is `opacity: 0; pointer-events: none` but its
       * launcher stays in the tab order, so a keyboard could land on an invisible
       * button floating over the hero. `inert` takes the subtree out of both the
       * tab order and the accessibility tree.
       */
      inert={!bot.dock}
    >
      <div
        className={styles.panel}
        data-open={bot.open}
        data-min={bot.min}
        data-max={bot.max}
        role="dialog"
        aria-label={t(DOCK_COPY.name)}
        /*
         * Closed, the panel keeps its three header buttons in the DOM so it can
         * animate out. Marking it `aria-hidden` while the Close button it was
         * just dismissed with still holds focus is what Chrome blocks; `inert`
         * hides it and drops the focus at the same time.
         */
        inert={!bot.open}
      >
        <div className={styles.header}>
          <span className={styles.mark} aria-hidden="true">
            <i />
            <i />
            <i />
          </span>

          <div className={styles.headText}>
            <div className={styles.name}>{t(DOCK_COPY.name)}</div>
            <div className={styles.status}>{headerStatus}</div>
          </div>

          <button
            type="button"
            className={styles.iconBtn}
            onClick={toggleBotMin}
            title={t(DOCK_COPY.minimise)}
            aria-label={t(DOCK_COPY.minimise)}
          >
            <span className={styles.minGlyph} />
          </button>
          <button
            type="button"
            className={styles.iconBtn}
            onClick={toggleBotMax}
            title={t(DOCK_COPY.expand)}
            aria-label={t(DOCK_COPY.expand)}
          >
            <span className={styles.maxGlyph} />
          </button>
          <button
            type="button"
            className={styles.iconBtn}
            onClick={closeBot}
            title={t(DOCK_COPY.close)}
            aria-label={t(DOCK_COPY.close)}
          >
            &times;
          </button>
        </div>

        <div className={styles.bodyWrap}>
          <div ref={logRef} className={styles.log} aria-live="polite" aria-busy={busy}>
            {msgs.map((m) => (
              <div
                key={m.id}
                className={`${styles.msgRow} ${
                  m.who === "bot" ? styles.msgRowBot : styles.msgRowUser
                }`}
              >
                <div className={styles.msgCol}>
                  <div
                    className={`${styles.bubble} ${m.who === "user" ? styles.bubbleUser : ""} ${
                      m.failed ? styles.bubbleError : ""
                    } ${m.system ? styles.bubbleSystem : ""}`}
                  >
                    {/*
                      Only the canned greeting is looked up. Everything else in
                      the transcript is either what the visitor typed or what the
                      model just wrote — both already in the right language, and
                      neither is a catalogue key.
                    */}
                    {m.id === GREETING.id ? t(m.text) : m.text}
                    {m.pending && (
                      <>
                        <span className={styles.caret} aria-hidden="true">
                          ▍
                        </span>
                        {/* The bubble is empty until the first token lands, so
                            a screen reader gets a word rather than silence. */}
                        {!m.text && <span className={styles.srOnly}>{t(DOCK_COPY.thinking)}</span>}
                      </>
                    )}
                  </div>

                  {/*
                    Sources are shown only once the answer has landed. During the
                    stream they would fight the text for attention, and a chip
                    that appears before the sentence it supports reads as noise.
                  */}
                  {!m.pending && m.sources && m.sources.length > 0 && (
                    <ul className={styles.sources} aria-label={t(DOCK_COPY.sources)}>
                      {m.sources.slice(0, 4).map((s) => {
                        const href = s.url ?? s.href;
                        return (
                          <li key={s.id}>
                            {href ? (
                              <a
                                className={styles.source}
                                href={href}
                                {...(s.url
                                  ? { target: "_blank", rel: "noopener noreferrer" }
                                  : {})}
                              >
                                {s.title}
                              </a>
                            ) : (
                              <span className={styles.source}>{s.title}</span>
                            )}
                          </li>
                        );
                      })}
                    </ul>
                  )}
                </div>
              </div>
            ))}
          </div>

          <div className={styles.inputRow}>

            <input
              ref={inputRef}
              type="text"
              className={styles.input}
              placeholder={t(DOCK_COPY.placeholder)}
              aria-label={t(DOCK_COPY.ask)}
              /*
               * Typing stays open through a voice session. Locking the field
               * whenever the microphone was live meant a visitor who wanted to
               * spell out an email address had to hang up first — and typing is
               * itself an interruption the agent now handles, so there is
               * nothing left to protect.
               */
              disabled={busy}
              maxLength={1200}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  submitText();
                }
              }}
            />
            {busy ? (
              <button
                type="button"
                className={styles.send}
                onClick={stop}
                aria-label={t(DOCK_COPY.stop)}
                title={t(DOCK_COPY.stop)}
              >
                <span className={styles.stopGlyph} />
              </button>
            ) : (
              <button
                type="button"
                className={styles.send}
                onClick={submitText}
                aria-label={t(DOCK_COPY.send)}
              >
                &#8594;
              </button>
            )}
          </div>
        </div>
      </div>

      <button
        ref={launcherRef}
        type="button"
        className={styles.launcher}
        onPointerDown={onPointerDown}
        onClick={onClick}
        aria-label={bot.open ? t(DOCK_COPY.closeDock) : t(DOCK_COPY.openDock)}
        aria-expanded={bot.open}
      >
        <span className={styles.launcherMark} aria-hidden="true">
          <i />
          <i />
          <i />
        </span>
        <span className={styles.onlineDot} aria-hidden="true" />
      </button>
    </div>
  );
}
