/** Host-tweakable knobs, carried over from the prototype's props panel. */
export const SITE_CONFIG = {
  /** Master motion switch. `prefers-reduced-motion` overrides this at runtime. */
  enableMotion: true,
  /** Point count for the travelling cloud. Design default 1500; range 300–3500. */
  particleDensity: 1500,
  showHeroStats: true,
  showFooterWordmark: true,
} as const;

/** Particle colour, rgb triple. */
export const ACCENT: readonly [number, number, number] = [188, 178, 255];

/*
 * The hero's count-up targets used to live here as `[60, 12, 24]` — rendered
 * `60+ Products Shipped`, `12 Industries Served`, `24/7 Support`. None was
 * backed by anything, and the page contradicted itself: Highlights claimed
 * `40+` for what sounded like the same thing while TrustedBy honestly derived
 * `5`. They are now read off the same data the rest of the page renders, in
 * `components/Counters.tsx`, so they cannot be set to a number nobody can
 * defend.
 */
