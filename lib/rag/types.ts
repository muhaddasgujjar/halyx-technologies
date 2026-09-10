/**
 * Shared types for the Halyx retrieval-augmented assistant.
 *
 * Everything here is transport-neutral: the retriever, the prompt builder and
 * the route handler all speak these shapes, so swapping BM25 for a vector store
 * later is a change to `retriever.ts` alone.
 */

/** Buckets a chunk belongs to. Drives retrieval quotas and citation labels. */
export type Section =
  | "company"
  | "service"
  | "case-study"
  | "testimonial"
  | "team"
  | "process"
  | "pricing"
  | "faq"
  | "contact";

/**
 * One retrievable unit of knowledge.
 *
 * `id` is the citation handle the model is told to use, so it must be stable
 * and human-legible — it ends up in logs and, if the frontend wants, in a
 * "sources" strip under the answer.
 */
export interface Chunk {
  id: string;
  section: Section;
  title: string;
  /** In-page anchor, e.g. `#work`. Lets the UI deep-link a citation. */
  href?: string;
  /** External link — the live case-study URL. */
  url?: string;
  /** The prose the model reads. Keep it self-contained: chunks arrive alone. */
  text: string;
  /**
   * Retrieval-only terms. Aliases, misspellings and the words a visitor would
   * use that the prose never does ("chatbot" for a voice agent, "naqsha" for a
   * floor plan). Indexed, never shown to the model.
   */
  keywords?: string[];
  /** Static prior on importance. 1 is neutral; 1.3 wins ties. */
  weight?: number;
}

/** A chunk plus why it was picked. */
export interface Hit {
  chunk: Chunk;
  score: number;
  /** Query terms that actually matched — useful when debugging a bad answer. */
  matched: string[];
}

/** What the retriever hands the prompt builder. */
export interface Retrieval {
  hits: Hit[];
  /** Normalised query terms after expansion, for logging. */
  terms: string[];
  /** True when nothing cleared the relevance floor. */
  empty: boolean;
}

/** One turn of the client-supplied transcript. */
export interface Turn {
  role: "user" | "assistant";
  content: string;
}

/** A lead the assistant captured mid-conversation. */
export interface Lead {
  name: string;
  email: string;
  company?: string;
  need: string;
  budget?: string;
  timeline?: string;
}

/**
 * Events pushed down the SSE stream.
 *
 * Deliberately a closed union: the frontend switches on `type` exhaustively, so
 * adding a case here is a compile error there rather than a silent no-op.
 */
export type ChatEvent =
  | { type: "sources"; sources: { id: string; title: string; section: Section; href?: string; url?: string }[] }
  | { type: "delta"; text: string }
  | { type: "tool"; name: string; status: "running" | "done" | "failed" }
  | { type: "lead"; captured: boolean; message: string }
  | {
      type: "done";
      usage: { input: number; output: number; cacheRead: number };
      stopReason: string | null;
      /** Which provider and model actually answered — failover makes this vary. */
      provider: "anthropic" | "groq";
      model: string;
    }
  | { type: "error"; code: ErrorCode; message: string };

export type ErrorCode =
  | "bad_request"
  | "rate_limited"
  | "too_long"
  | "not_configured"
  | "upstream"
  | "internal";
