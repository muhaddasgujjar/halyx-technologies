"use client";

import { useEffect, useRef, useState } from "react";
import { answerFor } from "@/lib/kb";
import { useSite } from "@/components/SiteProvider";
import styles from "./ChatDock.module.css";

interface Msg {
  who: "bot" | "user";
  text: string;
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
  who: "bot",
  text: "Hi, I'm the Halyx assistant. Ask me about our services, work, team or how to start a project.",
};

/**
 * A canned keyword matcher, not an LLM — replies come from `KB` in lib/kb.ts.
 * If this should run on a model later, that file's answers are a good
 * system-prompt seed.
 *
 * The launcher is draggable; a `moved` flag keeps a drag from registering as a
 * click and toggling the panel.
 */
export function ChatDock() {
  const { bot, toggleBot, toggleBotMin, toggleBotMax, closeBot } = useSite();
  const [msgs, setMsgs] = useState<Msg[]>([GREETING]);
  const [offset, setOffset] = useState({ x: 0, y: 0 });

  const logRef = useRef<HTMLDivElement | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);
  const launcherRef = useRef<HTMLButtonElement | null>(null);
  const wasOpen = useRef(false);
  const drag = useRef({ active: false, moved: false, sx: 0, sy: 0, ox: 0, oy: 0 });

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

  const send = () => {
    const el = inputRef.current;
    if (!el) return;
    const q = el.value.trim();
    if (!q) return;
    el.value = "";
    setMsgs((m) => [...m, { who: "user", text: q }]);
    const reply = answerFor(q);
    // A beat of latency so the reply doesn't land in the same frame as the question.
    setTimeout(() => setMsgs((m) => [...m, { who: "bot", text: reply }]), 280);
  };

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
            <div className={styles.status}>
              {bot.min ? "Minimised" : "Answers about our work and process"}
            </div>
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
          <div ref={logRef} className={styles.log} aria-live="polite">
            {msgs.map((m, i) => (
              <div
                key={i}
                className={`${styles.msgRow} ${
                  m.who === "bot" ? styles.msgRowBot : styles.msgRowUser
                }`}
              >
                <div
                  className={`${styles.bubble} ${m.who === "user" ? styles.bubbleUser : ""}`}
                >
                  {m.text}
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
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  send();
                }
              }}
            />
            <button type="button" className={styles.send} onClick={send} aria-label="Send">
              &#8594;
            </button>
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
