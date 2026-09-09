"use client";

import { useEffect, useRef, useState } from "react";
import { answerFor } from "@/lib/kb";
import { useSite } from "@/components/SiteProvider";
import styles from "./ChatDock.module.css";

interface Msg {
  who: "bot" | "user";
  text: string;
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
  const drag = useRef({ active: false, moved: false, sx: 0, sy: 0, ox: 0, oy: 0 });

  // Pin the transcript to the latest message.
  useEffect(() => {
    const el = logRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [msgs, bot.open, bot.max]);

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

  const onPointerDown = (e: React.PointerEvent) => {
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
      setOffset({ x: d.ox + dx, y: d.oy + dy });
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

  const dockTransform = bot.dock
    ? `translate3d(${offset.x}px, ${offset.y}px, 0) scale(1)`
    : `translate3d(${offset.x}px, ${offset.y + 18}px, 0) scale(0.9)`;

  return (
    <div className={styles.dock} data-docked={bot.dock} style={{ transform: dockTransform }}>
      <div
        className={styles.panel}
        data-open={bot.open}
        data-min={bot.min}
        data-max={bot.max}
        role="dialog"
        aria-label="Halyx assistant"
        aria-hidden={!bot.open}
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
        type="button"
        className={styles.launcher}
        onPointerDown={onPointerDown}
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
