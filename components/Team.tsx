import Image from "next/image";
import { TEAM } from "@/lib/content";
import { Reveal, RevealScope } from "./Reveal";
import styles from "./Team.module.css";

const DELAYS = [60, 140, 220];

export function Team() {
  return (
    <RevealScope variant="rise">
      <section className={styles.section}>
        <div className={styles.inner}>
          <Reveal as="h2" className={styles.h2}>
            Meet the Team
            <br />
            Behind Halyx
          </Reveal>

          <div className={styles.grid}>
            {TEAM.map((m, i) => (
              <Reveal key={m.title} delay={DELAYS[i]} className={styles.card}>
                {m.img ? (
                  <div className={styles.photo}>
                    <Image src={m.img} alt={m.name} fill sizes="(max-width: 780px) 100vw, 360px" />
                  </div>
                ) : (
                  <div className={`${styles.placeholder} hx-mono`}>portrait</div>
                )}

                <div className={styles.scrim} aria-hidden="true" />

                <div className={styles.base}>
                  <div className={styles.name}>{m.name}</div>
                  <div className={styles.title}>{m.title}</div>
                </div>

                <div className={styles.detail}>
                  <div className={`${styles.tag} hx-mono`}>{m.tag}</div>
                  <div className={styles.name}>{m.name}</div>
                  <p className={styles.bio}>{m.bio}</p>
                  <a
                    href="#contact"
                    className={styles.social}
                    aria-label={`Contact ${m.name}`}
                  >
                    in
                  </a>
                </div>
              </Reveal>
            ))}
          </div>

          <Reveal as="p" className={`${styles.footnote} hx-mono`}>
            portrait placeholders &mdash; drop in real photos
          </Reveal>
        </div>
      </section>
    </RevealScope>
  );
}
