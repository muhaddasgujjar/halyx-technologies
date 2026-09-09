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

/** Hero count-up targets, rendered as `60+`, `12`, `24/7`. */
export const COUNTER_TARGETS: readonly [number, number, number] = [60, 12, 24];
