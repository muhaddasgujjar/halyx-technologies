# Deploying Halyx Technologies

This repo deploys to **two places**, and both are required for the site to work
as advertised.

| Half | Where | Why it cannot go elsewhere |
| --- | --- | --- |
| The Next.js site, `/api/chat`, `/api/livekit/token` | **Vercel** | Ordinary request/response work. |
| `agent.py` — the voice worker | **LiveKit Cloud Agents** (or Render / Railway / Fly / a VM) | It is a long-lived process holding a WebSocket open to LiveKit, waiting to be dispatched into rooms. Vercel runs short-lived serverless functions and has nothing that keeps a process alive. |

Deploy only the Vercel half and the failure is silent, not loud: a visitor
presses Start, joins a real room, publishes their microphone, and waits in a
room no worker is ever told to enter. The console looks connected. Nothing
speaks. There is no error anywhere, because nothing failed — the agent was
simply never asked.

---

## 0. Rotate the keys first

Do this before anything reaches a production environment variable. Five
credentials were exposed during development:

| Key | Rotate at |
| --- | --- |
| `LIVEKIT_API_KEY` / `LIVEKIT_API_SECRET` | cloud.livekit.io → Settings → Keys |
| `DEEPGRAM_API_KEY` | console.deepgram.com → API Keys |
| `OPENAI_API_KEY` | platform.openai.com → API keys |
| `CARTESIA_API_KEY` | play.cartesia.ai → API Keys |

Then update `.env.local` and confirm the new ones work before you deploy them:

```
.venv\Scripts\python preflight.py
```

Four green lines is the gate. It calls each service rather than checking the
file, so a revoked or mismatched key fails here instead of in front of a client.

---

## 1. The site, on Vercel

```
vercel login          # interactive — run it yourself
vercel link
vercel --prod
```

### Environment variables

Set these in the Vercel project (Settings → Environment Variables). The site
needs **eight**; note that Deepgram, OpenAI and Cartesia are *not* among them —
those belong to the agent, which runs elsewhere.

| Variable | Purpose |
| --- | --- |
| `NEXT_PUBLIC_SITE_URL` | **Mandatory.** See the warning below. |
| `LIVEKIT_URL` | The `wss://` project URL, for the token route. |
| `LIVEKIT_API_KEY` | Mints visitor tokens. |
| `LIVEKIT_API_SECRET` | Signs them. Never reaches the browser. |
| `GROQ_API_KEY` | The typed chat assistant. |
| `GROQ_MODEL` | Optional; the code has a default. |
| `RESEND_API_KEY` | Delivers captured leads and contact-form briefs. |
| `CONTACT_FROM` / `CONTACT_TO` | Sender and studio inbox. |

> **`NEXT_PUBLIC_SITE_URL` is not optional in production.**
> `IS_INDEXABLE` in `lib/site.ts` is false without it, so `robots.txt` serves
> `Disallow: /` and `sitemap.xml` advertises `http://localhost:3000`. The whole
> site would be de-indexed while looking perfectly healthy. That behaviour is
> deliberate — it keeps preview deployments out of search — which is exactly why
> production has to set the variable rather than rely on a default.

---

## 2. The agent, on LiveKit Cloud

`Dockerfile` and `livekit.toml` in the repo root are the whole deployment.

```
lk agent create       # first time only — writes the id into livekit.toml
lk agent deploy
lk agent status
lk agent logs
```

### Environment variables

| Variable | Purpose |
| --- | --- |
| `LIVEKIT_URL`, `LIVEKIT_API_KEY`, `LIVEKIT_API_SECRET` | Registering as a worker. |
| `DEEPGRAM_API_KEY` | Speech to text, `nova-3`. |
| `OPENAI_API_KEY` | `gpt-4o-mini`, and the fallback voice. |
| `CARTESIA_API_KEY` | `sonic-3`, the voice. Optional — without it the agent falls back to OpenAI TTS with no code change. |
| `CARTESIA_VOICE_ID` | Optional even when the key is set. |

Any other host works the same way: build the `Dockerfile`, give it those
variables, run it. It needs no inbound port — it dials out to LiveKit.

---

## 3. Verify production, in this order

1. `lk agent status` — the worker is registered.
2. Open the deployed site, scroll to **Halyx AI**, press the orb.
3. You should hear the greeting within a few seconds. If the console connects
   and stays silent, the two halves disagree about the agent's name or the
   worker is not running — check `lk agent logs` first.
4. Talk over it mid-sentence. It should stop inside about a second.
5. Ask the chat dock something and click a source link.
6. Check `robots.txt` does **not** say `Disallow: /`.

---

## What the build already guarantees

`npm run build` runs six checks before it compiles, and two of them exist
specifically to stop silent production failures:

- `check-agent-name` — the agent's name is identical in `agent.py`,
  `app/api/livekit/token/route.ts` and `livekit.toml`. A mismatch is the
  silent-empty-room failure described at the top of this file.
- `check-source-links` — every source the assistant cites resolves to a section
  that exists on the page.

Plus `check-css-keyframes`, `check-synonym-keys`, `check-react-keys` and
`check-i18n`.
