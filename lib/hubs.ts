export interface Hub {
  name: string;
  /** [longitude, latitude] */
  c: [number, number];
  /** Accent eyebrow above the tooltip text. */
  label: string;
  t: string;
}

/**
 * Markers on the dotted world map.
 *
 * These describe delivery coverage — the time zones Halyx works across and the
 * kind of work done in each — not offices or headcount. The earlier copy
 * claimed staffed regional hubs and "200-500 employees", which contradicted the
 * three named people in `lib/content.ts`. Anything here has to be defensible
 * against that section.
 */
export const HUBS: Hub[] = [
  { name: "atlanta", c: [-84.39, 33.75], label: "NORTH AMERICA", t: "Product engineering and applied-AI builds." },
  { name: "london", c: [-0.13, 51.51], label: "UK & EUROPE", t: "Web platforms, design systems and front-end work." },
  { name: "berlin", c: [13.4, 52.52], label: "CENTRAL EUROPE", t: "Business automation and systems integration." },
  { name: "dubai", c: [55.27, 25.2], label: "MIDDLE EAST", t: "Client delivery across GCC time zones." },
  { name: "bengaluru", c: [77.59, 12.97], label: "SOUTH ASIA", t: "Machine learning, data engineering and MLOps." },
  { name: "singapore", c: [103.82, 1.35], label: "APAC", t: "Voice and vision product work." },
  { name: "sao paulo", c: [-46.63, -23.55], label: "SOUTH AMERICA", t: "Web and mobile product delivery." },
  { name: "sydney", c: [151.21, -33.87], label: "OCEANIA", t: "Follow-the-sun coverage across client time zones." },
];

/** Traffic arcs drawn between hubs. */
export const ROUTES: [number, number][] = [
  [0, 1], [1, 2], [2, 3], [3, 4], [4, 5], [0, 6], [5, 7], [0, 2],
];
