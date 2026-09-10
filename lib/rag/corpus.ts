import { BELIEFS, HIGHLIGHTS, TEAM } from "@/lib/content";
import { HUBS } from "@/lib/hubs";
import { PROJECTS } from "@/lib/projects";
import { PROOF_POINTS } from "@/lib/reviews";
import { SERVICES } from "@/lib/services";
import { SITE } from "@/lib/site";
import type { Chunk } from "./types";

/**
 * The assistant's knowledge base.
 *
 * Two sources, deliberately separated:
 *
 *  1. **Derived** — built from the same typed content the page renders
 *     (`PROJECTS`, `SERVICES`, `TEAM`, …). Edit the site, and the assistant
 *     learns the change on the next build. There is no second copy to drift.
 *  2. **Editorial** — `EDITORIAL` below. Sales answers that have no home in a
 *     rendered component: pricing model, engagement shapes, process, security,
 *     handover, objections. Every claim here is carried over from copy that
 *     already ships on the site (`lib/kb.ts`, the highlights strip, the
 *     services rows) rather than invented for the bot.
 *
 * Nothing outside these two sources reaches the model. If the assistant said
 * it, it is in this file — which is the property that makes a wrong answer
 * fixable in one place.
 */

/** Formats a list without a trailing comma splice. */
const list = (items: readonly string[]) =>
  items.length <= 1
    ? (items[0] ?? "")
    : `${items.slice(0, -1).join(", ")} and ${items[items.length - 1]}`;

/* ────────────────────────────  Derived  ──────────────────────────── */

const identity: Chunk[] = [
  {
    id: "co:identity",
    section: "company",
    title: "What Halyx Technologies is",
    href: "#company",
    weight: 1.4,
    text: `${SITE.name} is an applied-AI and product-engineering studio. ${SITE.description} The positioning line the studio leads with is "${SITE.tagline}". Halyx does not sell research projects or slide decks: every engagement is aimed at a system running in production with a named metric attached to it. Five practices run end to end, from discovery through production support: ${list(SERVICES.map((s) => s.title))}. Contact is ${SITE.email}, or the "Let's talk" brief form on the homepage.`,
    keywords: [
      "halyx", "who are you", "what do you do", "about", "company", "studio",
      "agency", "consultancy", "firm", "overview", "elevator pitch",
    ],
  },
  {
    id: "co:timeline",
    section: "company",
    title: "Company timeline and delivery regions",
    href: "#company",
    text: `Halyx's own account of how it grew, hub by hub: ${HUBS.map((h) => `${h.label} — ${h.name.replace(/\b\w/g, (c) => c.toUpperCase())}: ${h.t}`).join(" ")} Delivery is follow-the-sun across those regions, which is what the 24/7 support claim rests on.`,
    keywords: [
      "history", "founded", "when did you start", "offices", "locations",
      "regions", "global", "timezone", "headquarters", "where are you based",
      "growth", "how old",
    ],
  },
  {
    id: "co:proof",
    section: "company",
    title: "Headline numbers",
    href: "#company",
    weight: 1.2,
    text: `The three positioning statements Halyx puts on the homepage, with what each one means: ${HIGHLIGHTS.map((h) => `${h.metric} ${h.metricLabel.toLowerCase()} — ${h.title}: ${h.blurb} ${h.more}`).join(" ")} Treat those figures as the studio's own marketing headline, not as audited numbers, and never extend them with a statistic of your own. The hard, checkable proof is different and better: ${PROJECTS.length} products that are live right now, each one linkable. Lead with those.`,
    keywords: [
      "metrics", "numbers", "stats", "track record", "uptime", "roi",
      "how many projects", "results", "impact", "proof", "credentials",
    ],
  },
  {
    id: "co:principles",
    section: "company",
    title: "How Halyx works — operating principles",
    href: "#company",
    text: `Four principles the studio commits to publicly: ${BELIEFS.map((b) => `${b.num}. ${b.lead}${b.trail ? ` ${b.trail}` : ""} ${b.more}`).join(" ")}`,
    keywords: [
      "values", "principles", "philosophy", "beliefs", "culture", "approach",
      "how do you work", "ethics", "human in the loop", "quality",
    ],
  },
];

const services: Chunk[] = SERVICES.map((s) => ({
  id: `svc:${s.title.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "")}`,
  section: "service" as const,
  title: `Service ${s.num} — ${s.title}`,
  href: "#services",
  weight: 1.15,
  text: `${s.title}. ${s.blurb} What this practice delivers: ${list(s.services)}. Primary stack: ${list(s.stack)}. Like every Halyx practice it runs end to end — discovery, build, deployment, then production support and handover.`,
  keywords: [...s.services, ...s.stack, s.title],
}));

const caseStudies: Chunk[] = PROJECTS.map((p) => ({
  id: `case:${p.name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "")}`,
  section: "case-study" as const,
  title: `Case study — ${p.name} (${p.cat})`,
  href: "#work",
  url: p.url,
  weight: 1.3,
  text: `${p.name} — ${p.cat}. Live at ${p.url}. The problem: ${p.problem} What Halyx built: ${p.solution} Notable specifics: ${p.facts.map(([label, value]) => `${label} — ${value}`).join("; ")}. Tagged: ${list(p.tags)}. One-line positioning on the site: "${p.note}".`,
  keywords: [p.name, p.cat, p.host, ...p.tags],
}));

const team: Chunk[] = [
  {
    id: "team:leadership",
    section: "team",
    title: "Who runs Halyx",
    href: "#company",
    weight: 1.2,
    text: `Halyx's named leadership: ${TEAM.map((m) => `${m.name}, ${m.title} (${m.tag}) — ${m.bio}${m.linkedin ? ` LinkedIn: ${m.linkedin}` : ""}`).join(" ")} These three are the people a client deals with directly; the CEO stays on every engagement from first brief through to what ships, and the Manager owns the reporting cadence against the metric agreed up front.`,
    keywords: [
      "team", "leadership", "founders", "ceo", "cto", "manager", "who runs",
      "management", "staff", "people", "muhaddas", "aleem", "numan", "linkedin",
    ],
  },
];

/**
 * The proof rail, which no longer carries testimonials.
 *
 * It used to derive from six client quotes attributed to named individuals that
 * `lib/reviews.ts` itself flagged as unapproved. The assistant was reading their
 * invented outcome numbers back to prospects as Halyx results. They are gone —
 * see that file for the full reasoning — and what is left is the shipped work,
 * which is verifiable.
 *
 * When a visitor asks for references or testimonials, this is what they should
 * get, together with an honest line that named references come from the team.
 */
const proof: Chunk[] = PROOF_POINTS.map((p) => ({
  id: `proof:${p.name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "")}`,
  section: "testimonial" as const,
  title: `Proof of work — ${p.name}`,
  href: "#company",
  text: `${p.name} (${p.role}) is live and a prospect can open it right now. What it does: ${p.q}`,
  keywords: ["proof", "shipped", "live", "portfolio", "reference", p.name],
}));

/**
 * The honest answer to "can I speak to a reference?".
 *
 * Without this chunk the assistant has only product links to offer and will
 * improvise around the gap; with it, the gap has a defined, forward-moving
 * answer.
 */
const references: Chunk[] = [
  {
    id: "faq:references",
    section: "testimonial",
    title: "Client references and testimonials",
    href: "#work",
    weight: 1.2,
    text: `Halyx does not publish client quotes on the site. What it publishes instead is work a prospect can open and judge without taking anyone's word for it: ${PROOF_POINTS.length} products live, each linked from the work section. Named references and introductions to past clients are arranged by the team on request, once there is a real conversation and the client has agreed to it — ask for them in the brief or through this assistant and the team will set it up. Never invent a client name, a quote or an outcome number.`,
    keywords: [
      "reference", "references", "testimonial", "testimonials", "review",
      "reviews", "client quote", "case reference", "can i speak to",
      "talk to a client", "past clients", "who have you worked with", "proof",
    ],
  },
];

/* ────────────────────────────  Editorial  ──────────────────────────── */

/**
 * Sales knowledge with no rendered home on the page.
 *
 * Sourced from `lib/kb.ts` (the canned answers this assistant replaces), the
 * highlights strip and the services rows. Keep it that way: a claim that
 * appears only here is a claim nobody on the site has signed off.
 */
const EDITORIAL: Chunk[] = [
  {
    id: "price:model",
    section: "pricing",
    title: "How Halyx prices work",
    href: "#contact",
    weight: 1.35,
    text: `Pricing depends on scope, and Halyx quotes rather than publishing a rate card. The standard shape is a paid discovery sprint first, then a fixed-scope build phase priced against what discovery found. Discovery is deliberately paid: it produces the architecture, the scope and the estimate, and a client can walk away with all three. Larger platform builds run as six-week phases, each priced separately, with a demo at the end of each phase — so the commitment is one phase at a time, not the whole programme. Send a brief through the "Let's talk" form and Halyx comes back with a range within two working days. There is no charge for the initial conversation or the range.`,
    keywords: [
      "price", "pricing", "cost", "how much", "budget", "rate", "rates", "quote",
      "estimate", "fee", "day rate", "retainer", "fixed price", "expensive",
      "cheap", "affordable", "payment terms", "invoice",
    ],
  },
  {
    id: "price:engagements",
    section: "pricing",
    title: "Engagement models",
    href: "#contact",
    text: `Three shapes Halyx works in. Discovery sprint: a short paid engagement that ends with an architecture, a scope and a costed plan. Fixed-scope build: an agreed deliverable at an agreed price, which is how most MVPs run. Phased platform build: six-week phases, demo at the end of each, re-planned between phases — the model for anything long-running or where the requirements will move. Support and evolution continues after launch for teams that want Halyx to keep running the system rather than take it in house.`,
    keywords: [
      "engagement", "contract", "retainer", "fixed scope", "time and materials",
      "sow", "statement of work", "phases", "sprint", "how do we work together",
      "dedicated team", "staff augmentation",
    ],
  },
  {
    id: "proc:timeline",
    section: "process",
    title: "Timelines — how fast Halyx ships",
    href: "#services",
    weight: 1.25,
    text: `A working MVP typically takes four to eight weeks from kickoff. Larger platform builds run in six-week phases with a working demo at the end of every phase, so a client sees something real inside six weeks regardless of how long the whole programme runs. Discovery sprints are shorter still. Halyx does not quote a date it has not scoped: the estimate comes out of discovery, and status is reported against it every two weeks. The studio's stated position is short cycles, tested code and honest status — no silent slippage.`,
    keywords: [
      "timeline", "how long", "how fast", "duration", "deadline", "schedule",
      "when can you start", "delivery time", "lead time", "mvp", "weeks",
      "turnaround", "quick", "urgent", "rush",
    ],
  },
  {
    id: "proc:method",
    section: "process",
    title: "The delivery process, step by step",
    href: "#services",
    weight: 1.2,
    text: `How an engagement runs. First, the metric: Halyx agrees the number the work is meant to move before any code is written, and reports against it in every review. Then discovery — the real problem, the constraints, the architecture — before a screen is drawn. Then build in short cycles with a working demo at the end of each. Every system ships with documentation, CI, observability and a handover, so the client's own team can run it without Halyx. Where judgement matters, a human stays in the loop by design; the studio's stated position is that AI should amplify people rather than replace them. If a requested feature will not pay for itself, Halyx says so with the numbers — clients have cut scope on that advice.`,
    keywords: [
      "process", "methodology", "how do you work", "agile", "scrum", "discovery",
      "kickoff", "onboarding", "what happens first", "steps", "workflow",
      "project management", "reporting", "updates", "communication",
    ],
  },
  {
    id: "proc:support",
    section: "process",
    title: "Support, SLAs and handover",
    href: "#services",
    weight: 1.1,
    text: `Support coverage is 24/7, which the follow-the-sun delivery across four regions is what makes possible. The site claims 99.9% platform uptime. Every build ships with documentation, CI, observability and a structured handover, and the explicit goal is that the client's team can run the system without Halyx — one client's engineers owned a delivered service two weeks after handover. Teams that would rather not run it themselves can keep Halyx on for support and evolution. Halyx has taken a model from a notebook to a service running in two regions behind a 99.9% SLA.`,
    keywords: [
      "support", "sla", "maintenance", "after launch", "handover", "handoff",
      "warranty", "bugs", "uptime", "monitoring", "on call", "who maintains",
      "documentation", "training", "knowledge transfer",
    ],
  },
  {
    id: "proc:security",
    section: "process",
    title: "Security, compliance and IP ownership",
    href: "#services",
    text: `Security and compliance sit inside the Data & Cloud practice rather than being bolted on at the end, and audit trails are part of what gets built — a clinical client's compliance team signed off on the audit trail of a triage copilot Halyx delivered. Clients own what Halyx builds for them; the handover exists precisely so the code, the documentation and the operational knowledge transfer. For anything specific — an NDA, a data-processing agreement, a certification requirement, a residency constraint — the honest answer is that it depends on the engagement, and Halyx will confirm in writing rather than the assistant guessing. Raise it in the brief and it gets answered before any contract is signed.`,
    keywords: [
      "security", "compliance", "gdpr", "hipaa", "soc2", "iso", "nda",
      "confidentiality", "data protection", "privacy", "ip", "ownership",
      "who owns the code", "intellectual property", "audit", "certification",
      "data residency", "penetration test",
    ],
  },
  {
    id: "tech:stack",
    section: "faq",
    title: "Technology stack",
    href: "#services",
    weight: 1.1,
    text: `What Halyx builds on. Backend: TypeScript, Go and Python. Frontend and mobile: Next.js and React Native, with Figma for design. Data: Postgres and Snowflake, with dbt in the pipeline layer. Infrastructure: AWS. AI and ML: PyTorch, LangGraph and Vertex AI. Automation: Temporal, n8n and Twilio. Shipped client work has also used Groq Whisper and LLaMA for real-time transcription and answer drafting, Cartesia for streaming speech synthesis, and Vercel for deployment. Halyx is not religious about the stack — it picks what the client's team can maintain — but these are the defaults it is fastest and safest in.`,
    keywords: [
      "stack", "tech stack", "technology", "languages", "frameworks", "tools",
      "typescript", "python", "golang", "react", "nextjs", "aws", "azure", "gcp",
      "postgres", "snowflake", "pytorch", "langgraph", "vertex", "temporal",
      "what do you build with", "do you use",
    ],
  },
  {
    id: "faq:industries",
    section: "faq",
    title: "Industries and client profile",
    href: "#work",
    text: `Halyx works with startups and growing companies as well as enterprise operations, across healthcare, retail, logistics, financial services and event production among others — the site claims 12 sectors. Shipped work spans clinical triage, demand forecasting, document automation, voice agents, real-time interview assistance, generative architectural design and lead capture for a thirty-year event production business. The common thread is not the sector: it is a process that is manual, slow or unauditable, and a number attached to fixing it.`,
    keywords: [
      "industries", "sectors", "verticals", "clients", "who do you work with",
      "healthcare", "medical", "retail", "logistics", "finance", "fintech",
      "enterprise", "startup", "small business", "b2b", "experience in",
    ],
  },
  {
    id: "faq:differentiators",
    section: "faq",
    title: "Why Halyx over another studio",
    href: "#company",
    weight: 1.25,
    text: `What Halyx argues sets it apart. It agrees the metric before writing code and reports against it — clients cite that as rare. It ships into production behind an SLA rather than delivering a prototype. It hands over: documentation, CI, observability, and engineers who own the system afterwards, with one client's team taking ownership two weeks post-handover and another still shipping on a delivered design system two years on. It argues with the brief — Halyx has told a client two weeks in that a requested feature would not pay for itself, shown the numbers, and had the scope cut. And it does not oversell: a client running a clinical system specifically noted Halyx did not overstate what the system could not do. Public, verifiable proof: five live products a prospect can open right now, listed under the work section.`,
    keywords: [
      "why you", "why halyx", "differentiator", "competition", "competitors",
      "versus", "compare", "better", "what makes you different", "unique",
      "advantage", "why should we", "convince me", "objection",
    ],
  },
  {
    id: "faq:ai-capability",
    section: "faq",
    title: "AI and agent capability in practice",
    href: "#services",
    weight: 1.15,
    text: `Halyx's AI practice covers LLM and agent systems, predictive modelling, computer vision, and MLOps with evaluation built in — evaluation being the part most vendors skip. Shipped evidence rather than claims: a real-time interview copilot doing live transcription and answer drafting under latency pressure (Maiku AI); a research agent that keeps every claim linked to its source and runs to roughly 50 sources per report (Axiom); a low-latency voice assistant with streaming turn-taking so replies start speaking before generation finishes (Cartesia Assistant); a generative design system producing dimensioned architectural plans with CAD export (ArchitectXpert). Chatbots, RAG systems, voice agents, document intelligence and internal copilots all sit inside this practice.`,
    keywords: [
      "ai", "artificial intelligence", "llm", "gpt", "claude", "openai", "agent",
      "agents", "rag", "chatbot", "copilot", "machine learning", "ml", "model",
      "fine tuning", "embeddings", "vector", "computer vision", "nlp", "mlops",
      "evaluation", "hallucination", "can you build",
    ],
  },
  {
    id: "contact:how",
    section: "contact",
    title: "How to start a conversation with Halyx",
    href: "#contact",
    weight: 1.4,
    text: `Two routes in. The "Let's talk" form on this page is the fast one: name, email, what you are trying to build, and Halyx replies within two working days — the brief goes straight to the studio inbox. Or email ${SITE.email} directly. The first conversation is free and is a scoping call, not a pitch: what you are trying to move, what already exists, what the constraint is. It ends with either a range and a proposed first step, or a straight answer that Halyx is not the right fit. The assistant on this page can also take your details directly and pass them to the team — faster than filling the form.`,
    keywords: [
      "contact", "get in touch", "reach", "email", "phone", "call", "book",
      "meeting", "schedule", "talk to someone", "sales", "enquiry", "quote",
      "next step", "how do i start", "hire you", "work with you", "demo",
    ],
  },
];

/* ────────────────────────────  Assembly  ──────────────────────────── */

/** Every chunk the assistant can retrieve, built once at module load. */
export const CORPUS: Chunk[] = [
  ...identity,
  ...services,
  ...caseStudies,
  ...team,
  ...proof,
  ...references,
  ...EDITORIAL,
];

/** Chunk ids must be unique — they are citation handles and index keys. */
const duplicates = CORPUS.map((c) => c.id).filter((id, i, all) => all.indexOf(id) !== i);
if (duplicates.length > 0) {
  throw new Error(`Duplicate corpus chunk id(s): ${[...new Set(duplicates)].join(", ")}`);
}

export const CHUNKS_BY_ID = new Map(CORPUS.map((c) => [c.id, c]));

/**
 * A compact always-on brief, held in the cached system prefix.
 *
 * Retrieval decides what the model reads *about a question*; this is what it
 * knows regardless — enough to stay on-brand, name the practices and route to
 * the contact form even when a query retrieves nothing. It is intentionally
 * short: it is paid for on every request.
 */
export const COMPANY_BRIEF = [
  `${SITE.name} — ${SITE.tagline}.`,
  SITE.description,
  `Practices: ${list(SERVICES.map((s) => s.title))}.`,
  `Live client work a prospect can open right now: ${PROJECTS.map((p) => `${p.name} (${p.cat}, ${p.url})`).join("; ")}.`,
  `Leadership: ${TEAM.map((m) => `${m.name} — ${m.title}`).join("; ")}.`,
  `Contact: ${SITE.email}, or the "Let's talk" brief form on this page. Reply within two working days.`,
  `Typical shape: paid discovery sprint, then fixed-scope build. MVP in four to eight weeks; larger platforms in six-week phases with a demo each phase.`,
].join("\n");
