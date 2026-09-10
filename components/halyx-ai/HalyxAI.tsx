import { Reveal, RevealScope } from "../Reveal";
import { Console } from "./Console";
import styles from "./HalyxAI.module.css";

/**
 * The Halyx AI section — the `#halyx-ai` the nav has always pointed at.
 *
 * Section chrome only: the badge, the heading and the ambient glow. The console
 * itself is a client component and owns everything that moves, so this wrapper
 * stays a server component and the microphone code never enters the bundle for
 * visitors who scroll past it.
 *
 * It sits immediately before the contact form on purpose. A visitor who has just
 * watched the studio's own agent answer a question about the studio is one
 * scroll away from asking a human the same thing — and the console's own CTA
 * points at that form.
 */
export function HalyxAI() {
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
            <h2 className={styles.h2}>Talk to the thing we build</h2>
            <p className={styles.intro}>
              A voice agent grounded in Halyx&rsquo;s own material &mdash; speech recognition,
              retrieval and synthesis, running live on this page. It speaks first. Ask it what
              we charge, what we&rsquo;ve shipped, or who works here &mdash; out loud, in any of
              fifteen languages. Switch language in the top bar.
            </p>
          </Reveal>

          <Reveal delay={140}>
            <Console />
          </Reveal>
        </div>
      </section>
    </RevealScope>
  );
}
