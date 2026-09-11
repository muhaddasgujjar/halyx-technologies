"use client";

import {
  RoomAudioRenderer,
  RoomContext,
  useConnectionState,
  useLocalParticipant,
  useTrackVolume,
  useTranscriptions,
  useVoiceAssistant,
} from "@livekit/components-react";
import { ConnectionState, LocalAudioTrack, Room } from "livekit-client";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { AndroidPortrait } from "./halyx-ai/AndroidPortrait";
import styles from "./halyx-ai/Console.module.css";

/**
 * The Halyx AI console — the visitor's end of the voice agent.
 *
 * Two halves, stacked: an android portrait behind vertical glass slats, and a
 * glassmorphic dashboard under it. The voice agent lives *in* the dashboard
 * rather than beside it, because the point of the screen is that the dashboard
 * IS the agent — the readouts describe the thing you are talking to.
 *
 * Everything below the surface is LiveKit. The browser holds a WebRTC call with
 * the Python worker in `agent.py`; Deepgram hears, `gpt-4o-mini` answers,
 * Cartesia speaks, and none of that audio passes through Next.js. This file
 * owns only what the visitor sees, and every moving part of it is driven by a
 * real signal rather than a timer:
 *
 *   - the portrait's eyes and throat follow the agent's own state machine
 *   - the wave bars and the orb are driven by `useTrackVolume` on the agent's
 *     published track, so they are a meter of the actual voice
 *   - the transcript is the live one, streamed over the room's text channel
 *
 * The `Room` is created once and kept in a ref rather than rebuilt per render:
 * a `Room` owns a peer connection and a media track, and re-creating one on a
 * state change drops the call.
 */

/** What the portrait and the CSS understand. LiveKit's vocabulary is wider. */
type Face = "idle" | "listening" | "thinking" | "speaking";

const FACE: Record<string, Face> = {
  disconnected: "idle",
  connecting: "thinking",
  initializing: "thinking",
  listening: "listening",
  thinking: "thinking",
  speaking: "speaking",
};

const STATE_COPY: Record<Face, { label: string; hint: string }> = {
  idle: { label: "Standing by", hint: "Tap to talk" },
  listening: { label: "Listening", hint: "Speak — I stop when you do" },
  thinking: { label: "Thinking", hint: "One moment" },
  /*
   * The hint that earns its place. Almost nobody expects to be able to talk over
   * a website, so almost nobody tries — and the one behaviour that makes this
   * feel like a phone call rather than a form goes undiscovered.
   */
  speaking: { label: "Speaking", hint: "Just talk — I'll stop" },
};

/**
 * Per-bar animation offsets for the waveform, as multiples of the cycle.
 * Deliberately uneven — evenly spaced offsets read as a wave travelling in one
 * direction, which looks like a loading spinner rather than a voice.
 */
const WAVE_BARS = [0, 3, 1, 4, 2, 5, 1, 3, 0] as const;

/**
 * Deterministic sparkline paths. Hardcoded rather than generated: `Math.random()`
 * in render is the classic hydration mismatch, and a sparkline that redraws on
 * every keystroke reads as a bug. These are shapes, not data — the number above
 * them is the real value.
 */
const SPARKS = [
  "0,18 12,14 24,16 36,9 48,12 60,6 72,8 84,3",
  "0,10 12,13 24,7 36,11 48,5 60,9 72,4 84,6",
  "0,16 12,12 24,13 36,8 48,10 60,7 72,9 84,5",
  "0,13 12,15 24,9 36,12 48,6 60,10 72,5 84,7",
] as const;

export function VoiceAgent() {
  const roomRef = useRef<Room | null>(null);
  if (roomRef.current === null) {
    roomRef.current = new Room({
      // Echo cancellation is what stops the agent hearing itself through the
      // visitor's speakers and answering it. On by default; set explicitly
      // because it is load-bearing rather than cosmetic.
      audioCaptureDefaults: {
        echoCancellation: true,
        noiseSuppression: true,
        autoGainControl: true,
      },
      adaptiveStream: true,
      dynacast: true,
    });
  }
  const room = roomRef.current;

  const [connecting, setConnecting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const connect = useCallback(async () => {
    setConnecting(true);
    setError(null);
    try {
      const response = await fetch("/api/livekit/token", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      });
      if (!response.ok) {
        const body = (await response.json().catch(() => ({}))) as { error?: string };
        throw new Error(body.error ?? `Token request failed (${response.status}).`);
      }
      const { token, url } = (await response.json()) as { token: string; url: string };

      await room.connect(url, token);
      /*
       * Published after connecting, not before. The browser only prompts for the
       * microphone at this call, so a visitor who declines gets a clear failure
       * here rather than a room they are silently mute in.
       */
      await room.localParticipant.setMicrophoneEnabled(true);
    } catch (err) {
      console.error("[livekit] connect failed:", err);
      await room.disconnect().catch(() => {});
      setError(
        err instanceof Error && err.name === "NotAllowedError"
          ? "I need microphone permission to talk. Allow it in the address bar, then press the orb again."
          : err instanceof Error
            ? err.message
            : "Could not start the conversation.",
      );
    } finally {
      setConnecting(false);
    }
  }, [room]);

  /**
   * End the call.
   *
   * Disconnecting the room is what actually releases the microphone and lets
   * the worker close its session — pausing the UI would leave both running.
   */
  const hangUp = useCallback(async () => {
    await room.disconnect();
  }, [room]);

  // A room left connected when the page unmounts holds the microphone open and
  // keeps a worker busy on a conversation nobody is having.
  useEffect(() => () => void room.disconnect(), [room]);

  return (
    <RoomContext.Provider value={room}>
      {/* Plays the agent's audio. Renders nothing; without it the room is silent. */}
      <RoomAudioRenderer />
      <Console
        onConnect={connect}
        onHangUp={hangUp}
        connecting={connecting}
        error={error}
        onDismiss={() => setError(null)}
      />
    </RoomContext.Provider>
  );
}

/**
 * Everything inside the room context.
 *
 * Split from the component above because the LiveKit hooks read from
 * `RoomContext`, so they have to be called from a child of the provider rather
 * than alongside it.
 */
function Console({
  onConnect,
  onHangUp,
  connecting,
  error,
  onDismiss,
}: {
  onConnect: () => void;
  onHangUp: () => void;
  connecting: boolean;
  error: string | null;
  onDismiss: () => void;
}) {
  const { state, audioTrack, agent } = useVoiceAssistant();
  const connection = useConnectionState();
  const transcriptions = useTranscriptions();

  const live = connection === ConnectionState.Connected;
  const face: Face = live ? (FACE[state] ?? "idle") : connecting ? "thinking" : "idle";
  const copy = STATE_COPY[face];

  /*
   * Two real meters, not one animation.
   *
   * While the agent talks, the bars follow ITS published track — the voice
   * actually reaching the speakers. While it listens, they follow the visitor's
   * own microphone, so the card reacts to them rather than sitting still and
   * claiming to be listening. Both come off the Web Audio analyser on the live
   * track; neither is a CSS cycle pretending.
   */
  const { microphoneTrack } = useLocalParticipant();
  const micTrack =
    microphoneTrack?.track instanceof LocalAudioTrack ? microphoneTrack.track : undefined;

  const agentVolume = useTrackVolume(audioTrack);
  const micVolume = useTrackVolume(micTrack);
  const volume = face === "speaking" ? agentVolume : face === "listening" ? micVolume : 0;

  const rootRef = useRef<HTMLDivElement | null>(null);
  const stageRef = useRef<HTMLDivElement | null>(null);
  const logRef = useRef<HTMLDivElement | null>(null);
  const [tilt, setTilt] = useState({ x: 0, y: 0 });

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

  /** The live transcript, oldest first, labelled by who said it. */
  const lines = useMemo(
    () =>
      transcriptions.map((t) => ({
        id: t.streamInfo.id,
        who: agent && t.participantInfo.identity === agent.identity ? "agent" : ("visitor" as const),
        text: t.text,
      })),
    [transcriptions, agent],
  );

  useEffect(() => {
    const el = logRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [lines]);

  const tiles = [
    { label: "Hearing", value: "Nova 3", unit: "Deepgram streaming" },
    { label: "Reasoning", value: "GPT-4o", unit: "mini, tool-calling" },
    { label: "Voice", value: "Sonic 3", unit: "Cartesia, low latency" },
    { label: "Transport", value: "WebRTC", unit: "full duplex" },
  ];

  const processes = [
    { name: "Signalling", detail: live ? "Room joined" : "Not connected", ok: live },
    { name: "Agent worker", detail: agent ? "Dispatched" : live ? "Waiting" : "Idle", ok: Boolean(agent) },
    { name: "Microphone", detail: live ? "Publishing" : "Closed", ok: live },
    { name: "Turn detection", detail: "Semantic end-of-turn", ok: Boolean(agent) },
  ];
  const allOk = processes.every((p) => p.ok);

  return (
    <div ref={rootRef} className={styles.console} data-state={face}>
      {/* ── Portrait ───────────────────────────────────────────── */}
      <div
        ref={stageRef}
        className={styles.stage}
        onPointerMove={onPointerMove}
        onPointerLeave={() => setTilt({ x: 0, y: 0 })}
        style={
          {
            "--tilt-x": tilt.x.toFixed(3),
            "--tilt-y": tilt.y.toFixed(3),
          } as React.CSSProperties
        }
      >
        <div className={styles.stageGlow} aria-hidden="true" />

        <div className={styles.portrait}>
          <AndroidPortrait state={face} />
        </div>

        {/*
          The vertical slats from the reference. A repeating gradient rather than
          80 elements: one paint, scales to any width, and moves as a single
          layer against the portrait for the parallax.
        */}
        <div className={styles.slats} aria-hidden="true" />
        <div className={styles.stageVignette} aria-hidden="true" />

        <div className={styles.stageBadge}>
          <span className={`${styles.badgeDot} hx-mono`} data-state={face} aria-hidden="true" />
          <span className="hx-mono">HALYX AI · {copy.label.toUpperCase()}</span>
        </div>

        <div
          className={styles.wave}
          data-state={face}
          style={{ "--level": volume.toFixed(3) } as React.CSSProperties}
          aria-hidden="true"
        >
          {WAVE_BARS.map((delay, i) => (
            <i key={i} style={{ "--i": String(delay) } as React.CSSProperties} />
          ))}
        </div>
      </div>

      {/* ── Dashboard ──────────────────────────────────────────── */}
      <div className={styles.glass}>
        <div className={styles.topRow}>
          {/*
            One button, both directions.
            It used to be `disabled` once connected, which left a live call with
            no way out: the microphone stayed open, the worker stayed on the
            session, and pressing the only control on the card did nothing.
          */}
          <button
            type="button"
            className={styles.agent}
            onClick={live ? onHangUp : onConnect}
            disabled={connecting}
            aria-pressed={live}
            aria-label={live ? "End the conversation" : "Start talking to Halyx AI"}
            title={live ? "End the conversation" : "Start talking to Halyx AI"}
          >
            <span
              className={styles.orb}
              data-state={face}
              style={{ "--level": volume.toFixed(3) } as React.CSSProperties}
              aria-hidden="true"
            >
              <span className={styles.orbRing} />
              <span className={styles.orbRing} />
              <span className={styles.orbCore} />
            </span>
            <span className={styles.agentText}>
              <span className={`${styles.agentLabel} hx-mono`}>VOICE AGENT</span>
              <span className={styles.agentState}>{connecting ? "Connecting…" : copy.label}</span>
              {/*
                The hint sits inside the button, so it names what the button
                does — never what the agent is doing. The old console put
                "Tap to interrupt" here while a tap actually hung up, and the
                two are opposite intentions. Agent state is already on the
                badge and in `agentState` above.
              */}
              <span className={styles.agentHint}>
                {connecting ? "One moment" : live ? "Tap to end" : "Tap to talk"}
              </span>
            </span>
          </button>

          <div className={styles.headline}>
            <div className={`${styles.headlineLabel} hx-mono`}>ASK IT ANYTHING</div>
            <div className={styles.headlineValue}>
              It knows the studio, the work, and the people who run it.
            </div>
          </div>

          <a href="#contact" className={styles.cta} aria-label="Go to the contact form">
            <span aria-hidden="true">&#8594;</span>
          </a>
        </div>

        {/* ── Overview ─────────────────────────────────────────── */}
        <div className={styles.section}>
          <div className={styles.sectionHead}>
            <h3 className={styles.sectionTitle}>System Overview</h3>
            <span className={`${styles.sectionMeta} hx-mono`}>LIVEKIT</span>
          </div>

          <div className={styles.tiles}>
            {tiles.map((tile, i) => (
              <div key={tile.label} className={styles.tile}>
                <div className={`${styles.tileLabel} hx-mono`}>{tile.label.toUpperCase()}</div>
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
            <h3 className={styles.sectionTitle}>Active Processes</h3>
            <span className={`${styles.sectionMeta} hx-mono`} data-ok={allOk}>
              {allOk ? "ALL SYSTEMS OPERATIONAL" : live ? "CONNECTING" : "STANDING BY"}
              <i aria-hidden="true" />
            </span>
          </div>

          <ul className={styles.processes}>
            {processes.map((process) => (
              <li key={process.name} className={styles.process}>
                <span className={styles.processName}>{process.name}</span>
                <span className={styles.processDetail}>{process.detail}</span>
                <span className={styles.processBar} data-ok={process.ok} aria-hidden="true">
                  <i />
                </span>
                <span className={`${styles.processState} hx-mono`} data-ok={process.ok}>
                  {process.ok ? "OK" : "—"}
                </span>
              </li>
            ))}
          </ul>
        </div>

        {/* ── Conversation ─────────────────────────────────────── */}
        <div className={styles.section}>
          <div className={styles.sectionHead}>
            <h3 className={styles.sectionTitle}>Conversation</h3>
            <span className={`${styles.sectionMeta} hx-mono`}>
              {face === "speaking" ? "TALK TO INTERRUPT" : "ENGLISH ONLY"}
            </span>
          </div>

          {error && (
            <div className={styles.error} role="status">
              <span>{error}</span>
              <button type="button" onClick={onDismiss} aria-label="Dismiss">
                &times;
              </button>
            </div>
          )}

          <div ref={logRef} className={styles.log} aria-live="polite">
            {lines.length === 0 ? (
              <p className={styles.empty}>
                {live
                  ? "Say something — it is listening. Talk over it any time and it will stop."
                  : "Press the orb, allow the microphone, and talk. You can cut it off mid-sentence."}
              </p>
            ) : (
              lines.map((line) => (
                <div key={line.id} className={styles.line} data-who={line.who}>
                  <span className={`${styles.lineWho} hx-mono`}>
                    {line.who === "agent" ? "HALYX AI" : "YOU"}
                  </span>
                  <p className={styles.lineText}>{line.text}</p>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
