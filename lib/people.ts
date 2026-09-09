export interface OrbitPerson {
  name: string;
  role: string;
  img: string;
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
 * Placeholder stand-ins from the design process.
 * Replace with real client photography, or drop the faces, before launch.
 */
export const ORBIT_PEOPLE: OrbitPerson[] = [
  {
    name: "Eindruck z\u00e4hlt",
    role: "CTO \u00B7 CURALINK",
    img: "/media/portrait-1.png",
    quote:
      "\u201CThey shipped the model into production behind an SLA we could actually sign. Nothing we had seen from an agency came close to that.\u201D",
    left: "16%",
    top: "26%",
    size: "clamp(58px,9.8vw,88px)",
    float: "hx-float-a 8s ease-in-out infinite 0s",
    tipDir: "down",
    tipWidth: "clamp(210px,22vw,262px)",
  },
  {
    name: "Loius Walker",
    role: "VP ENG \u00B7 NORTEX",
    img: "/media/portrait-2.png",
    quote:
      "\u201CLate deliveries fell 28% in the first quarter. The handover was the part that surprised me \u2014 our engineers owned it in two weeks.\u201D",
    left: "84%",
    top: "22%",
    size: "clamp(58px,9.1vw,82px)",
    float: "hx-float-c 9.4s ease-in-out infinite 1.2s",
    tipDir: "down",
    tipWidth: "clamp(210px,22vw,262px)",
  },
  {
    name: "Lovie Hardin",
    role: "HEAD OF DATA \u00B7 VANTIQ",
    img: "/media/portrait-3.png",
    quote:
      "\u201COur forecasting pipeline used to be one notebook and one person. It is now a tested service the whole data team can change.\u201D",
    left: "84%",
    top: "68%",
    size: "clamp(58px,9.3vw,84px)",
    float: "hx-float-b 10s ease-in-out infinite 0.6s",
    tipDir: "up",
    tipWidth: "clamp(210px,22vw,262px)",
  },
  {
    name: "Karriere",
    role: "COO \u00B7 BLUEPEAK",
    img: "/media/portrait-4.png",
    quote:
      "\u201CThey asked what number we were trying to move before they wrote any code, then reported against it every sprint.\u201D",
    left: "16%",
    top: "72%",
    size: "clamp(58px,8.9vw,80px)",
    float: "hx-float-d 8.8s ease-in-out infinite 1.8s",
    tipDir: "up",
    tipWidth: "clamp(210px,22vw,262px)",
  },
  {
    name: "Thais Miranda",
    role: "PRODUCT \u00B7 SYNERGISE4",
    img: "/media/portrait-5.png",
    quote:
      "\u201CThe design system meant the second product took a third of the time. That compounding was worth more than the first build.\u201D",
    left: "50%",
    top: "88%",
    size: "clamp(58px,8.4vw,76px)",
    float: "hx-float-e 11s ease-in-out infinite 2.4s",
    tipDir: "up",
    tipWidth: "clamp(200px,20vw,238px)",
  },
];
