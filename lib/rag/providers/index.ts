import "server-only";
import { anthropicConfigured, anthropicProvider } from "./anthropic";
import { checkModel, groqConfigured, groqModel, groqProvider } from "./groq";
import type { Provider } from "./types";

export { checkModel, groqModel };
export * from "./types";

/**
 * Provider selection.
 *
 * Explicit `CHAT_PROVIDER` wins. Otherwise whichever key is present is used,
 * with Claude preferred when both are — it is the stronger model and the only
 * one with prompt caching, so on a page this low-volume it is also barely more
 * expensive per conversation.
 *
 * Selection is resolved per call rather than memoised: env changes between a
 * dev-server reload and a request often enough that a cached decision is just a
 * confusing bug.
 */

export type ProviderId = Provider["id"];

const REGISTRY: Record<ProviderId, { provider: Provider; configured: () => boolean }> = {
  anthropic: { provider: anthropicProvider, configured: anthropicConfigured },
  groq: { provider: groqProvider, configured: groqConfigured },
};

/** Preference order when `CHAT_PROVIDER` is unset. */
const PREFERENCE: ProviderId[] = ["anthropic", "groq"];

function requested(): ProviderId | null {
  const raw = process.env.CHAT_PROVIDER?.trim().toLowerCase();
  if (raw === "anthropic" || raw === "groq") return raw;
  if (raw) console.warn(`[chat] ignoring unknown CHAT_PROVIDER "${raw}"`);
  return null;
}

/**
 * The provider to try first, and the one to fall back to.
 *
 * `fallback` is only ever used when the primary fails *before* any text has
 * reached the visitor — see `runChat`. Half a sentence in one model's voice
 * followed by half in another's is worse than a clean error.
 */
export function selectProviders(): { primary: Provider | null; fallback: Provider | null } {
  const pinned = requested();

  if (pinned) {
    const entry = REGISTRY[pinned];
    if (!entry.configured()) {
      console.error(`[chat] CHAT_PROVIDER=${pinned} but its API key is not set`);
      return { primary: null, fallback: null };
    }
    // A pinned provider is a deliberate choice, so do not silently use the other.
    return { primary: entry.provider, fallback: null };
  }

  const available = PREFERENCE.filter((id) => REGISTRY[id].configured());
  return {
    primary: available[0] ? REGISTRY[available[0]].provider : null,
    fallback: available[1] ? REGISTRY[available[1]].provider : null,
  };
}

export function isConfigured(): boolean {
  return selectProviders().primary !== null;
}

/** What `GET /api/chat` reports, so a misconfiguration is visible from outside. */
export function providerStatus() {
  const { primary, fallback } = selectProviders();
  return {
    pinned: requested(),
    primary: primary ? { id: primary.id, model: primary.model } : null,
    fallback: fallback ? { id: fallback.id, model: fallback.model } : null,
    keys: {
      anthropic: anthropicConfigured(),
      groq: groqConfigured(),
    },
  };
}
