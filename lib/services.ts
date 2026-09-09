export interface Service {
  num: string;
  title: string;
  blurb: string;
  services: string[];
  stack: string[];
  /** Particle-cloud glyph this row assembles into. */
  shape: ShapeKind;
}

export type ShapeKind = "code" | "chip" | "network" | "cloud" | "database";

export const SHAPES: ShapeKind[] = ["code", "chip", "network", "cloud", "database"];

export const SERVICES: Service[] = [
  {
    num: "01",
    title: "AI & Machine Learning",
    blurb:
      "Models, agents, and prediction systems built into your product and your operations, not bolted on beside them.",
    services: ["LLM & Agent Systems", "Predictive Modelling", "Computer Vision", "MLOps & Evaluation"],
    stack: ["PyTorch", "LangGraph", "Vertex AI"],
    shape: "code",
  },
  {
    num: "02",
    title: "Custom Software",
    blurb:
      "Internal platforms and customer-facing systems designed around how your team actually works.",
    services: ["Product Discovery", "Platform Architecture", "API & Integrations", "Legacy Modernisation"],
    stack: ["TypeScript", "Go", "Postgres"],
    shape: "chip",
  },
  {
    num: "03",
    title: "Web & Mobile Apps",
    blurb:
      "Fast, accessible interfaces across web and native, from first prototype to a release cadence you can keep.",
    services: ["UX & UI Design", "Web Applications", "iOS & Android", "Design Systems"],
    stack: ["Next.js", "React Native", "Figma"],
    shape: "network",
  },
  {
    num: "04",
    title: "Business Automation",
    blurb: "Workflow automation that removes manual handoffs and gives every process an audit trail.",
    services: ["Process Mapping", "Document Intelligence", "Voice & Chat Agents", "Systems Integration"],
    stack: ["Temporal", "n8n", "Twilio"],
    shape: "cloud",
  },
  {
    num: "05",
    title: "Data & Cloud",
    blurb:
      "The pipelines, warehouses, and infrastructure that make everything above trustworthy in production.",
    services: ["Data Engineering", "Analytics & BI", "Cloud Migration", "Security & Compliance"],
    stack: ["Snowflake", "dbt", "AWS"],
    shape: "database",
  },
];
