/**
 * Lexical normalisation for the retriever.
 *
 * No dependency, no model call, fully deterministic — which matters because the
 * index is built once per process and must be identical on every server
 * instance, and because a retrieval bug should be reproducible from the query
 * string alone.
 */

/**
 * Words that carry no signal in a corpus this small. "AI" is deliberately NOT
 * here: half the corpus is about AI, so it is a weak term, and BM25's IDF
 * already discounts it without us throwing the term away.
 */
const STOPWORDS = new Set([
  "a", "about", "above", "after", "again", "all", "am", "an", "and", "any", "are", "as", "at",
  "be", "because", "been", "before", "being", "below", "between", "both", "but", "by",
  "can", "cannot", "could", "did", "do", "does", "doing", "down", "during",
  "each", "few", "for", "from", "further", "get", "got", "had", "has", "have", "having",
  "he", "her", "here", "hers", "him", "his", "how", "i", "if", "in", "into", "is", "it", "its",
  "just", "let", "like", "me", "more", "most", "my", "no", "nor", "not", "of", "off", "on",
  // "own" is deliberately NOT here. In general English it is a filler word; in
  // this corpus it is the IP question — "who owns the code when you hand over"
  // — which is one of the most consequential things a prospect asks.
  "once", "only", "or", "other", "our", "ours", "out", "over",
  "please", "same", "she", "should", "so", "some", "such", "tell", "than", "that", "the",
  "their", "theirs", "them", "then", "there", "these", "they", "this", "those", "through",
  "to", "too", "under", "until", "up", "us", "very", "was", "were", "what", "when",
  "where", "which", "while", "who", "whom", "why", "will", "with", "would", "you", "your",
  "yours",

  /*
   * Roman Urdu function words.
   *
   * Half of any Roman Urdu question is grammar — "Halyx ka price kya hai" is two
   * content words and three particles. Left in, they are query terms that match
   * nothing in an English corpus and dilute the ones that do; `ka`, `ki` and `ke`
   * in particular appear in almost every sentence. None of them collide with a
   * word the corpus actually uses.
   */
  "aap", "abhi", "agar", "apna", "apni", "aur", "bhi", "hai", "hain", "hem", "ho", "hum",
  "hun", "jo", "ka", "kaise", "kar", "karein", "ke", "keh", "ki", "ko", "koi", "kuch",
  "kya", "lekin", "lete", "liye", "main", "mein", "mera", "meri", "nahi", "nahin", "par",
  "phir", "sab", "sakta", "sakte", "sakti", "se", "tha", "thi", "wala", "wo", "woh", "ya",
  "yeh",
]);

/**
 * Suffix stripping, Porter-lite.
 *
 * A full Porter stemmer is overkill for a marketing corpus and mangles product
 * names (Axiom becomes Axio). This handles the endings that actually cause
 * misses here — plurals, gerunds, past tense, adverbs — and leaves short tokens
 * alone so acronyms and product names survive intact.
 */
export const SUFFIXES: readonly (readonly [string, number])[] = [
  ["ilities", 7], ["ements", 7], ["ities", 5], ["ations", 7], ["ation", 6],
  ["ement", 6], ["ingly", 6], ["edly", 5], ["ing", 5], ["ies", 4], ["ied", 4],
  ["ers", 5], ["est", 5], ["er", 5], ["ly", 5], ["ed", 4], ["es", 4], ["s", 4],
];

export function stem(token: string): string {
  if (token.length <= 4) return token;
  for (const [suffix, min] of SUFFIXES) {
    if (token.length >= min && token.endsWith(suffix)) {
      const cut = token.slice(0, -suffix.length);
      // Never strip into a stub — anything under three characters is noise.
      if (cut.length >= 3) return cut;
    }
  }
  return token;
}

/**
 * Splits on anything that is not a letter, digit or in-word separator.
 *
 * Keeps `next.js`, `24/7` and `c#` whole on the first pass, then also emits the
 * split parts, so a query for "next js" still hits a document that wrote
 * "Next.js".
 */
export function tokenize(input: string): string[] {
  const lowered = input
    .toLowerCase()
    .replace(/[‘’“”]/g, "'")
    .replace(/&/g, " and ");

  const raw = lowered.match(/[a-z0-9][a-z0-9+#._/-]*/g) ?? [];
  const out: string[] = [];

  for (const token of raw) {
    const trimmed = token.replace(/^[._/-]+|[._/-]+$/g, "");
    if (!trimmed) continue;

    if (!STOPWORDS.has(trimmed)) out.push(stem(trimmed));

    // "next.js" also indexes as "next" + "js"; "24/7" as "24" + "7".
    if (/[._/-]/.test(trimmed)) {
      for (const part of trimmed.split(/[._/-]+/)) {
        if (part.length > 1 && !STOPWORDS.has(part)) out.push(stem(part));
      }
    }
  }
  return out;
}

/**
 * Vocabulary bridge between how visitors ask and how the site is written.
 *
 * Keys are stemmed query tokens; values are extra stemmed tokens OR-ed into the
 * query. This is the highest-leverage table in the retriever: most "the bot did
 * not find it" reports are a missing row here, not a scoring problem.
 * Expansions score below the literal term, so a bad row degrades ranking rather
 * than breaking it.
 */
const SYNONYMS: Record<string, string[]> = {
  // Commercials
  price: ["cost", "budget", "rate", "quote", "fee", "charg", "pricing", "expens"],
  cost: ["price", "budget", "rate", "quote", "fee"],
  budget: ["price", "cost", "rate", "afford"],
  cheap: ["price", "cost", "budget", "afford"],
  quote: ["price", "cost", "estimat", "proposal"],
  pay: ["price", "cost", "invoic", "payment"],
  hire: ["engag", "contact", "start", "work", "team"],

  // Time
  long: ["timelin", "duration", "week", "fast", "deliver"],
  timelin: ["week", "duration", "fast", "deliver", "schedul"],
  fast: ["quick", "speed", "timelin", "week"],
  deadlin: ["timelin", "week", "schedul", "fast"],

  // Company
  compani: ["studio", "halyx", "team", "about", "firm", "agenc"],
  agenc: ["studio", "compani", "halyx"],
  // "founder" and "founders" both stem to "found" — keying it any other way
  // meant this row never once fired.
  found: ["ceo", "founder", "team", "leadership"],
  staff: ["team", "peopl", "employe", "engin"],
  size: ["team", "peopl", "employe", "scale"],
  locat: ["region", "hub", "offic", "global"],
  offic: ["region", "hub", "locat"],
  remot: ["region", "hub", "global", "timezon"],

  // Proof
  portfolio: ["case", "project", "work", "exampl", "client", "studi"],
  exampl: ["case", "project", "work", "studi"],
  proof: ["case", "result", "metric", "client", "testimoni"],
  // "refer" stems to "ref"; "references" stems to "referenc". Both are real
  // things a visitor types, and neither reached the old "refer" key.
  ref: ["testimoni", "review", "client", "quot"],
  referenc: ["testimoni", "review", "client", "quot"],
  testimoni: ["review", "client", "quot", "feedback"],
  review: ["testimoni", "client", "quot", "feedback"],
  result: ["metric", "outcom", "impact", "roi"],
  roi: ["result", "impact", "metric", "valu"],

  // Capability
  chatbot: ["chat", "agent", "voic", "llm", "assist", "convers", "bot"],
  bot: ["chat", "agent", "assist", "automat"],
  llm: ["ai", "model", "agent", "gpt", "claud", "languag"],
  gpt: ["llm", "ai", "model", "agent"],
  claud: ["llm", "ai", "model", "anthrop"],
  rag: ["retriev", "llm", "agent", "knowledg", "search"],
  automat: ["workflow", "process", "rpa", "integrat", "n8n", "temporal"],
  rpa: ["automat", "workflow", "process"],
  ml: ["machin", "model", "predict", "ai"],
  vision: ["imag", "detect", "camera", "ocr", "comput"],
  ocr: ["document", "vision", "extract", "intellig"],
  voic: ["speech", "call", "audio", "cartesia", "agent"],
  speech: ["voic", "audio", "transcri", "whisper"],
  app: ["mobil", "ios", "android", "applic", "product"],
  mobil: ["app", "ios", "android", "nativ"],
  websit: ["web", "site", "frontend", "next", "app"],
  web: ["websit", "frontend", "next", "react"],
  design: ["ux", "ui", "interfac", "brand", "figma"],
  ux: ["design", "ui", "interfac", "research"],
  data: ["pipelin", "warehous", "analyt", "snowflak", "dbt"],
  cloud: ["aws", "infrastructur", "devop", "deploy", "host"],
  devop: ["cloud", "infrastructur", "deploy", "ci"],
  databas: ["postgr", "data", "snowflak", "storag"],
  api: ["integrat", "backend", "endpoint", "servic"],
  integrat: ["api", "connect", "system", "sync"],
  legaci: ["modernis", "migrat", "rewrit", "old"],
  scale: ["scalabl", "growth", "perform", "load"],

  // Assurance
  secur: ["complianc", "privaci", "gdpr", "soc", "safe", "audit"],
  complianc: ["secur", "audit", "gdpr", "regulat", "hipaa"],
  privaci: ["secur", "data", "gdpr", "confidenti"],
  support: ["maintain", "sla", "handov", "warranti"],
  sla: ["support", "uptim", "guarante", "respons"],
  maintain: ["support", "handov", "sla", "ongo"],
  own: ["ip", "handov", "code", "licenc", "right"],
  // The stemmer leaves tokens of four characters or fewer alone, so "owns" never
  // reduces to "own" the way "owned" and "owning" do. It needs its own row.
  owns: ["ip", "handov", "code", "licenc", "right"],
  ip: ["own", "code", "right", "licenc"],
  nda: ["confidenti", "privaci", "legal", "contract"],
  contract: ["engag", "term", "nda", "legal", "sow"],

  // Process
  // "process" → "proces", "processes" → "process". Both spellings get a row.
  proces: ["method", "discoveri", "sprint", "deliveri"],
  process: ["method", "discoveri", "sprint", "deliveri"],
  method: ["proces", "discoveri", "sprint", "approach"],
  start: ["begin", "discoveri", "first", "kickoff", "contact"],
  work: ["process", "case", "project", "deliveri"],
  team: ["peopl", "staff", "engin", "leadership"],

  // Contact
  contact: ["email", "reach", "talk", "call", "enquir", "book"],
  email: ["contact", "reach", "mail"],
  call: ["contact", "talk", "meet", "book"],
  meet: ["call", "book", "contact", "demo"],
  demo: ["call", "meet", "show", "walkthrough"],

  // Industries
  health: ["clinic", "medic", "hospit", "patient", "care"],
  medic: ["health", "clinic", "patient"],
  financ: ["fintech", "bank", "payment", "ledger"],
  retail: ["ecommerc", "shop", "store", "invent"],
  logist: ["suppli", "deliveri", "rout", "fleet"],

  /*
   * Roman Urdu.
   *
   * The console takes Urdu as readily as English, but the corpus is written in
   * English and BM25 does not translate. Without this block "qeemat kya hai" is
   * a query with no matching term in any passage, the relevance floor returns
   * nothing, and the agent correctly but uselessly says it does not know.
   *
   * Keys are stemmed — see the assertion in `scripts/check-synonym-keys.mjs`,
   * which fails the build if a key here would never be produced by `tokenize`.
   * (`paise` stems to `pai`, which is exactly the sort of row that silently
   * does nothing.)
   */
  qeemat: ["price", "cost", "budget", "rate", "quote"],
  qimat: ["price", "cost", "budget", "rate"],
  keemat: ["price", "cost", "budget", "rate"],
  daam: ["price", "cost", "rate", "quote"],
  pai: ["price", "cost", "payment", "budget"],
  paisa: ["price", "cost", "payment", "budget"],
  kharcha: ["price", "cost", "budget", "expens"],
  kitna: ["price", "cost", "how", "timelin", "scale"],
  kitne: ["price", "cost", "timelin", "team", "scale"],
  mehnga: ["price", "cost", "expens", "budget"],
  sasta: ["price", "cost", "budget", "afford"],

  waqt: ["timelin", "duration", "week", "schedul"],
  kab: ["timelin", "week", "schedul", "start"],
  din: ["timelin", "week", "duration"],
  hafta: ["week", "timelin", "duration"],
  hafte: ["week", "timelin", "duration"],
  mahina: ["month", "timelin", "duration"],
  jaldi: ["fast", "quick", "timelin", "speed"],

  kaam: ["work", "project", "case", "servic", "deliveri"],
  banate: ["build", "develop", "servic", "product"],
  banao: ["build", "develop", "servic", "product"],
  banana: ["build", "develop", "servic", "product"],
  bana: ["build", "develop", "servic", "product"],
  karte: ["servic", "work", "process", "deliveri"],
  milega: ["deliver", "handov", "timelin", "get"],
  chahiye: ["need", "requir", "want", "servic"],

  log: ["team", "peopl", "staff", "employe"],
  banda: ["team", "peopl", "staff"],
  kaun: ["team", "peopl", "founder", "ceo", "leadership"],
  malik: ["ceo", "founder", "own", "leadership"],

  rabta: ["contact", "email", "reach", "call"],
  raabta: ["contact", "email", "reach", "call"],
  baat: ["contact", "call", "talk", "meet"],
  milna: ["meet", "call", "contact", "book"],
  misal: ["exampl", "case", "portfolio", "studi"],
  dikhao: ["exampl", "case", "portfolio", "show"],
};

/**
 * The keys, for `scripts/check-synonym-keys.mjs` to assert are all reachable.
 * A key that is not its own stem is a row that can never fire.
 */
export const SYNONYM_KEYS: readonly string[] = Object.keys(SYNONYMS);

/**
 * Weight applied to a term that only entered the query through `SYNONYMS`, so a
 * document using the visitor's actual word outranks one matched by the bridge.
 */
export const SYNONYM_WEIGHT = 0.45;

export interface QueryTerm {
  term: string;
  weight: number;
}

/** Expands a raw question into weighted, de-duplicated query terms. */
export function expandQuery(question: string): QueryTerm[] {
  const literal = tokenize(question);
  const weights = new Map<string, number>();

  for (const term of literal) weights.set(term, 1);
  for (const term of literal) {
    for (const alias of SYNONYMS[term] ?? []) {
      if (!weights.has(alias)) weights.set(alias, SYNONYM_WEIGHT);
    }
  }

  return [...weights].map(([term, weight]) => ({ term, weight }));
}
