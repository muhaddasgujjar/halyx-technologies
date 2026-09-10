import { PROJECTS } from "./projects";

export interface ProofPoint {
  /** Avatar monogram. */
  ini: string;
  name: string;
  role: string;
  /** The claim itself. */
  q: string;
}

/**
 * The proof rail on the homepage.
 *
 * This used to hold six client testimonials attributed to named individuals —
 * copy written during design, which the file itself flagged as "not yet approved
 * client quotes, confirm names, titles and permission before launch". They were
 * never confirmed, and the invented outcome numbers inside them (28% fewer late
 * deliveries, 46% faster intake, 31% less stock waste) were being read back to
 * prospects by the assistant as if they were Halyx results.
 *
 * Attributing words to a named person who never said them is not a copy problem
 * that can be fixed by softening the wording, so the quotes are gone. What
 * replaced them is stronger anyway: five products that are live, linkable, and
 * true, derived from `lib/projects.ts` so they cannot drift from the case-study
 * section.
 *
 * When real, signed-off client quotes exist, they belong here — alongside these,
 * not instead of them.
 */
export const PROOF_POINTS: ProofPoint[] = PROJECTS.map((project) => ({
  ini: project.name
    .replace(/[^A-Za-z& ]/g, "")
    .split(/[\s&]+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((word) => word[0]?.toUpperCase() ?? "")
    .join(""),
  name: project.name,
  role: `${project.cat.toUpperCase()} · ${project.host}`,
  q: project.solution,
}));
