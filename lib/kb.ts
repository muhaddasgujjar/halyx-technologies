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
    k: ["what", "who", "about", "company", "halyx", "do"],
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
    a: "We are between 200 and 500 people across four regions, organised into product, engineering, AI and delivery groups.",
  },
  {
    k: ["found", "history", "story", "start", "began", "year"],
    a: "Founded in 2019 by two engineers with one product. First platform shipped in 2021, enterprise AI work followed in 2022, and we now run delivery across four regions with 60+ products in production.",
  },
  {
    k: ["client", "customer", "industr", "sector", "who work"],
    a: "We work with startups and growing companies across healthcare, retail, logistics, financial services and enterprise operations. Recent work includes clinical triage, demand forecasting, document automation and voice agents.",
  },
  {
    k: ["case", "project", "portfolio", "work", "example"],
    a: "Recent case studies include Clinix AI (clinical triage copilot, intake time down 46%), Synergise4 (demand forecasting, 31% less stock waste) and Bluepeak Vision (defect detection at 99.2% catch rate).",
  },
  {
    k: ["contact", "email", "reach", "talk", "call", "hire", "start"],
    a: "Use the Let's talk form on this page, or email hello@halyx.tech. We reply within two working days.",
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
    a: "24/7 support coverage. Every build ships with documentation, CI, observability and a handover so your team can run it without us.",
  },
  {
    k: ["hello", "hi", "hey", "greet"],
    a: "Hello. Ask me anything about Halyx: services, case studies, team, timelines or pricing.",
  },
];

/** Highest-scoring keyword match wins; score is the summed length of hit keywords. */
export function answerFor(question: string): string {
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
  if (best && bestScore >= 3) return best.a;
  return "I can only answer questions about Halyx Technologies \u2014 our services, work, team, process or how to get in touch. Try asking what we do, or how a project usually starts.";
}
