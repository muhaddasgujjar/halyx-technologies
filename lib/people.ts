export interface OrbitCard {
  /** Card title — a capability, not a person. */
  name: string;
  /** Which shipped product anchors it. */
  role: string;
  img: string;
  /** What the product actually does. No attributed speaker. */
  quote: string;
  /** Percentage position inside the orbit stage. */
  left: string;
  top: string;
  /** Portrait diameter — clamp() straight from the design. */
  size: string;
  /** Float keyframe name + duration + delay. */
  float: string;
  /** Top-row tooltips open downward, bottom-row ones upward. */
  tipDir: "down" | "up";
  tipWidth: string;
}

/**
 * The orbiting cards around the video panel.
 *
 * These were placeholder stand-ins from the design process: stock portraits
 * captioned with invented names — two of which were German UI strings nobody had
 * replaced ("Eindruck zählt", "Karriere") — attached to invented client quotes
 * carrying outcome numbers the studio could not stand behind.
 *
 * A portrait with a name and a quote reads as an endorsement from a real person,
 * so softening the wording would not have fixed it. The portraits stay as
 * decoration; each card now states a capability anchored on a product that
 * actually shipped, with no speaker attached and nothing to disprove.
 *
 * `lib/reviews.ts` documents the same fix applied to the rail below this one.
 */
export const ORBIT_CARDS: OrbitCard[] = [
  {
    name: "Real-time AI",
    role: "MAIKU AI · LIVE",
    img: "/media/portrait-1.png",
    quote:
      "Live interview transcription and answer drafting, fast enough to keep up with the call — and absent from the frame when the call is being screen-shared.",
    left: "16%",
    top: "26%",
    size: "clamp(58px,9.8vw,88px)",
    float: "hx-float-a 8s ease-in-out infinite 0s",
    tipDir: "down",
    tipWidth: "clamp(210px,22vw,262px)",
  },
  {
    name: "Generative design",
    role: "ARCHITECTXPERT · LIVE",
    img: "/media/portrait-2.png",
    quote:
      "Plot size and room counts in, a dimensioned architectural plan out — with DXF export an architect or contractor can keep working in.",
    left: "84%",
    top: "22%",
    size: "clamp(58px,9.1vw,82px)",
    float: "hx-float-c 9.4s ease-in-out infinite 1.2s",
    tipDir: "down",
    tipWidth: "clamp(210px,22vw,262px)",
  },
  {
    name: "Grounded research",
    role: "AXIOM · LIVE",
    img: "/media/portrait-3.png",
    quote:
      "A research agent that separates claims from reasoning and keeps every claim linked to the source it came from, so a conclusion can be defended.",
    left: "84%",
    top: "68%",
    size: "clamp(58px,9.3vw,84px)",
    float: "hx-float-b 10s ease-in-out infinite 0.6s",
    tipDir: "up",
    tipWidth: "clamp(210px,22vw,262px)",
  },
  {
    name: "Voice interfaces",
    role: "CARTESIA ASSISTANT · LIVE",
    img: "/media/portrait-4.png",
    quote:
      "Streaming turn-taking on synthesised speech, so the reply starts speaking while the rest of it is still being generated.",
    left: "16%",
    top: "72%",
    size: "clamp(58px,8.9vw,80px)",
    float: "hx-float-d 8.8s ease-in-out infinite 1.8s",
    tipDir: "up",
    tipWidth: "clamp(210px,22vw,262px)",
  },
  {
    name: "Lead capture",
    role: "H&B EVENTS · LIVE",
    img: "/media/portrait-5.png",
    quote:
      "A thirty-year event production business moved off WhatsApp referrals and onto structured quote requests it can forward internally.",
    left: "50%",
    top: "88%",
    size: "clamp(58px,8.4vw,76px)",
    float: "hx-float-e 11s ease-in-out infinite 2.4s",
    tipDir: "up",
    tipWidth: "clamp(200px,20vw,238px)",
  },
];
