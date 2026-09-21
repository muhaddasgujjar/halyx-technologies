import { PROJECTS } from "@/lib/projects";
import { SERVICES, type Service } from "@/lib/services";

/**
 * The long-form, indexable half of each practice.
 *
 * Why this exists: until now every service lived inside `#services` on the
 * homepage. An anchor is not a URL — Google saw one document about five
 * different things and ranked it for none of them. These are real routes with
 * their own titles, descriptions and copy, which is the single structural
 * change the site needed to be findable for anything commercial.
 *
 * Keyed by slug and joined to `SERVICES` at build time, so the card on the
 * homepage and the page it links to cannot describe different offerings.
 *
 * The same rule as everywhere else applies to the copy below: no uptime
 * percentages, no ROI multiples, no project totals. Where a number appears it
 * is a count of something on this site that a reader can click.
 */

export interface ServiceFaq {
  q: string;
  a: string;
}

export interface ServiceSection {
  heading: string;
  body: string;
  /** Rendered as an H3 list beneath the section body. */
  points?: { heading: string; body: string }[];
}

export interface ServicePage {
  slug: string;
  /** Must match a `SERVICES` title exactly — enforced in `SERVICE_PAGES`. */
  title: string;
  /** <title>, kept under 60 characters including the brand suffix. */
  seoTitle: string;
  /** <meta name="description">, kept under 155 characters. */
  seoDescription: string;
  h1: string;
  /** Opening paragraph, above the fold. */
  lede: string;
  sections: ServiceSection[];
  faqs: ServiceFaq[];
  /** `PROJECTS[].name` values shown as proof on this page. */
  proof: string[];
}

export const SERVICE_PAGES: ServicePage[] = [
  {
    slug: "ai-machine-learning",
    title: "AI & Machine Learning",
    seoTitle: "AI Agent Development Company",
    seoDescription:
      "We build production AI agents, not demos. Four live systems you can open right now. Free scoping call and a straight answer on fit, inside two working days.",
    h1: "AI agent development that reaches production",
    lede: "Most AI work stalls between a convincing demo and a system anyone can depend on. The gap is rarely the model. It is evaluation, latency, error handling and the unglamorous work of making a probabilistic component behave inside a deterministic product. Four of the systems below are live right now and you can open every one of them.",
    sections: [
      {
        heading: "What we build",
        body: "Five shapes of work, all of them shipped rather than theorised.",
        points: [
          {
            heading: "LLM and agent systems",
            body: "Multi-step agents with tool calling, orchestration and a defined failure mode for every step. Built so a wrong answer is caught rather than served.",
          },
          {
            heading: "RAG systems that cite their sources",
            body: "Retrieval that keeps the link between a claim and the document it came from, so a conclusion can be defended rather than trusted. Axiom runs to roughly 50 sources per report on this pattern.",
          },
          {
            heading: "Real-time voice agents",
            body: "Streaming speech-to-text, turn detection and synthesis that starts speaking before generation finishes. The assistant on this site is one, and you can interrupt it mid-sentence.",
          },
          {
            heading: "Document intelligence",
            body: "Extraction and classification pipelines over messy real-world documents, with a confidence threshold that routes the uncertain cases to a person instead of guessing.",
          },
          {
            heading: "Predictive modelling and computer vision",
            body: "Forecasting, classification and vision models, with the evaluation harness built at the same time as the model rather than after it.",
          },
        ],
      },
      {
        heading: "Why most AI agents never reach production",
        body: "Four failure modes account for nearly all of it, and none of them is about picking the right model.",
        points: [
          {
            heading: "Evaluation is the part most vendors skip",
            body: "Without a regression suite over prompts, a change that fixes one case silently breaks four others. We build the harness first, so quality is measured rather than asserted.",
          },
          {
            heading: "Model deprecation will break your application",
            body: "Providers retire model ids on a rolling schedule and do not keep them alive. This site runs a health check against its own model id for exactly that reason, and it is an early warning rather than an outage.",
          },
          {
            heading: "Latency is a product decision, not a tuning pass",
            body: "A voice agent that takes three seconds to answer is a different product from one that takes eight hundred milliseconds. That has to be designed in at the architecture stage.",
          },
          {
            heading: "Nobody owns it after handover",
            body: "Every build leaves with documentation, CI, observability and a team that can run it without us. That is the definition of done.",
          },
        ],
      },
      {
        heading: "How an engagement runs",
        body: "Paid discovery sprint first, then a fixed-scope build. An MVP is typically four to eight weeks; larger platforms run in six-week phases with a working demo at the end of each. The success metric is agreed before the first sprint and reported against in every review.",
      },
    ],
    faqs: [
      {
        q: "How much does it cost to build an AI agent?",
        a: "It depends on how much of the work is retrieval, how much is integration, and whether a person stays in the loop — but that is not a useful answer on its own. The first conversation is a free scoping call that ends with either a range and a proposed first step, or a straight answer that Halyx is not the right fit.",
      },
      {
        q: "How long before we see something working?",
        a: "A discovery sprint produces a decision, not a slide deck. An MVP typically lands in four to eight weeks. Larger platforms run in six-week phases, each ending in a demo you can use.",
      },
      {
        q: "Who owns the code?",
        a: "You do. Every build ships with documentation, CI and observability, and the explicit goal is that your team can run it without us.",
      },
      {
        q: "Can you work alongside our existing engineering team?",
        a: "Yes, and it is often the better shape. We have handed systems over to client engineers who owned them from that point on. Where in-house is genuinely the right call, we will say so.",
      },
      {
        q: "What uptime or SLA do you guarantee?",
        a: "Halyx publishes no standard uptime figure, because a number promised on a website before anyone has seen the system is worth nothing. Availability targets and support hours are scoped per engagement and written into the contract.",
      },
    ],
    proof: ["Maiku AI", "Axiom", "Cartesia Assistant", "ArchitectXpert"],
  },
  {
    slug: "custom-software",
    title: "Custom Software",
    seoTitle: "Custom Software Development Services",
    seoDescription:
      "Internal platforms and customer-facing systems built around how your team actually works. Typed codebases, tested pipelines, and a handover that holds.",
    h1: "Custom software built to be handed over",
    lede: "Off-the-shelf stops fitting at the point your process becomes the thing you compete on. We build the systems that sit at that point: internal platforms, customer-facing products, and the integration layer that makes the rest of your stack behave as one thing.",
    sections: [
      {
        heading: "What we build",
        body: "Four kinds of engagement, from a blank page to a system that has outlived its architecture.",
        points: [
          {
            heading: "Product discovery",
            body: "Before a screen is drawn. What you are trying to move, what already exists, and what the real constraint is — so the brief matches the problem rather than the first description of it.",
          },
          {
            heading: "Platform architecture",
            body: "The structural decisions that are expensive to reverse: data model, service boundaries, and where the consistency guarantees live.",
          },
          {
            heading: "API and integrations",
            body: "The layer where most internal software actually fails. Typed contracts, retries that are safe to retry, and failure states that surface rather than hide.",
          },
          {
            heading: "Legacy modernisation",
            body: "Incremental replacement rather than a rewrite you cannot ship. The old system keeps running while the new one takes traffic a route at a time.",
          },
        ],
      },
      {
        heading: "What ships with it",
        body: "Typed codebases, tested pipelines, CI, observability and documentation. The goal is not that the software works on the day it launches — it is that your team can change it safely a year later, without us.",
      },
    ],
    faqs: [
      {
        q: "Do you do fixed-price or time and materials?",
        a: "A paid discovery sprint first, then a fixed-scope build. Fixed scope is only honest after discovery; before it, any fixed price is a guess with a margin on top.",
      },
      {
        q: "Can you take over a codebase somebody else wrote?",
        a: "Yes. That starts with a read-only assessment and an honest report — sometimes the answer is that incremental replacement beats continuing.",
      },
      {
        q: "What stack do you build in?",
        a: "TypeScript, Go and Python on the backend, Next.js and React Native on the front, Postgres and Snowflake for data, AWS for infrastructure. We are not religious about it and will pick what your team can maintain.",
      },
    ],
    proof: ["H&B Event Solution", "ArchitectXpert"],
  },
  {
    slug: "web-mobile-apps",
    title: "Web & Mobile Apps",
    seoTitle: "Web & Mobile App Development Services",
    seoDescription:
      "Fast, accessible interfaces across web and native — from first prototype to a release cadence you can keep. Design systems that survive contact with engineering.",
    h1: "Web and mobile products, from prototype to release cadence",
    lede: "An interface is where every architectural decision becomes something a person either understands or abandons. We build the front end and the design system behind it, so the second release is as fast as the first.",
    sections: [
      {
        heading: "What we build",
        body: "Design and engineering as one track, because handing a static file to a developer is where most of the intent gets lost.",
        points: [
          {
            heading: "UX and UI design",
            body: "Discovery, flows and prototypes. Interfaces that make complex systems feel obvious rather than merely look considered.",
          },
          {
            heading: "Web applications",
            body: "Server-rendered where it matters for speed and search, client-side where it matters for interaction. Accessibility treated as a requirement, not a pass at the end.",
          },
          {
            heading: "iOS and Android",
            body: "React Native where sharing a codebase is the right trade, native where it is not. We will tell you which.",
          },
          {
            heading: "Design systems",
            body: "Tokens, components and documentation that survive contact with engineering — the thing that makes release four as cheap as release one.",
          },
        ],
      },
      {
        heading: "Accessibility and performance are not a later phase",
        body: "Contrast, focus order, keyboard paths and reduced-motion handling are built in as the interface is built. So is performance budgeting: a design that only works on a fast laptop is not finished.",
      },
    ],
    faqs: [
      {
        q: "Can you work from our existing designs?",
        a: "Yes. We will also say plainly if a design will not survive implementation — earlier is cheaper than later.",
      },
      {
        q: "Do you build design systems as a standalone piece of work?",
        a: "Yes, and it is worth doing before a second product rather than during it.",
      },
      {
        q: "Will it work on a mid-range Android?",
        a: "That is the device we test against, because the laptop the design was made on is not a useful benchmark.",
      },
    ],
    proof: ["H&B Event Solution", "Axiom"],
  },
  {
    slug: "business-automation",
    title: "Business Automation",
    seoTitle: "Business Process Automation Consultants",
    seoDescription:
      "Workflow automation that removes manual handoffs and gives every process an audit trail. Process mapping, document intelligence, and voice and chat agents.",
    h1: "Automation that removes the handoff, not just the typing",
    lede: "Most automation projects fail because they automate a process nobody mapped first. We start with the map, which routinely shows that the expensive step is a handoff between two teams rather than the work either of them does.",
    sections: [
      {
        heading: "What we build",
        body: "Four layers, usually in this order.",
        points: [
          {
            heading: "Process mapping",
            body: "What actually happens, as opposed to what the documentation says happens. This step regularly changes the scope of everything after it.",
          },
          {
            heading: "Document intelligence",
            body: "Extraction and classification over the forms, invoices and contracts that currently move by hand, with uncertain cases routed to a person rather than guessed at.",
          },
          {
            heading: "Voice and chat agents",
            body: "Front doors that can answer, qualify and escalate. Built to hand over to a person cleanly, because the escalation path is what determines whether anyone trusts it.",
          },
          {
            heading: "Systems integration",
            body: "Durable workflows across the tools you already run, with an audit trail for every step and retries that are safe to retry.",
          },
        ],
      },
      {
        heading: "A person stays where judgement matters",
        body: "Every system we ship keeps a human in the loop at the points where being wrong is expensive. Automation that removes the reviewer is usually automation that moves the cost somewhere less visible.",
      },
    ],
    faqs: [
      {
        q: "Where does automation usually pay back fastest?",
        a: "At handoffs between teams and at any step where a person retypes data that already exists in another system. Process mapping finds these; guessing does not.",
      },
      {
        q: "Will this replace roles?",
        a: "Our position is that AI should amplify people rather than replace them, and we build to keep a person in the loop where judgement matters. If the goal of an engagement is purely headcount reduction, we are probably not the right studio.",
      },
      {
        q: "Can you integrate with our existing tools?",
        a: "Usually. Durable workflow engines and the vendors' own APIs cover most of it; the honest answer for anything exotic comes after a short assessment.",
      },
    ],
    proof: ["Cartesia Assistant", "Maiku AI"],
  },
  {
    slug: "data-cloud",
    title: "Data & Cloud",
    seoTitle: "Data Engineering & Cloud Migration Services",
    seoDescription:
      "The pipelines, warehouses and infrastructure that make everything else trustworthy in production. Data engineering, analytics, cloud migration and compliance.",
    h1: "The layer that makes everything above it trustworthy",
    lede: "Every AI system, dashboard and automation inherits the quality of the data underneath it. This is the practice that makes the rest defensible: pipelines that fail loudly, warehouses that agree with themselves, and infrastructure somebody other than us can operate.",
    sections: [
      {
        heading: "What we build",
        body: "Four areas, frequently sequenced as a single programme.",
        points: [
          {
            heading: "Data engineering",
            body: "Ingestion and transformation with tests on the transformations, so a silently wrong number is caught before it reaches a decision.",
          },
          {
            heading: "Analytics and BI",
            body: "Models and dashboards that answer the questions the business actually asks, with one agreed definition per metric.",
          },
          {
            heading: "Cloud migration",
            body: "Incremental, reversible, with cost modelled before the move rather than discovered after it.",
          },
          {
            heading: "Security and compliance",
            body: "Access control, encryption, retention and audit designed in at the schema level rather than retrofitted under deadline.",
          },
        ],
      },
      {
        heading: "Observability is part of the deliverable",
        body: "A pipeline without monitoring is a pipeline that will be wrong for weeks before anyone notices. Alerting and lineage ship with the work, not after it.",
      },
    ],
    faqs: [
      {
        q: "Do we need a warehouse before we can do anything with AI?",
        a: "Not always, and it is worth asking before committing to one. Some AI work runs perfectly well against operational systems; some is impossible without a warehouse. The assessment is short.",
      },
      {
        q: "How do you handle data residency?",
        a: "It is a design constraint from the first architecture conversation, not a compliance review at the end. Tell us the jurisdictions early.",
      },
      {
        q: "Can you reduce our cloud bill?",
        a: "Often, though the honest version is that the saving usually comes from changing what runs rather than from tuning what already does.",
      },
    ],
    proof: ["Axiom"],
  },
];

/* ────────────────────────────  Integrity  ──────────────────────────── */

/*
 * These two guards run at module load, which means a mismatch fails the build
 * rather than shipping a service page that contradicts the homepage card
 * linking to it, or a proof block that renders nothing.
 */

const SERVICE_TITLES = new Set(SERVICES.map((s) => s.title));
for (const page of SERVICE_PAGES) {
  if (!SERVICE_TITLES.has(page.title)) {
    throw new Error(
      `Service page "${page.slug}" has title "${page.title}", which is not in SERVICES.`,
    );
  }
}

const PROJECT_NAMES = new Set(PROJECTS.map((p) => p.name));
for (const page of SERVICE_PAGES) {
  for (const name of page.proof) {
    if (!PROJECT_NAMES.has(name)) {
      throw new Error(`Service page "${page.slug}" cites unknown project "${name}".`);
    }
  }
}

export const SERVICE_PAGES_BY_SLUG = new Map(SERVICE_PAGES.map((p) => [p.slug, p]));

/** The `SERVICES` record a page renders its practice card from. */
export function serviceFor(page: ServicePage): Service {
  const match = SERVICES.find((s) => s.title === page.title);
  if (!match) throw new Error(`No SERVICES entry for "${page.title}".`);
  return match;
}

/** Slug for a `SERVICES` title, for linking the homepage cards out. */
export function slugForService(title: string): string | undefined {
  return SERVICE_PAGES.find((p) => p.title === title)?.slug;
}
