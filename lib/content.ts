export interface Highlight {
  metric: string;
  metricLabel: string;
  title: string;
  blurb: string;
  more: string;
}

export const HIGHLIGHTS: Highlight[] = [
  {
    metric: "40+",
    metricLabel: "INTERFACES SHIPPED",
    title: "Design\u2013First Innovation",
    blurb: "Award-winning UI/UX and interface work that makes complex systems feel obvious.",
    more: "Discovery, UX flows, design systems and prototypes that survive contact with engineering.",
  },
  {
    metric: "99.9%",
    metricLabel: "PLATFORM UPTIME",
    title: "Engineering Excellence",
    blurb: "Typed codebases, tested pipelines, and scalable AI architecture built to hand over.",
    more: "Every build leaves with documentation, CI, observability and a team that can run it without us.",
  },
  {
    metric: "4x",
    metricLabel: "MEDIAN ROI",
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
  bio: string;
  /** Portrait photography is not yet supplied — null renders the placeholder treatment. */
  img: string | null;
}

export const TEAM: TeamMember[] = [
  {
    name: "Team Member",
    title: "Co\u2013Founder & Partner",
    tag: "PARTNER",
    bio: "Leads client strategy and delivery. Fifteen years building data products for regulated industries.",
    img: null,
  },
  {
    name: "Team Member",
    title: "Co\u2013Founder & CTO",
    tag: "CTO",
    bio: "Owns architecture and the AI platform. Previously scaled ML infrastructure to 40M daily inferences.",
    img: null,
  },
  {
    name: "Team Member",
    title: "Head of Product",
    tag: "PRODUCT",
    bio: "Runs discovery and design. Turns messy operational problems into shippable product scope.",
    img: null,
  },
];

export const INTERESTS = ["UI/UX", "Development", "AI Systems", "Branding", "Business automation"];

export const FOOTER_COLUMNS = [
  {
    label: "ABOUT US",
    links: [
      { text: "Team", href: "#company" },
      { text: "Vision", href: "#company" },
      { text: "Projects", href: "#company" },
    ],
  },
  {
    label: "SERVICES",
    links: [
      { text: "Product Design", href: "#services" },
      { text: "Custom Software", href: "#services" },
      { text: "AI Development", href: "#services" },
      { text: "Data Engineering", href: "#services" },
      { text: "Cloud & DevOps", href: "#services" },
      { text: "Go-to-Market", href: "#services" },
    ],
  },
  {
    label: "OTHER SERVICES",
    links: [
      { text: "Voice Agents", href: "#services" },
      { text: "Sentiment AI", href: "#services" },
      { text: "IoT Development", href: "#services" },
      { text: "Brand Identity", href: "#services" },
      { text: "Motion Design", href: "#services" },
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

export const SOCIALS = ["in", "X", "IG", "YT", "FB", "TT"] as const;
