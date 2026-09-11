import type { Metadata } from "next";
import Link from "next/link";
import { VoiceAgent } from "@/components/VoiceAgent";
import styles from "./page.module.css";

/**
 * `/voice` — the LiveKit agent, on its own page.
 *
 * Deliberately NOT the homepage. The homepage still mounts the older
 * Groq-based console (`components/halyx-ai/`), which opens its own microphone
 * and runs its own turn loop; two voice agents on one page fight over the
 * device and over the visitor. Keeping this route bare also means that when
 * something misbehaves here, it is this pipeline misbehaving — there is nothing
 * else on the page that could be the cause.
 *
 * Needs the Python worker running alongside `next dev`:
 *
 *     .venv\Scripts\python agent.py dev
 */

export const metadata: Metadata = {
  title: "Voice agent — Halyx Technologies",
  description: "Talk to the Halyx voice agent about what you are building.",
  // A test surface, not a landing page.
  robots: { index: false, follow: false },
};

export default function VoicePage() {
  return (
    <main className={styles.page}>
      <header className={styles.head}>
        <h1 className={styles.title}>Halyx Voice Agent</h1>
        <p className={styles.sub}>
          Press start, allow the microphone, and talk. You can cut it off mid-sentence —
          it stops and answers what you actually asked.
        </p>
      </header>

      <div className={styles.stage}>
        <VoiceAgent />
      </div>

      <footer className={styles.foot}>
        <p>
          Deepgram <code>nova-3</code> for hearing, <code>gpt-4o-mini</code> for thinking,
          Cartesia <code>sonic-3</code> for the voice, over WebRTC.
        </p>
        <Link href="/" className={styles.back}>
          &larr; Back to the site
        </Link>
      </footer>
    </main>
  );
}
