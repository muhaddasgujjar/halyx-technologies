export interface Hub {
  name: string;
  /** [longitude, latitude] */
  c: [number, number];
  year: string;
  t: string;
}

/** The story markers on the dotted world map, in chronological order. */
export const HUBS: Hub[] = [
  { name: "atlanta", c: [-84.39, 33.75], year: "2019", t: "Founded. Two engineers, one product, a rented desk." },
  { name: "london", c: [-0.13, 51.51], year: "2021", t: "First platform shipped. 10k users in nine months." },
  { name: "berlin", c: [13.4, 52.52], year: "2022", t: "Enterprise clients arrive. AI automation becomes the core practice." },
  { name: "dubai", c: [55.27, 25.2], year: "2023", t: "Regional delivery hub opens. Round-the-clock support begins." },
  { name: "bengaluru", c: [77.59, 12.97], year: "2024", t: "Engineering scales past 200 people. ML platform goes multi-tenant." },
  { name: "singapore", c: [103.82, 1.35], year: "2025", t: "Voice and vision products launch with regional partners." },
  { name: "sao paulo", c: [-46.63, -23.55], year: "2026", t: "Four regions, 200-500 employees, 60+ products in production." },
  { name: "sydney", c: [151.21, -33.87], year: "now", t: "Follow-the-sun delivery across every client time zone." },
];

/** Traffic arcs drawn between hubs. */
export const ROUTES: [number, number][] = [
  [0, 1], [1, 2], [2, 3], [3, 4], [4, 5], [0, 6], [5, 7], [0, 2],
];
