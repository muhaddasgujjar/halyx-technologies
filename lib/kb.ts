export interface KbEntry {
  k: string[];
  a: string;
}

/**
 * Canned keyword matcher, not an LLM. If the site should use a model later,
 * these answers are a good system-prompt seed.
 */
export const KB: KbEntry[] = [
  {
    /*
     * No bare "what", "who" or "do" here.
     *
     * This entry is the catch-all, and with one-word keys that broad it caught
     * everything: "what is the weather in Karachi" scored on "what" and was
     * answered with a description of the studio. That was survivable while this
     * file was only the chat dock's offline net; it is not now that the voice
     * agent falls back to it whenever the model is out of budget, because a
     * spoken non-sequitur is the most machine-like thing the agent can do.
     */
    k: ["about", "company", "halyx", "who are you", "what do you do", "tell me about"],
    a: "Halyx Technologies builds AI-powered digital solutions for businesses that want to automate, scale, and work smarter. We cover AI and machine learning, custom software, web and mobile apps, business automation, and data and cloud.",
  },
  {
    k: ["service", "offer", "capabilit", "expertise"],
    a: "Five practices: AI & Machine Learning, Custom Software, Web & Mobile Apps, Business Automation, and Data & Cloud. Each one runs end to end, from discovery through production support.",
  },
  {
    k: ["ai", "ml", "machine", "model", "agent", "llm"],
    a: "Our AI practice covers LLM and agent systems, predictive modelling, computer vision, and MLOps with evaluation built in. We work in PyTorch, LangGraph and Vertex AI.",
  },
  {
    k: ["price", "cost", "budget", "rate", "quote"],
    a: "Pricing depends on scope. Most engagements start with a paid discovery sprint, then a fixed-scope build phase. Send a brief through the form and we will come back with a range in two working days.",
  },
  {
    k: ["team", "employee", "people", "size", "staff"],
    a: "Halyx is a small, senior studio. The people you deal with are named on the site: Muhammad Muhaddas (CEO), Muhammad Aleem Azam (CTO) and Muhammad Numan Ali (Manager). The CEO stays on every engagement from first brief to what ships.",
  },
  {
    k: ["found", "history", "story", "start", "began", "year"],
    a: "Halyx is an applied-AI and product-engineering studio. Rather than a founding legend, the useful answer is the work: five products live and linkable, built across real-time AI, generative design, research agents and voice.",
  },
  {
    k: ["client", "customer", "industr", "sector", "who work"],
    a: "We work with startups, growing companies and established operators. Shipped work spans real-time AI copilots, generative design with CAD export, research agents, low-latency voice assistants and lead-capture storefronts.",
  },
  {
    k: ["case", "project", "portfolio", "work", "example", "ship", "built", "build for"],
    a: "Five shipped products you can open right now: Maiku AI (real-time interview copilot, maiku.app), ArchitectXpert (AI floor plan generator with DXF export, architectxpert.tech), Axiom (research agent that keeps every claim linked to its source), Cartesia Assistant (low-latency voice assistant) and H&B Event Solution (event production storefront, hbevents.me).",
  },
  {
    k: ["contact", "email", "reach", "talk", "call", "hire", "start"],
    a: "Use the Let's talk form on this page, or email halyxtechnologies@gmail.com. We reply within two working days.",
  },
  {
    k: ["time", "long", "timeline", "fast", "duration", "deadline"],
    a: "A working MVP typically takes four to eight weeks. Larger platform builds run in six-week phases with a demo at the end of each.",
  },
  {
    k: ["tech", "stack", "tool", "language", "framework"],
    a: "TypeScript, Go and Python on the backend, Next.js and React Native on the front, Postgres and Snowflake for data, AWS for infrastructure, with dbt and Temporal in the pipeline layer.",
  },
  {
    k: ["support", "maintain", "after", "handover", "sla"],
    a: "Support hours and any availability target are agreed per engagement rather than promised up front. Every build ships with documentation, CI, observability and a handover so your team can run it without us.",
  },
  {
    k: ["hello", "hi", "hey", "greet"],
    a: "Hello. Ask me anything about Halyx: services, case studies, team, timelines or pricing.",
  },
];

/**
 * The best canned answer for a question, or null when nothing matched.
 *
 * Split out from {@link answerFor} because the two callers want opposite things
 * from a miss. A typed chat can afford to print "I can only answer questions
 * about Halyx"; the voice agent cannot say that out loud as a substitute for a
 * model that is merely unavailable, because it is not true — it would be
 * blaming the visitor's question for the studio's billing. It needs to know
 * there was no match so it can say something honest instead.
 *
 * Highest-scoring keyword match wins; score is the summed length of hit keywords.
 */
export function matchFor(question: string): string | null {
  const s = question.toLowerCase();
  let best: KbEntry | null = null;
  let bestScore = 0;
  for (const entry of KB) {
    let score = 0;
    for (const k of entry.k) if (s.includes(k)) score += k.length;
    if (score > bestScore) {
      bestScore = score;
      best = entry;
    }
  }
  return best && bestScore >= 3 ? best.a : null;
}

export function answerFor(question: string): string {
  return (
    matchFor(question) ??
    "I can only answer questions about Halyx Technologies \u2014 our services, work, team, process or how to get in touch. Try asking what we do, or how a project usually starts."
  );
}
