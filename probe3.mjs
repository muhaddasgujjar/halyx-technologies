import Groq from "groq-sdk";
import { readFileSync } from "node:fs";
const env = readFileSync(".env", "utf8");
const key = env.match(/^GROQ_API_KEY=(.*)$/m)[1].trim().replace(/^"|"$/g, "");
const client = new Groq({ apiKey: key });
const tools = [
  { type: "function", function: { name: "search_halyx", description: "Search Halyx's knowledge base.",
    parameters: { type: "object", additionalProperties: false, properties: {
      query: { type: "string" }, section: { type: ["string","null"], enum: ["company","service","pricing","process",null] },
    }, required: ["query","section"] } } },
  { type: "function", function: { name: "capture_lead", description: "Send a visitor's details to the studio inbox.",
    parameters: { type: "object", additionalProperties: false, properties: {
      name: { type: "string" }, email: { type: "string" }, company: { type: ["string","null"] },
      need: { type: "string" }, budget: { type: ["string","null"] }, timeline: { type: ["string","null"] },
    }, required: ["name","email","company","need","budget","timeline"] } } },
];
const system = `You are Halyx AI, a voice agent. Match the visitor's language exactly: Urdu script in, Urdu script out. The knowledge base is English only, so search in English and answer in their language.`;

let fails = 0;
for (let run = 1; run <= 10; run++) {
  const messages = [
    { role: "system", content: system },
    { role: "user", content: "RETRIEVED MATERIAL: none.\n\nVISITOR: ہیلیکس کی قیمت کیا ہے اور کتنا وقت لگتا ہے؟" },
    { role: "assistant", content: "", tool_calls: [{ id: "call_0", type: "function", function: { name: "search_halyx", arguments: '{"query":"Halyx pricing and timeline","section":null}' } }] },
    { role: "tool", tool_call_id: "call_0", content: "Halyx prices per project after a paid discovery sprint. MVPs ship in four to eight weeks." },
  ];
  try {
    const stream = await client.chat.completions.create({ model: "openai/gpt-oss-120b", stream: true, reasoning_effort: "low", tools, messages });
    let text = "", names = [];
    for await (const chunk of stream) {
      const d = chunk.choices[0]?.delta;
      if (d?.content) text += d.content;
      for (const c of d?.tool_calls ?? []) if (c.function?.name) names.push(c.function.name);
    }
    console.log(`run ${run}: ok text=${text.length}ch calls=${JSON.stringify(names)}`);
  } catch (e) {
    fails++;
    console.log(`run ${run}: FAILED ${e.status ?? ""} ${String(e.message).slice(0, 160)}`);
  }
}
console.log(`\n${fails}/10 second-round requests failed`);
