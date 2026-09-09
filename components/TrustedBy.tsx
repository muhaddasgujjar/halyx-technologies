"use client";

import { useState } from "react";
import { ORBIT_PEOPLE } from "@/lib/people";
import { REVIEWS } from "@/lib/reviews";
import { Reveal, RevealScope } from "./Reveal";
import { useSite } from "./SiteProvider";
import styles from "./TrustedBy.module.css";

const METRICS = [
  { value: "99.98%", label: "Uptime across managed platforms" },
  { value: "140ms", label: "Median p95 inference latency" },
  { value: "4", label: "Delivery regions on call" },
] as const;

/** Dashed connectors from the panel centre out to each portrait. */
const CONNECTORS = [
  { d: "M50 46 Q 32 34 16 26", dur: "9s" },
  { d: "M50 46 Q 68 30 84 22", dur: "11s" },
  { d: "M50 46 Q 72 58 84 68", dur: "10s" },
  { d: "M50 46 Q 30 60 16 72", dur: "12s" },
  { d: "M50 46 Q 50 68 50 86", dur: "8.5s" },
] as const;

export function TrustedBy() {
  const { openVideo } = useSite();
  /*
   * Which testimonial is pinned open by a tap. Hover is handled entirely in CSS
   * (`.person:hover .tip`), deliberately: mirroring it here with
   * `onMouseEnter`/`onMouseLeave` broke touch. Tapping a portrait on a phone
   * synthesises `mouseenter` *before* `click`, so the enter handler opened the
   * tooltip and the click handler — seeing it already open — immediately toggled
   * it shut again. Leaving hover to CSS means the tap is the only thing that
   * writes this state.
   */
  const [openTip, setOpenTip] = useState(-1);

  const railItems = [...REVIEWS, ...REVIEWS];

  return (
    <RevealScope variant="blur">
      <section className={styles.section}>
        <div className={styles.glow} aria-hidden="true" />

        <div className={styles.inner}>
          <Reveal className={styles.header}>
            <div className={styles.headerText}>
              <div className={`${styles.eyebrow} hx-mono`}>TRUSTED BY INDUSTRY LEADERS</div>
              <h2 className={styles.h2}>The people who put our systems into production.</h2>
            </div>
            <div className={styles.metrics}>
              {METRICS.map((m) => (
                <div key={m.value}>
                  <div className={styles.metricValue}>{m.value}</div>
                  <div className={styles.metricLabel}>{m.label}</div>
                </div>
              ))}
            </div>
          </Reveal>

          <div className={styles.grid}>
            <Reveal delay={80} className={styles.orbitPanel}>
              <div className={styles.stage}>
                <svg
                  className={styles.connectors}
                  viewBox="0 0 100 100"
                  preserveAspectRatio="none"
                  aria-hidden="true"
                >
                  {CONNECTORS.map((c) => (
                    <path
                      key={c.d}
                      d={c.d}
                      style={{ animation: `hx-dash ${c.dur} linear infinite` }}
                    />
                  ))}
                </svg>

                {ORBIT_PEOPLE.map((p, i) => (
                  <div
                    key={p.name}
                    className={styles.person}
                    style={{ left: p.left, top: p.top }}
                    data-open={openTip === i}
                  >
                    <div className={styles.personFloat} style={{ animation: p.float }}>
                      <button
                        type="button"
                        className={styles.ring}
                        style={{ width: p.size, height: p.size }}
                        aria-label={`Testimonial from ${p.name}, ${p.role}`}
                        onClick={() => setOpenTip((v) => (v === i ? -1 : i))}
                      >
                        {/* Placeholder stand-ins — swap for real client photography. */}
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={p.img} alt="" loading="lazy" decoding="async" />
                      </button>

                      <div className={styles.personLabel}>
                        <div className={styles.personName}>{p.name}</div>
                        <div className={`${styles.personRole} hx-mono`}>{p.role}</div>
                      </div>

                      <div
                        className={`${styles.tip} ${
                          p.tipDir === "down" ? styles.tipDown : styles.tipUp
                        }`}
                        style={{ width: p.tipWidth }}
                      >
                        <div className={styles.tipBorder}>
                          <div className={styles.tipBody}>
                            <div className={`${styles.tipEyebrow} hx-mono`}>CLIENT TESTIMONIAL</div>
                            <p className={styles.tipQuote}>{p.quote}</p>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}

                <button type="button" className={styles.videoCard} onClick={openVideo}>
                  <span className={styles.videoBorder} style={{ display: "block" }}>
                    <span className={styles.videoBody} style={{ display: "block" }}>
                      <span className={styles.poster}>
                        <span className={styles.posterDots} aria-hidden="true" />
                        <span className={styles.play}>
                          <span className={styles.playRing} aria-hidden="true" />
                          <span className={styles.playTriangle} aria-hidden="true" />
                        </span>
                      </span>
                      <span className={styles.videoFoot}>
                        <span style={{ minWidth: 0 }}>
                          <span className={styles.videoTitle} style={{ display: "block" }}>
                            Inside Halyx &mdash; showcase film
                          </span>
                          <span
                            className={`${styles.videoMeta} hx-mono`}
                            style={{ display: "block" }}
                          >
                            00:10 &middot; APPLIED AI STUDIO
                          </span>
                        </span>
                        <span className={`${styles.videoBadge} hx-mono`}>PLAY</span>
                      </span>
                    </span>
                  </span>
                </button>
              </div>
            </Reveal>

            <Reveal delay={140} className={styles.rail}>
              <div className={styles.railHead}>
                <div className={`${styles.railLabel} hx-mono`}>CLIENT TESTIMONIALS</div>
                {/* The rail auto-scrolls in both cases; only the way you stop it
                    differs — hovering with a pointer, resting a finger on touch. */}
                <div className={`${styles.railHint} hx-mono`}>
                  <span className="hx-pointer-only">HOVER TO PAUSE</span>
                  <span className="hx-touch-only">TOUCH TO PAUSE</span>
                </div>
              </div>
              <div className={styles.railViewport}>
                <div className={styles.railTrack}>
                  {railItems.map((r, i) => (
                    <figure
                      key={`${r.name}-${i}`}
                      className={styles.review}
                      aria-hidden={i >= REVIEWS.length}
                      // The UA's default figure margin is reset in the
                      // stylesheet, not inline: the small-screen marquee needs a
                      // trailing margin on each card, and an inline `margin: 0`
                      // outranks any rule that tries to set one.
                    >
                      <blockquote className={styles.reviewQuote} style={{ margin: 0 }}>
                        {r.q}
                      </blockquote>
                      <figcaption className={styles.reviewMeta}>
                        <div className={styles.avatar} aria-hidden="true">
                          {r.ini}
                        </div>
                        <div style={{ minWidth: 0 }}>
                          <div className={styles.reviewName}>{r.name}</div>
                          <div className={styles.reviewRole}>{r.role}</div>
                        </div>
                      </figcaption>
                    </figure>
                  ))}
                </div>
              </div>
            </Reveal>
          </div>
        </div>
      </section>
    </RevealScope>
  );
}
