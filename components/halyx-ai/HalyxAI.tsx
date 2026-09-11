"use client";

import { VoiceAgent } from "../VoiceAgent";
import { useLocale } from "../LocaleProvider";
import { Reveal, RevealScope } from "../Reveal";
import styles from "./HalyxAI.module.css";

/**
 * The Halyx AI section — the `#halyx-ai` the nav has always pointed at.
 *
 * Section chrome only: the badge, the heading and the ambient glow. What sits
 * inside it is now {@link VoiceAgent}, the LiveKit client — the browser holds a
 * WebRTC call with the Python worker in `agent.py`, and Next.js carries none of
 * the audio.
 *
 * It replaced a browser-side agent that ran the whole loop in this page:
 * MediaRecorder into `/api/voice/transcribe`, Groq for the answer, the
 * browser's own speech synthesiser for the voice. That version was doing by
 * hand what a media server does properly — turn-taking, barge-in, echo
 * handling, resampling — and every one of those was a bug we fixed twice. It is
 * gone rather than kept alongside, because two agents on one page fight for the
 * microphone.
 *
 * It sits immediately before the contact form on purpose. A visitor who has just
 * watched the studio's own agent answer a question about the studio is one
 * scroll away from asking a human the same thing.
 */
export function HalyxAI() {
  const { t } = useLocale();

  return (
    <RevealScope variant="scale">
      <section id="halyx-ai" className={styles.section}>
        <div className={styles.glow} aria-hidden="true" />

        <div className={styles.inner}>
          <Reveal className={styles.header}>
            <div className={`${styles.badge} hx-mono`}>
              <span className={styles.badgeDot} aria-hidden="true" />
              HALYX AI
            </div>
            <h2 className={styles.h2}>{t("Talk to the thing we build")}</h2>
            <p className={styles.intro}>
              {t(
                "A real voice agent, not a chat box with a microphone bolted on. Deepgram hears you, GPT answers from Halyx’s own material, Cartesia speaks — over a live WebRTC call. Talk over it mid-sentence and it stops, the way a person does. Ask what we’ve shipped, how we work, or who’s behind it. English only.",
              )}
            </p>
          </Reveal>

          <Reveal delay={140}>
            <VoiceAgent />
          </Reveal>
        </div>
      </section>
    </RevealScope>
  );
}
