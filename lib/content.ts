export interface Highlight {
  /**
   * Position marker, not a measurement.
   *
   * These cards used to lead with `40+ INTERFACES SHIPPED`, `99.9% PLATFORM
   * UPTIME` and `4x MEDIAN ROI`. Nothing in the repo backed any of them, no
   * monitoring exists to back the uptime figure, and the hero claimed a
   * different products number on the same scroll. They are replaced with the
   * same `01`/`02` numbering the Beliefs section uses: it keeps the card's
   * visual anchor and claims nothing.
   */
  num: string;
  /** Category, for the right of the card head. Also not a claim. */
  label: string;
  title: string;
  blurb: string;
  more: string;
}

export const HIGHLIGHTS: Highlight[] = [
  {
    num: "01",
    label: "DESIGN",
    title: "Design\u2013First Innovation",
    blurb: "Award-winning UI/UX and interface work that makes complex systems feel obvious.",
    more: "Discovery, UX flows, design systems and prototypes that survive contact with engineering.",
  },
  {
    num: "02",
    label: "ENGINEERING",
    title: "Engineering Excellence",
    blurb: "Typed codebases, tested pipelines, and scalable AI architecture built to hand over.",
    more: "Every build leaves with documentation, CI, observability and a team that can run it without us.",
  },
  {
    num: "03",
    label: "IMPACT",
    title: "Real\u2013World Impact",
    blurb: "From healthcare to enterprise AI, our work drives measurable business outcomes.",
    more: "We agree the metric before the first sprint and report against it until it moves.",
  },
];

export interface Belief {
  num: string;
  /** Leading sentence, rendered at full strength. */
  lead: string;
  /** Optional trailing clause, rendered muted. */
  trail?: string;
  more: string;
}

export const BELIEFS: Belief[] = [
  {
    num: "01",
    lead: "Design first, always.",
    trail: "Every product starts with empathy and storytelling.",
    more: "We run discovery before a single screen is drawn, so the brief matches the real problem.",
  },
  {
    num: "02",
    lead: "AI should amplify humans, not replace them.",
    more: "Every system we ship keeps a person in the loop where judgement matters.",
  },
  {
    num: "03",
    lead: "Innovation is only meaningful when it drives impact.",
    more: "We agree the success metric up front and report against it in every review.",
  },
  {
    num: "04",
    lead: "We move fast \u2014 but never at the cost of quality or integrity.",
    more: "Short cycles, tested code, and honest status. No surprise invoices, no silent slippage.",
  },
];

export interface TeamMember {
  name: string;
  title: string;
  tag: string;
  /**
   * Shown on the card's hover/tap panel.
   *
   * These describe the remit of the role at Halyx. They deliberately make no
   * claims about years of experience, previous employers or numbers delivered:
   * these are real, named people, and copy like that has to come from them
   * rather than from whoever is writing the component.
   */
  bio: string;
  /** Falls back to the striped placeholder treatment when null. */
  img: string | null;
  /**
   * `object-position` for the portrait crop. The cards are 3:4 on desktop and
   * squarer on a phone, so one shared default cuts some of these photographs
   * across the chin; each is framed on its own subject instead.
   */
  focus?: string;
  /** Opens in a new tab from the card's `in` badge. */
  linkedin?: string;
}

export const TEAM: TeamMember[] = [
  {
    name: "Muhammad Muhaddas",
    title: "Chief Executive Officer",
    tag: "CEO",
    bio: "Sets the studio’s direction and stays close to every engagement, from the first brief through to what ships.",
    img: "/media/team-muhaddas.png",
    focus: "56% 16%",
    linkedin: "https://www.linkedin.com/in/muhaddas-basit-90614b320/",
  },
  {
    name: "Muhammad Aleem Azam",
    title: "Co-Founder",
    tag: "CO-FOUNDER",
    bio: "Owns the architecture behind the AI platform, and the engineering standards every build is handed over against.",
    img: "/media/team-aleem.png",
    focus: "45% 14%",
    linkedin: "https://www.linkedin.com/in/aleem-azam-937724345/",
  },
  {
    name: "Muhammad Numan Ali",
    title: "Co-Founder",
    tag: "CO-FOUNDER",
    bio: "Runs delivery day to day — scope, schedule, and the reporting clients see against the metric agreed up front.",
    img: "/media/team-numan.jpeg",
    focus: "52% 18%",
    linkedin: "https://www.linkedin.com/in/muhammad-numan-ali-60102b3a9/",
  },
];

export const INTERESTS = ["UI/UX", "Development", "AI Systems", "Branding", "Business automation"];

/*
 * Root-relative anchors ("/#company", not "#company").
 *
 * The footer renders on the service pages too, where a bare "#company" points
 * at an element that does not exist on that route and silently does nothing.
 * The leading slash sends the visitor to the homepage and then to the section.
 */
export const FOOTER_COLUMNS = [
  {
    label: "ABOUT US",
    links: [
      { text: "Team", href: "/#company" },
      { text: "Vision", href: "/#company" },
      { text: "Projects", href: "/#company" },
    ],
  },
  {
    /*
     * The five practices, each pointing at its own page rather than at the
     * `#services` anchor they all used to share. These are real internal
     * links to real URLs, which is what makes the service pages reachable —
     * by a visitor and by a crawler.
     *
     * The list is the practices in `lib/services.ts`, not a longer wish list:
     * a footer link to something the studio does not have a page for is the
     * same broken promise as a dead social icon.
     */
    label: "SERVICES",
    links: [
      { text: "AI & Machine Learning", href: "/services/ai-machine-learning" },
      { text: "Custom Software", href: "/services/custom-software" },
      { text: "Web & Mobile Apps", href: "/services/web-mobile-apps" },
      { text: "Business Automation", href: "/services/business-automation" },
      { text: "Data & Cloud", href: "/services/data-cloud" },
    ],
  },
  {
    label: "OTHER SERVICES",
    links: [
      { text: "Voice Agents", href: "/#services" },
      { text: "Sentiment AI", href: "/#services" },
      { text: "IoT Development", href: "/#services" },
      { text: "Brand Identity", href: "/#services" },
      { text: "Motion Design", href: "/#services" },
    ],
  },
] as const;

export const NAV_LINKS = [
  { text: "Work", href: "#work" },
  { text: "Company", href: "#company" },
  { text: "Services", href: "#services" },
  { text: "Halyx AI", href: "#halyx-ai" },
  { text: "Contact", href: "#contact" },
] as const;

