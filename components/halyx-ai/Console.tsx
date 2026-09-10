"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { LANGUAGES } from "@/lib/i18n/languages";
import { useLocale } from "../LocaleProvider";
import { AndroidPortrait } from "./AndroidPortrait";
import { useVoiceAgent } from "./useVoiceAgent";
import styles from "./Console.module.css";

/**
 * The Halyx AI console.
 *
 * Two halves, stacked, matching the reference: an android portrait behind
 * vertical glass slats, and a glassmorphic dashboard under it. The voice agent
 * lives in the dashboard rather than beside it, because the whole point of the
 * screen is that the dashboard *is* the agent — the readouts describe the thing
 * you are talking to.
 *
 * Every number on it is real. The tiles read from `GET /api/chat`, so the
 * console doubles as the status page: if the corpus failed to build or the Groq
 * model has been decommissioned, this screen says so instead of quietly
 * rendering a plausible-looking dashboard over a broken backend.
 */

interface Health {
  ready: boolean;
  corpusChunks: number;
  providers: {
    primary: { id: string; model: string } | null;
    keys: { anthropic: boolean; groq: boolean };
  };
  groqModel: { model: string; live: boolean | null } | null;
}

/*
 * The dashboard's own labels stay English, deliberately.
 *
 * They are instrument readouts — they sit alongside "BM25", "orpheus" and a
 * model id, and a half-translated panel where "Listening" is German and
 * "whisper-large-v3-turbo" is not reads as a bug rather than as localisation.
 * What does follow the visitor's language is everything the agent says to them:
 * the greeting, the idle hint, the placeholder, the empty state.
 */
const STATE_COPY = {
  idle: { label: "Standing by", hint: null },
  listening: { label: "Listening", hint: "Speak — I stop when you do" },
  thinking: { label: "Thinking", hint: "Working on it" },
  speaking: { label: "Speaking", hint: "Tap to interrupt" },
} as const;

/**
 * Deterministic sparkline paths.
 *
 * Hardcoded rather than generated: `Math.random()` in render is the classic
 * hydration mismatch, and a sparkline that redraws on every keystroke reads as a
 * bug. These are shapes, not data — the number above them is the real value.
 */
/**
 * Per-bar animation offsets for the waveform, as multiples of the cycle.
 * Deliberately uneven — evenly spaced offsets read as a wave travelling in one
 * direction, which looks like a loading spinner rather than a voice.
 */
const WAVE_BARS = [0, 3, 1, 4, 2, 5, 1, 3, 0] as const;

const SPARKS = [
  "0,18 12,14 24,16 36,9 48,12 60,6 72,8 84,3",
  "0,10 12,13 24,7 36,11 48,5 60,9 72,4 84,6",
  "0,16 12,12 24,13 36,8 48,10 60,7 72,9 84,5",
  "0,13 12,15 24,9 36,12 48,6 60,10 72,5 84,7",
] as const;

/**
 * Reading direction for one transcript line.
 *
 * The chosen language decides it, with one override: Arabic-script text arrives
 * in a left-to-right conversation whenever somebody on English types Urdu at it,
 * and rendering that left to right makes it unreadable. Cheap to check, and the
 * only mixed case that actually shows up.
 */
function lineDir(text: string, fallback: "ltr" | "rtl"): "ltr" | "rtl" {
  return /[؀-ۿݐ-ݿ]/.test(text) ? "rtl" : fallback;
}

export function Console() {
  const { state, lines, error, active, level, browserVoice, blocked, lang, greet, activate, ask, dismissError } =
    useVoiceAgent();

  const { t } = useLocale();
  const [health, setHealth] = useState<Health | null>(null);
  const [draft, setDraft] = useState("");
  const [tilt, setTilt] = useState({ x: 0, y: 0 });
  const [inView, setInView] = useState(false);

  const rootRef = useRef<HTMLDivElement | null>(null);
  const stageRef = useRef<HTMLDivElement | null>(null);
  const logRef = useRef<HTMLDivElement | null>(null);

  /*
   * The console greets the visitor when they arrive at it, rather than waiting
   * to be clicked. Half the point of a voice agent is that it speaks first.
   *
   * Fires once — `greet()` guards itself — and only once the card is properly on
   * screen, not the moment a corner of it clips the viewport, or the greeting
   * plays to somebody still reading the section above.
   */
  useEffect(() => {
    const el = rootRef.current;
    if (!el || typeof IntersectionObserver === "undefined") return;

    const io = new IntersectionObserver(
      ([entry]) => {
        setInView(entry.isIntersecting);
        if (entry.isIntersecting) void greet();
      },
      { threshold: 0.4 },
    );

    io.observe(el);
    return () => io.disconnect();
  }, [greet]);

  /*
   * Browsers refuse to play audio until the visitor has interacted with the
   * page, and scrolling is not an interaction. When the greeting is refused,
   * retry on the next real gesture — but only while the console is still on
   * screen, so a click somewhere else on the page does not make a widget the
   * visitor has scrolled away from start talking.
   */
  useEffect(() => {
    if (!blocked || !inView) return;

    // Re-speaking a line that is already in the log, so it does not go in again.
    const retry = () => void greet({ force: true, transcript: false });
    const options = { once: true, passive: true } as const;

    document.addEventListener("pointerdown", retry, options);
    document.addEventListener("keydown", retry, options);

    return () => {
      document.removeEventListener("pointerdown", retry);
      document.removeEventListener("keydown", retry);
    };
  }, [blocked, greet, inView]);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/chat")
      .then((r) => (r.ok ? r.json() : null))
      .then((data: Health | null) => !cancelled && setHealth(data))
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    const el = logRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [lines]);

  /*
   * Parallax. The android and the slats move against each other on pointer
   * position, which is what gives the card depth — a single layer sliding under
   * the cursor just looks like it is loose.
   *
   * Pointer-driven only: a touch device has no hover, and tying this to scroll
   * on a phone would fight the page. Reduced-motion callers never get here.
   */
  const onPointerMove = useCallback((event: React.PointerEvent<HTMLDivElement>) => {
    if (event.pointerType !== "mouse") return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    const box = stageRef.current?.getBoundingClientRect();
    if (!box) return;

    setTilt({
      x: ((event.clientX - box.left) / box.width - 0.5) * 2,
      y: ((event.clientY - box.top) / box.height - 0.5) * 2,
    });
  }, []);

  const resetTilt = useCallback(() => setTilt({ x: 0, y: 0 }), []);

  const submit = useCallback(
    (event: React.FormEvent) => {
      event.preventDefault();
      const text = draft.trim();
      if (!text) return;
      setDraft("");
      void ask(text);
    },
    [ask, draft],
  );

  const copy = STATE_COPY[state];
  const busy = state === "thinking" || state === "speaking";

  const modelId = health?.groqModel?.model ?? health?.providers?.primary?.model ?? "—";
  const modelLive = health?.groqModel?.live;

  const tiles = [
    { label: "Knowledge base", value: health ? String(health.corpusChunks) : "—", unit: "passages" },
    { label: "Retrieval", value: "BM25", unit: "grounded, no guessing" },
    {
      label: "Languages",
      value: lang.short,
      unit: `${LANGUAGES.length} spoken · ${lang.english}`,
    },
    { label: "Voice", value: browserVoice ? "Browser" : "Groq", unit: browserVoice ? "fallback synth" : "orpheus" },
  ];

  const processes = [
    {
      name: "Retrieval index",
      detail: health ? `${health.corpusChunks} passages loaded` : "Loading",
      ok: Boolean(health?.corpusChunks),
    },
    {
      name: "Language model",
      detail: modelId,
      ok: Boolean(health?.ready) && modelLive !== false,
    },
    {
      name: "Speech recognition",
      detail: "whisper-large-v3-turbo",
      ok: Boolean(health?.providers?.keys?.groq),
    },
    {
      name: "Lead routing",
      detail: "Straight to the CEO's inbox",
      ok: true,
    },
  ];

  const allOk = processes.every((p) => p.ok);

  return (
    <div ref={rootRef} className={styles.console} data-state={state}>
      {/* ── Portrait ───────────────────────────────────────────── */}
      <div
        ref={stageRef}
        className={styles.stage}
        onPointerMove={onPointerMove}
        onPointerLeave={resetTilt}
        style={
          {
            "--tilt-x": tilt.x.toFixed(3),
            "--tilt-y": tilt.y.toFixed(3),
          } as React.CSSProperties
        }
      >
        <div className={styles.stageGlow} aria-hidden="true" />

        <div className={styles.portrait}>
          <AndroidPortrait state={state} />
        </div>

        {/*
          The vertical slats from the reference. A repeating gradient rather than
          80 elements: it is one paint, it scales to any width, and it moves as a
          single layer against the portrait for the parallax.
        */}
        <div className={styles.slats} aria-hidden="true" />
        <div className={styles.stageVignette} aria-hidden="true" />

        <div className={styles.stageBadge}>
          <span className={`${styles.badgeDot} hx-mono`} data-state={state} aria-hidden="true" />
          <span className="hx-mono">HALYX AI · {copy.label.toUpperCase()}</span>
        </div>

        {/*
          The voice bars.

          While listening they are driven by `--level`, the real microphone RMS.
          While speaking there is no signal to read — `speechSynthesis` exposes
          no audio graph at all — so they animate on a CSS cycle instead. That is
          an honest distinction: one is a meter, the other is an indicator that
          something is being said.
        */}
        <div
          className={styles.wave}
          /* The bars and the unmute button share the same spot; never both. */
          data-state={blocked ? "idle" : state}
          style={{ "--level": level.toFixed(3) } as React.CSSProperties}
          aria-hidden="true"
        >
          {WAVE_BARS.map((delay, i) => (
            <i key={i} style={{ "--i": String(delay) } as React.CSSProperties} />
          ))}
        </div>

        {blocked && (
          <button
            type="button"
            className={styles.unmute}
            onClick={() => void greet({ force: true, transcript: false })}
            lang={lang.tag}
            dir={lang.dir}
          >
            <span aria-hidden="true">🔊</span>
            {lang.ui.unmute}
          </button>
        )}
      </div>

      {/* ── Dashboard ──────────────────────────────────────────── */}
      <div className={styles.glass}>
        <div className={styles.topRow}>
          <button
            type="button"
            className={styles.agent}
            onClick={() => void activate()}
            aria-pressed={active}
            aria-label={active ? t("End the voice conversation") : t("Start talking to Halyx AI")}
          >
            <span
              className={styles.orb}
              data-state={state}
              style={{ "--level": level.toFixed(3) } as React.CSSProperties}
              aria-hidden="true"
            >
              <span className={styles.orbRing} />
              <span className={styles.orbRing} />
              <span className={styles.orbCore} />
            </span>
            <span className={styles.agentText}>
              <span className={`${styles.agentLabel} hx-mono`}>VOICE AGENT</span>
              <span className={styles.agentState}>{copy.label}</span>
              <span className={styles.agentHint} lang={lang.tag} dir={lang.dir}>
                {copy.hint ?? lang.ui.tapToTalk}
              </span>
            </span>
          </button>

          <div className={styles.headline}>
            <div className={`${styles.headlineLabel} hx-mono`}>{t("ASK IT ANYTHING")}</div>
            <div className={styles.headlineValue}>
              {t("It knows the studio, the work, and the people who run it.")}
            </div>
          </div>

          <Link href="/#contact" className={styles.cta} aria-label={t("Go to the contact form")}>
            <span aria-hidden="true">&#8594;</span>
          </Link>
        </div>

        {/* ── Overview ─────────────────────────────────────────── */}
        <div className={styles.section}>
          <div className={styles.sectionHead}>
            <h2 className={styles.sectionTitle}>{t("System Overview")}</h2>
            <span className={`${styles.sectionMeta} hx-mono`}>
              {health?.providers?.primary?.id?.toUpperCase() ?? "—"}
            </span>
          </div>

          <div className={styles.tiles}>
            {tiles.map((tile, i) => (
              <div key={tile.label} className={styles.tile}>
                <div className={`${styles.tileLabel} hx-mono`}>{t(tile.label).toUpperCase()}</div>
                <div className={styles.tileValue}>{tile.value}</div>
                <div className={styles.tileUnit}>{tile.unit}</div>
                <svg className={styles.spark} viewBox="0 0 84 20" aria-hidden="true">
                  <polyline points={SPARKS[i]} fill="none" stroke="currentColor" strokeWidth="1.5" />
                </svg>
              </div>
            ))}
          </div>
        </div>

        {/* ── Processes ────────────────────────────────────────── */}
        <div className={styles.section}>
          <div className={styles.sectionHead}>
            <h2 className={styles.sectionTitle}>{t("Active Processes")}</h2>
            <span className={`${styles.sectionMeta} hx-mono`} data-ok={allOk}>
              {allOk ? t("ALL SYSTEMS OPERATIONAL") : t("DEGRADED")}
              <i aria-hidden="true" />
            </span>
          </div>

          <ul className={styles.processes}>
            {processes.map((process) => (
              <li key={process.name} className={styles.process}>
                <span className={styles.processName}>{t(process.name)}</span>
                <span className={styles.processDetail}>{process.detail}</span>
                <span className={styles.processBar} data-ok={process.ok} aria-hidden="true">
                  <i />
                </span>
                <span className={`${styles.processState} hx-mono`} data-ok={process.ok}>
                  {process.ok ? "OK" : "OFF"}
                </span>
              </li>
            ))}
          </ul>
        </div>

        {/* ── Conversation ─────────────────────────────────────── */}
        <div className={styles.section}>
          <div className={styles.sectionHead}>
            <h2 className={styles.sectionTitle}>{t("Conversation")}</h2>
            {browserVoice && (
              <span className={`${styles.sectionMeta} hx-mono`}>BROWSER VOICE</span>
            )}
          </div>

          {error && (
            <div className={styles.error} role="status">
              <span>{error}</span>
              <button type="button" onClick={dismissError} aria-label="Dismiss">
                &times;
              </button>
            </div>
          )}

          <div ref={logRef} className={styles.log} aria-live="polite" aria-busy={busy}>
            {lines.length === 0 ? (
              <p className={styles.empty} lang={lang.tag} dir={lang.dir}>
                {lang.ui.empty}
              </p>
            ) : (
              lines.map((line) => (
                <div key={line.id} className={styles.line} data-who={line.who}>
                  <span className={`${styles.lineWho} hx-mono`}>
                    {line.who === "agent" ? "HALYX AI" : "YOU"}
                  </span>
                  {/*
                    Direction is set per line rather than on the page. Arabic and
                    Urdu have to run right to left to be readable at all, but
                    flipping the whole document would mirror a layout that was
                    never designed for it — so the text that needs it gets it,
                    and the console around it stays put.
                  */}
                  <p className={styles.lineText} lang={lang.tag} dir={lineDir(line.text, lang.dir)}>
                    {line.text}
                    {line.pending && (
                      <span className={styles.caret} aria-hidden="true">
                        ▍
                      </span>
                    )}
                  </p>
                </div>
              ))
            )}
          </div>

          <form className={styles.composer} onSubmit={submit}>
            <input
              className={styles.input}
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              placeholder={lang.ui.placeholder}
              aria-label={t("Ask Halyx AI a question")}
              lang={lang.tag}
              dir={lang.dir}
              maxLength={1200}
              disabled={state === "thinking"}
            />
            <button
              type="submit"
              className={styles.send}
              disabled={state === "thinking" || !draft.trim()}
              aria-label="Send"
            >
              &#8594;
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
