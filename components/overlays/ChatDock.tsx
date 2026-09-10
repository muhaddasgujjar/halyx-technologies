"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { ChatRequestError, streamChat } from "@/lib/chat-client";
import { answerFor } from "@/lib/kb";
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

const GREETING: Msg = {
  id: 0,
  who: "bot",
  text: "Hi, I'm the Halyx assistant. Ask me about our services, work, team or how to start a project.",
};

/** Header line while a turn is in flight, keyed by the tool the model is running. */
const TOOL_STATUS: Record<string, string> = {
  search_halyx: "Searching our work…",
  capture_lead: "Sending your details…",
};

/**
 * The homepage assistant.
 *
 * Answers stream from `/api/chat`, which runs retrieval over the studio's own
 * content and generates through Claude or Groq (see `lib/rag/README.md`). If
 * that endpoint is unreachable or unconfigured, the dock falls back to the
 * canned matcher in `lib/kb.ts` rather than showing a dead widget — a visitor
 * who asks about pricing still gets an answer, just a blunter one.
 *
 * The launcher is draggable; a `moved` flag keeps a drag from registering as a
 * click and toggling the panel.
 */
export function ChatDock() {
  const { bot, toggleBot, toggleBotMin, toggleBotMax, closeBot } = useSite();

  /* Read inside an async turn, so a switch mid-answer is picked up rather than
     captured at the moment the send handler was created. */
  const { locale } = useLocale();
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
    setStatus("Thinking…");

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
          setStatus(event.status === "running" ? (TOOL_STATUS[event.name] ?? "Working…") : null);
          break;

        case "lead":
          setMsgs((all) => [
            ...all,
            { id: nextId.current++, who: "bot", text: event.message, system: true },
          ]);
          break;

        case "error":
          if (frame.current !== null) {
            cancelAnimationFrame(frame.current);
            frame.current = null;
          }
          /*
           * Anything already streamed stays and the failure is appended after
           * it — but a turn that failed before saying anything must not leave
           * an empty bubble sitting above the error, so that one is dropped.
           */
          setMsgs((all) => [
            ...all.flatMap((m) =>
              m.id === replyId
                ? buffer.current
                  ? [{ ...m, text: buffer.current, pending: false }]
                  : []
                : [m],
            ),
            { id: nextId.current++, who: "bot", text: event.message, failed: true },
          ]);
          break;

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
        (error.code === "not_configured" || error.status >= 500);

      if (offline) {
        buffer.current = answerFor(question);
      } else if (error instanceof ChatRequestError) {
        buffer.current = error.message;
      } else {
        buffer.current = "I could not reach the studio just now. Email hello@halyx.tech and the team will pick it up.";
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
    ? "Minimised"
    : (status ?? "Answers about our work and process");

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
        aria-label="Halyx assistant"
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
            <div className={styles.name}>Halyx Assistant</div>
            <div className={styles.status}>{headerStatus}</div>
          </div>

          <button
            type="button"
            className={styles.iconBtn}
            onClick={toggleBotMin}
            title="Minimise"
            aria-label="Minimise"
          >
            <span className={styles.minGlyph} />
          </button>
          <button
            type="button"
            className={styles.iconBtn}
            onClick={toggleBotMax}
            title="Expand"
            aria-label="Expand"
          >
            <span className={styles.maxGlyph} />
          </button>
          <button
            type="button"
            className={styles.iconBtn}
            onClick={closeBot}
            title="Close"
            aria-label="Close"
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
                    {m.text}
                    {m.pending && (
                      <>
                        <span className={styles.caret} aria-hidden="true">
                          ▍
                        </span>
                        {/* The bubble is empty until the first token lands, so
                            a screen reader gets a word rather than silence. */}
                        {!m.text && <span className={styles.srOnly}>Thinking</span>}
                      </>
                    )}
                  </div>

                  {/*
                    Sources are shown only once the answer has landed. During the
                    stream they would fight the text for attention, and a chip
                    that appears before the sentence it supports reads as noise.
                  */}
                  {!m.pending && m.sources && m.sources.length > 0 && (
                    <ul className={styles.sources} aria-label="Sources">
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
              placeholder="Ask about services, work, timelines&hellip;"
              aria-label="Ask the Halyx assistant"
              disabled={busy}
              maxLength={1200}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  void send();
                }
              }}
            />
            {busy ? (
              <button
                type="button"
                className={styles.send}
                onClick={stop}
                aria-label="Stop generating"
                title="Stop"
              >
                <span className={styles.stopGlyph} />
              </button>
            ) : (
              <button
                type="button"
                className={styles.send}
                onClick={() => void send()}
                aria-label="Send"
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
        aria-label={bot.open ? "Close the Halyx assistant" : "Open the Halyx assistant"}
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
