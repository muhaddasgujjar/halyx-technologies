# Halyx AI — the assistant backend

A retrieval-augmented assistant for the homepage chat dock. It answers questions
about Halyx from Halyx's own material, refuses to invent anything it was not
given, and captures qualified leads straight into the studio inbox.

Endpoint: `POST /api/chat`, streaming SSE. Two frontends share it: the chat dock
(`components/overlays/ChatDock.tsx`) and the voice console in the `#halyx-ai`
section (`components/halyx-ai/`), which wraps the same turn in speech — see
[Voice](#voice). Generation runs on Groq or Claude behind one provider
interface.

## Shape

```
ChatDock ──▶ POST /api/chat ──▶ guard ──▶ rate limit ──▶ retrieve ──┐
    ▲                                                              │
    └──────────── SSE events ◀── provider (Groq | Claude) ◀─────────┘
                                     ▲          │
                                     └ search ◀─┤ tools
                                       lead  ◀──┘
```

| File | Job |
|---|---|
| `types.ts` | Chunk, Hit, event union. The contract the frontend compiles against. |
| `corpus.ts` | The knowledge base. Derived from the site's own typed content, plus an editorial block for sales answers with no rendered home. |
| `tokenize.ts` | Stemming, stopwords, and the synonym bridge between visitor vocabulary and site copy. |
| `retriever.ts` | BM25 with field boosts, relevance floors and MMR re-ranking. |
| `prompt.ts` | The persona and the context block. Split stable / volatile for prompt caching. |
| `guard.ts` | Bounds and sanitises the client-supplied transcript. |
| `ratelimit.ts` | Per-IP burst and hourly windows. |
| `leads.ts` | Validates and delivers a captured lead over Resend. |
| `chat.ts` | The turn: retrieve, stream, run tools, emit events. Provider-agnostic. |
| `voice.ts` | Speech in and speech out, both on Groq. Used only by the voice routes. |
| `../i18n/languages.ts` | The fifteen languages the agent speaks: labels, greetings, BCP-47 tags, and the name the prompt uses. Shared by the navbar switcher and the server. |
| `providers/types.ts` | The neutral vocabulary both providers translate into. |
| `providers/anthropic.ts` | Claude adapter. Prompt caching lives here. |
| `providers/groq.ts` | Groq adapter, plus the model-liveness check. |
| `providers/index.ts` | Selection and failover. |
| `../../app/api/chat/route.ts` | HTTP and SSE. |
| `../../app/api/voice/transcribe/route.ts` | Audio in, text out. |
| `../../app/api/voice/speak/route.ts` | Text in, audio out. |
| `../chat-client.ts` | Browser transport: POST, SSE frame parsing, typed dispatch. |
| `../../components/overlays/ChatDock.tsx` | The dock UI. |
| `../../components/halyx-ai/` | The voice console: the loop, the portrait, the dashboard. |

## The HTTP contract

**Request**

```jsonc
POST /api/chat
{
  "message": "how long would a voice agent take?",
  "history": [                       // optional, last 20 turns
    { "role": "user", "content": "do you build voice agents?" },
    { "role": "assistant", "content": "Yes — Cartesia Assistant is live…" }
  ],
  "mode": "voice",                   // optional, "text" (default) | "voice"
  "locale": "de"                     // optional, a code from lib/i18n/languages.ts
}
```

A leading `assistant` turn is trimmed automatically, so the dock can send its
greeting verbatim. History is capped at 20 turns / 12,000 characters, oldest
dropped first; a single message is capped at 1,200 characters.

`mode` picks the persona: `text` is the homepage dock, which declines off-topic
questions; `voice` is the Halyx AI console, which answers them and never quotes
a price. An unrecognised value degrades to `text`, the stricter of the two.

`locale` is the language the visitor chose in the navbar. It is validated
against the registry before it goes anywhere near the prompt — it is
interpolated into the system prompt, so an unchecked string there would be a
very short path to prompt injection. An unknown code falls back to English.

**Response** — `text/event-stream`, one JSON `ChatEvent` per `data:` frame:

| `type` | Payload | Use |
|---|---|---|
| `sources` | `sources[]` — id, title, section, href, url | Render a source strip. Fires before the first token, and again after a model-initiated search. |
| `delta` | `text` | Append to the bubble. |
| `tool` | `name`, `status` | Show "searching…" / "sending your details…". |
| `lead` | `captured`, `message` | Confirm the enquiry went through. |
| `done` | `usage`, `stopReason`, `provider`, `model` | End of turn. `provider`/`model` say who actually answered, which failover makes vary. |
| `error` | `code`, `message` | End of turn, with a visitor-safe line to display. |

A turn always ends with exactly one `done` or `error`. Failures *before* the
stream opens are ordinary JSON with a real status (`400`, `413`, `429`, `503`),
so the client only parses SSE once it has a `200`.

`GET /api/chat` is a readiness probe:

```jsonc
{
  "ready": true,
  "corpusChunks": 32,
  "providers": {
    "pinned": null,
    "primary": { "id": "groq", "model": "openai/gpt-oss-120b" },
    "fallback": null,
    "keys": { "anthropic": false, "groq": true }
  },
  // live:false means the configured Groq model has been decommissioned.
  // live:null means the catalogue could not be read — unknown, not missing.
  "groqModel": { "model": "openai/gpt-oss-120b", "live": true, "checkedAt": "…" }
}
```

## Retrieval

BM25 over ~32 chunks, with title matches boosted 3x and curated keywords 2.2x.
Queries are expanded through a synonym table (`tokenize.ts`) so "how much" finds
a passage that says "pricing"; expansions score at 0.45 of a literal match.
Results are re-ranked with MMR so a pricing question does not come back as five
near-identical service rows. Below both a relative floor (a third of the top
hit) and an absolute floor, nothing is returned and the model is told so — which
is what makes "I do not know, but the team will confirm" a reliable answer
rather than a hallucination.

Follow-ups fold the previous two user turns into the query at a decay, so "how
long would that take" resolves against whatever "that" was.

**Why not embeddings.** At this corpus size BM25 wins on latency, cost,
determinism and reproducibility, and needs no second API key. `retrieve()` is
the seam: when the corpus passes a few hundred chunks, replace the body and
nothing upstream changes.

**Tuning it.** Almost every "it did not find X" report is a missing row in
`SYNONYMS` or a missing entry in a chunk's `keywords`, not a scoring bug. Add
the visitor's actual words there first.

## Editing the knowledge base

Chunks come from two places, and the distinction is load-bearing:

- **Derived** — built from `lib/projects.ts`, `lib/services.ts`, `lib/content.ts`,
  `lib/reviews.ts`, `lib/hubs.ts`, `lib/site.ts`. Change the site, and the
  assistant learns it on the next build. There is no second copy to drift.
- **Editorial** — the `EDITORIAL` array in `corpus.ts`. Pricing model, engagement
  shapes, process, security, objection handling. Every claim is carried over from
  copy that already ships (mostly `lib/kb.ts`). Keep it that way: a claim that
  exists only here is a claim nobody has signed off.

If the assistant said it, it is in `corpus.ts`. That is the property that makes a
wrong answer a one-file fix.

## Providers

Two are wired, behind one interface (`providers/types.ts`). `chat.ts` runs the
same retrieval and the same tool loop either way.

| | Groq | Anthropic |
|---|---|---|
| Default model | `openai/gpt-oss-120b` | `claude-opus-5` |
| Override | `GROQ_MODEL` | `ANTHROPIC_MODEL` |
| Reasoning | `reasoning_effort: low`, `include_reasoning: false` | adaptive thinking, `effort: low` |
| Prompt caching | none available | breakpoint after tools + persona |
| Max output | 4,096 | 8,192 |

**Selection.** `CHAT_PROVIDER` pins one explicitly and disables failover — a
pinned provider is a deliberate choice. Unset, whichever key is present is used,
Claude preferred when both are. With both configured, a primary failure *before
any text has streamed* falls over to the other; once a token is on screen the
turn is committed, because half a sentence in one model's voice followed by half
in another's reads worse than a clean error. Rate-limit failures never fail over.

### Groq models get decommissioned — plan for it

Groq retires model ids on a rolling schedule and does **not** keep the old id
answering. `llama-3.3-70b-versatile` and `llama-3.1-8b-instant` — the two ids
most code reaches for out of habit — were shut down on **2026-08-16**. Anything
still naming them fails outright.

Two defences are built in:

1. `GROQ_MODEL` overrides the default, so a retirement is an env change rather
   than a deploy.
2. `GET /api/chat` reports `groqModel.live`, checked against Groq's live
   catalogue (cached ten minutes). `false` means the configured id is gone and
   the response lists what Groq currently offers. Watch this endpoint and the
   next retirement is a failing health check, not a broken widget.

A retired model also surfaces at request time as `ProviderError.kind ===
"model_gone"`, logged with the model id — distinct from a generic upstream
error precisely because it is the failure that will actually happen.

Current replacements, per Groq's own deprecation page: `openai/gpt-oss-120b`
(the default here), `openai/gpt-oss-20b` for lower latency, `qwen/qwen3.6-27b`.

### Verifying caching (Anthropic only)

Watch `usage.cacheRead` in the `done` event across turns of one conversation.
If it stays at zero, something in the prefix is varying. Groq has no prompt
cache, so it reports zero always.

## The frontend

`ChatDock.tsx` streams from `/api/chat` through `lib/chat-client.ts`. What it
does with each event:

- `sources` — held until the answer lands, then rendered as chips under the
  bubble. Case-study sources link out; section sources jump to the anchor.
- `delta` — accumulated in a ref and flushed once per animation frame. Groq
  streams several hundred tokens a second and a React render per token is
  visibly worse than one per frame.
- `tool` — drives the header line ("Searching our work…", "Sending your details…").
- `lead` — appends a mint confirmation bubble.
- `error` — appends a failure bubble after whatever streamed; a turn that failed
  before saying anything drops its empty bubble rather than leaving a blank.

While a turn is in flight the input is disabled and the send button becomes a
stop button, which aborts the fetch and keeps whatever had arrived.

**Graceful degradation.** If `/api/chat` is unreachable or has no provider key,
the dock answers from the canned matcher in `lib/kb.ts` instead of showing a
dead widget. Every question that matcher covers is one the assistant would have
answered anyway — just more bluntly.

**Replayed history** excludes the greeting, failure bubbles and system
confirmations: none of them are things the assistant said in the dialogue.

## Voice

The `#halyx-ai` section on the homepage is the same assistant with a microphone
in front of it and a speaker behind it. Every hop runs on the Groq key that is
already configured:

```
mic ──▶ /api/voice/transcribe ──▶ /api/chat ──▶ /api/voice/speak ──▶ speaker
        whisper-large-v3-turbo    mode:"voice"   orpheus-v1-english
```

Only the middle hop is shared code. `useVoiceAgent.ts` owns the loop, and it
listens again as soon as the reply finishes playing, so a conversation is turns
rather than button presses.

**Two endpoints, not one.** Transcription is deliberately separate from the
answer: the browser records, gets text back, shows the visitor what was heard,
*then* asks. One endpoint doing both would answer a mis-heard question before
anybody could see it was mis-heard.

**Ending an utterance.** A `MediaRecorder` runs alongside an `AnalyserNode`, and
recording stops after 1.4s under an RMS floor of 0.014 — but only once the
visitor has actually crossed that floor, or somebody who pauses before speaking
gets cut off mid-breath. A 20s hard stop bounds a hot mic in an empty room, and
clips under 2,400 bytes are dropped without paying to transcribe them.

**`mode: "voice"`** swaps the system prompt for `VOICE_SYSTEM_PROMPT`: shorter
sentences, no markdown, no citation markers — everything that reads fine and
*sounds* wrong. Retrieval, tools and lead capture are unchanged.

**The greeting is a client-side constant**, not a model call. It is one sentence
per language, held in the registry, and a round trip to be told so would put a
second of dead air between arriving and any sign of life. It is spoken
unprompted when the console scrolls into view — a voice agent that waits to be
clicked is a button — and again, in the new language, whenever the visitor
changes the navbar switcher.

Browsers refuse to play audio before the visitor has interacted with the page,
and scrolling does not count. When the greeting is refused, `blocked` is set,
the console offers a tap, and the same line is re-spoken from inside that
gesture. The transcript gets the line either way, so a visitor with the sound
off still gets greeted — they read it instead of hearing it.

## Languages

The agent speaks fifteen languages; `lib/i18n/languages.ts` is the single
registry, imported by the navbar switcher and by the server. **English is always
the default** — `navigator.language` is deliberately never consulted, because it
is a poor proxy for what somebody wants to be sold in, and a marketing page that
changes language under a visitor is worse than one that waits to be asked. The
choice persists in `localStorage`.

What the choice actually changes:

| Hop | Effect |
|---|---|
| Greeting | Spoken from the registry, in that language, client-side. |
| `/api/voice/transcribe` | The locale's greeting is used to prime Whisper. A **bias, not a pin** — pinning `language` returns confident nonsense when the visitor says one thing in another language, which is exactly the failure that made `"en"` a bad default in the first place. |
| `/api/chat` | `systemPromptFor(mode, locale)` appends a language directive naming the language. A default, not a gag: the persona still follows a visitor who writes in something else. |
| `/api/voice/speak` | Orpheus is English-only, so anything else returns `415 unsupported_language` and the browser's own voice reads it. The client skips the round trip entirely for non-English rather than paying it to be refused. |
| Browser voice | Matched by primary subtag, so `de-AT` reads German. Urdu falls back to a Hindi voice — shared phonology, and no desktop OS ships Urdu. |

Retrieval stays English-only: the corpus is English and BM25 does not translate,
so a German question usually retrieves nothing. Both personas are told that an
empty result means *the search could not read it*, not that Halyx has no answer,
and to call `search_halyx` with an English translation before concluding
anything. Search in English, answer in theirs.

The site copy around the console stays English, as do the dashboard's own
readouts — they sit next to `BM25` and a model id, and a panel where half the
labels are translated reads as a bug rather than as localisation. What follows
the visitor is everything the agent *says*: greeting, hint, placeholder, empty
state, and every answer.

Appending the directive rather than interpolating it keeps every byte before it
identical across languages, so the cached prefix stays as long as it can be:
one cache entry per language, not one per language and per anything else.
English appends nothing at all — the persona is already written in English.

**Typing reaches the same agent.** `getUserMedia` is refused outright over plain
HTTP, and a visitor in a shared office will not talk to a website. The composer
under the transcript runs the identical turn, and having typed once, the visitor
keeps the turn — it does not hand control back to the microphone uninvited.

### Synthesis needs one click in the Groq console

Groq gates `canopylabs/orpheus-v1-english` behind a per-organisation terms
acceptance. An account that has not accepted them gets a 400 with
`model_terms_required`, which `/api/voice/speak` reports as **409**, distinct
from a real failure — because it is not a bug, not transient, and not fixable
from the code.

The client answers a 409 by speaking through `speechSynthesis` and not asking
again for the rest of the session; the console's Voice tile reads `Browser`
instead of `Groq` so the state is visible rather than mysterious. Accept the
terms at `console.groq.com/playground?model=canopylabs/orpheus-v1-english` and
the same code upgrades on the next request, with no redeploy.

**As of the last check this deployment is on the browser fallback** — the terms
have not been accepted. Transcription is unaffected and works today.

### The console doubles as a status page

`Console.tsx` reads `GET /api/chat` and renders the real numbers: corpus size,
the resolved provider, whether the configured Groq model is still live. If the
corpus failed to build or a model has been decommissioned underneath a working
deployment, this screen says `DEGRADED` instead of quietly rendering a
plausible-looking dashboard over a broken backend.

The android is drawn in `AndroidPortrait.tsx` rather than photographed: no
licence to get wrong, built from the site's own accent tokens so it cannot drift
out of theme, and its eyes and throat are driven by the agent state — which is
what makes it read as alive rather than decorative. To swap in real artwork,
render an `<img>` in its place; the slat overlay and the parallax wrapper sit
above it and do not care what is underneath.

## Tools

- **`search_halyx`** — the model's own follow-up retrieval, for when the
  conversation moves off the initially retrieved topic. Results are merged into
  the `sources` event so the visitor sees them.
- **`capture_lead`** — delivers name, email, company, need, budget and timeline to
  the studio inbox through the same Resend transport and the same `Enquiry`
  shape as the contact form. Placeholder and disposable domains are rejected with
  a corrective message the model reads and acts on, so a pushy assistant cannot
  invent an address to close the loop. Needs `RESEND_API_KEY`, `CONTACT_FROM` and
  `CONTACT_TO` — the same three the contact form already uses.

## Configuration

At least one provider key is required; with neither, `/api/chat` returns 503 and
the dock falls back to `lib/kb.ts`.

```
GROQ_API_KEY=gsk_…             # this deployment's provider — and both voice hops
GROQ_MODEL=…                   # optional; override when the default is retired
ANTHROPIC_API_KEY=sk-ant-…     # optional; preferred when both are set
ANTHROPIC_MODEL=…              # optional
CHAT_PROVIDER=groq|anthropic   # optional; pins one and disables failover

GROQ_STT_MODEL=…               # optional; default whisper-large-v3-turbo
GROQ_TTS_MODEL=…               # optional; default canopylabs/orpheus-v1-english
GROQ_TTS_VOICE=…               # optional; default tara

RESEND_API_KEY=…               # already set — lead capture reuses it
CONTACT_FROM=…                 # already set
CONTACT_TO=…                   # already set
```

`GROQ_BASE_URL` is read by the Groq SDK and points the client at a different
host — useful for testing the adapter against a local stand-in without a key.

## Known limits

- **Rate limiting is per-instance.** Exact on a single Node server; on serverless
  a visitor spread across N warm instances gets N times the allowance. Swap
  `hit()` for a Redis `INCR`/`EXPIRE` against the same signature when this
  endpoint is worth attacking properly.
- **No conversation persistence.** The transcript lives in the browser and is
  replayed on every turn. Nothing is stored server-side, which is the cheapest
  correct answer for a marketing widget — and means the client can rewrite its
  own history, which is why `guard.ts` bounds it and the system prompt is never
  client-supplied.
- **Lead delivery is synchronous.** The visitor waits on Resend inside the turn.
  Acceptable at this volume; move it behind a queue if it ever is not.
