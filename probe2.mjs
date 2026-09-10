import Groq from "groq-sdk";
import { readFileSync } from "node:fs";
const env = readFileSync(".env", "utf8");
const key = env.match(/^GROQ_API_KEY=(.*)$/m)[1].trim().replace(/^"|"$/g, "");
const client = new Groq({ apiKey: key });

const tools = [
  { type: "function", function: { name: "search_halyx",
    description: "Search Halyx's knowledge base — services, case studies, pricing model, process, team, client quotes. Use this whenever the visitor asks about something the passages already in front of you do not cover, or when the conversation moves to a new topic. Prefer searching over saying you do not know.",
    parameters: { type: "object", additionalProperties: false, properties: {
      query: { type: "string", description: "What to look up, in the visitor's own words plus any terms that would help." },
      section: { type: ["string", "null"], enum: ["company","service","case-study","testimonial","team","process","pricing","faq","contact",null], description: "Narrow to one section. Pass null to search everything." },
    }, required: ["query", "section"] } } },
  { type: "function", function: { name: "capture_lead",
    description: "Send a visitor's details straight to the Halyx studio inbox.",
    parameters: { type: "object", additionalProperties: false, properties: {
      name: { type: "string" }, email: { type: "string" }, company: { type: ["string","null"] },
      need: { type: "string" }, budget: { type: ["string","null"] }, timeline: { type: ["string","null"] },
    }, required: ["name","email","company","need","budget","timeline"] } } },
];

const system = `You are Halyx AI, a voice agent.
The knowledge base is English only and retrieval does not translate. If the visitor's question is in Urdu or Roman Urdu, call search_halyx once with an English translation before you reply, then answer in the visitor's language.`;

let bad = 0;
for (let run = 1; run <= 12; run++) {
  const stream = await client.chat.completions.create({
    model: "openai/gpt-oss-120b", stream: true, reasoning_effort: "low", tools,
    messages: [
      { role: "system", content: system },
      { role: "user", content: "RETRIEVED MATERIAL: none — nothing matched.\n\nVISITOR: ہیلیکس کی قیمت کیا ہے اور کتنا وقت لگتا ہے؟" },
    ],
  });
  const partial = new Map();
  const frames = [];
  for await (const chunk of stream) {
    for (const c of chunk.choices[0]?.delta?.tool_calls ?? []) {
      frames.push({ i: c.index, id: c.id ?? null, n: c.function?.name ?? null, a: c.function?.arguments ?? null });
      const slot = partial.get(c.index) ?? { id: "", name: "", args: "" };
      if (c.id) slot.id = c.id;
      if (c.function?.name) slot.name = c.function.name;
      if (c.function?.arguments) slot.args += c.function.arguments;
      partial.set(c.index, slot);
    }
  }
  const names = [...partial.values()].map(s => s.name);
  const ok = names.every(n => n === "search_halyx" || n === "capture_lead");
  if (!ok) { bad++; console.log(`run ${run}: BAD names=${JSON.stringify(names)}`); console.log("  frames:", JSON.stringify(frames)); }
  else console.log(`run ${run}: ok  names=${JSON.stringify(names)} frames=${frames.length}`);
}
console.log(`\n${bad}/12 runs produced a malformed tool name`);
