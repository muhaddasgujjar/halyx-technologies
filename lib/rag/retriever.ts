import { CORPUS } from "./corpus";
import { expandQuery, tokenize, type QueryTerm } from "./tokenize";
import type { Chunk, Hit, Retrieval } from "./types";

/**
 * BM25 retrieval over the Halyx corpus, with field boosting, synonym-expanded
 * queries and MMR re-ranking for diversity.
 *
 * **Why not embeddings.** The corpus is ~30 chunks of marketing and case-study
 * prose that changes when the site changes. A vector store would add a network
 * hop, an API key, an embedding bill and a rebuild step to beat BM25 on a
 * problem BM25 already solves at this size — and it would be non-deterministic,
 * so a bad answer would be far harder to reproduce. The interface below
 * (`retrieve` in, `Retrieval` out) is the seam: when the corpus grows past a
 * few hundred chunks, swap the body and nothing upstream changes.
 */

/* ────────────────────────────  Tuning  ──────────────────────────── */

/** Standard BM25 term-saturation constant. */
const K1 = 1.4;
/** Length normalisation. Below 1 because chunk lengths here vary a lot. */
const B = 0.72;

/** Field boosts. A title match is strong evidence; body prose is weak. */
const TITLE_BOOST = 3;
const KEYWORD_BOOST = 2.2;

/** How many chunks reach the model. Enough for a synthesised answer, not a dump. */
const DEFAULT_TOP_K = 6;

/**
 * Relevance floor, as a fraction of the best hit's score. A chunk scoring under
 * a third of the leader is almost always topical noise, and noise in context is
 * worse than a short context: it invites the model to answer the wrong question.
 */
const RELATIVE_FLOOR = 0.33;

/** Absolute floor. Below this, nothing in the corpus is actually about the query. */
const ABSOLUTE_FLOOR = 0.6;

/**
 * MMR trade-off. 1.0 is pure relevance, 0 is pure diversity. 0.72 keeps the top
 * hit intact while stopping five near-identical service rows from crowding out
 * the pricing chunk a visitor also needs.
 */
const MMR_LAMBDA = 0.72;

/* ────────────────────────────  Index  ──────────────────────────── */

interface Doc {
  chunk: Chunk;
  /** Boosted term frequencies. */
  tf: Map<string, number>;
  /** Sum of boosted frequencies — the effective document length for BM25. */
  length: number;
  /** Distinct terms, for the MMR overlap penalty. */
  terms: Set<string>;
}

interface Index {
  docs: Doc[];
  /** term -> number of documents containing it. */
  df: Map<string, number>;
  avgLength: number;
}

function buildIndex(corpus: Chunk[]): Index {
  const docs: Doc[] = corpus.map((chunk) => {
    const tf = new Map<string, number>();

    const add = (tokens: string[], boost: number) => {
      for (const token of tokens) tf.set(token, (tf.get(token) ?? 0) + boost);
    };

    add(tokenize(chunk.title), TITLE_BOOST);
    add(tokenize((chunk.keywords ?? []).join(" ")), KEYWORD_BOOST);
    add(tokenize(chunk.text), 1);

    let length = 0;
    for (const value of tf.values()) length += value;

    return { chunk, tf, length, terms: new Set(tf.keys()) };
  });

  const df = new Map<string, number>();
  for (const doc of docs) {
    for (const term of doc.terms) df.set(term, (df.get(term) ?? 0) + 1);
  }

  const avgLength = docs.reduce((sum, d) => sum + d.length, 0) / Math.max(docs.length, 1);
  return { docs, df, avgLength };
}

/**
 * Built once per process on first use.
 *
 * The corpus is static after the module loads, so this is a pure function of
 * the bundle — safe to memoise, and cheap enough (~30 docs) that the first
 * request pays no meaningful penalty.
 */
let cachedIndex: Index | null = null;

function index(): Index {
  if (!cachedIndex) cachedIndex = buildIndex(CORPUS);
  return cachedIndex;
}

/** Test/tooling hook: rebuild after mutating the corpus. */
export function resetIndex(): void {
  cachedIndex = null;
}

/* ────────────────────────────  Scoring  ──────────────────────────── */

/**
 * Smoothed IDF, floored at zero.
 *
 * The `+1` inside the log is what stops a term present in most documents from
 * scoring negative and actively penalising a document for containing it.
 */
function idf(term: string, { df, docs }: Index): number {
  const n = df.get(term) ?? 0;
  if (n === 0) return 0;
  return Math.log(1 + (docs.length - n + 0.5) / (n + 0.5));
}

function scoreDoc(doc: Doc, query: QueryTerm[], idx: Index) {
  let score = 0;
  const matched: string[] = [];

  for (const { term, weight } of query) {
    const freq = doc.tf.get(term);
    if (!freq) continue;

    const saturated = (freq * (K1 + 1)) / (freq + K1 * (1 - B + B * (doc.length / idx.avgLength)));
    score += weight * idf(term, idx) * saturated;
    if (weight === 1) matched.push(term);
  }

  return { score: score * (doc.chunk.weight ?? 1), matched };
}

/** Jaccard overlap on distinct terms — the MMR redundancy signal. */
function similarity(a: Doc, b: Doc): number {
  let shared = 0;
  const [small, large] = a.terms.size <= b.terms.size ? [a, b] : [b, a];
  for (const term of small.terms) if (large.terms.has(term)) shared += 1;
  const union = a.terms.size + b.terms.size - shared;
  return union === 0 ? 0 : shared / union;
}

/* ────────────────────────────  Retrieval  ──────────────────────────── */

export interface RetrieveOptions {
  topK?: number;
  /** Restrict to one section — used by the model's own follow-up searches. */
  section?: Chunk["section"];
}

/**
 * Runs a question against the corpus and returns the passages worth reading.
 *
 * Order of operations: expand the query through the synonym bridge, score every
 * document with BM25, drop everything under both floors, then re-rank with MMR
 * so the returned set covers distinct ground instead of restating one chunk
 * five ways.
 */
export function retrieve(question: string, options: RetrieveOptions = {}): Retrieval {
  const { topK = DEFAULT_TOP_K, section } = options;
  const idx = index();
  const query = expandQuery(question);
  const terms = query.filter((q) => q.weight === 1).map((q) => q.term);

  if (query.length === 0) return { hits: [], terms, empty: true };

  const pool = section ? idx.docs.filter((d) => d.chunk.section === section) : idx.docs;

  const scored = pool
    .map((doc) => ({ doc, ...scoreDoc(doc, query, idx) }))
    .filter((entry) => entry.score > ABSOLUTE_FLOOR)
    .sort((a, b) => b.score - a.score);

  if (scored.length === 0) return { hits: [], terms, empty: true };

  const floor = scored[0].score * RELATIVE_FLOOR;
  const candidates = scored.filter((entry) => entry.score >= floor);

  // MMR: greedily take the candidate with the best relevance-minus-redundancy
  // score against what has already been selected.
  const selected: typeof candidates = [];
  const remaining = [...candidates];
  const best = candidates[0].score;

  while (selected.length < topK && remaining.length > 0) {
    let bestIdx = 0;
    let bestValue = -Infinity;

    for (let i = 0; i < remaining.length; i += 1) {
      const relevance = remaining[i].score / best;
      const redundancy = selected.reduce(
        (max, chosen) => Math.max(max, similarity(remaining[i].doc, chosen.doc)),
        0,
      );
      const value = MMR_LAMBDA * relevance - (1 - MMR_LAMBDA) * redundancy;
      if (value > bestValue) {
        bestValue = value;
        bestIdx = i;
      }
    }

    selected.push(remaining[bestIdx]);
    remaining.splice(bestIdx, 1);
  }

  const hits: Hit[] = selected.map((entry) => ({
    chunk: entry.doc.chunk,
    score: Number(entry.score.toFixed(3)),
    matched: entry.matched,
  }));

  return { hits, terms, empty: false };
}

/**
 * Retrieval for a whole conversation, not just the latest message.
 *
 * "How much would that cost?" is unanswerable on its own — the subject lives in
 * the turn before it. Recent user turns are folded in at a decay so they can
 * disambiguate a follow-up without letting a question from six turns ago
 * dominate the ranking.
 */
export function retrieveForConversation(
  question: string,
  priorUserTurns: string[],
  options: RetrieveOptions = {},
): Retrieval {
  const context = priorUserTurns.slice(-2);
  if (context.length === 0) return retrieve(question, options);

  // The current question is repeated so its terms outweigh the carried context
  // even before synonym weighting.
  const composed = [question, question, ...context.reverse()].join(" \n ");
  return retrieve(composed, options);
}
