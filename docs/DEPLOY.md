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
cd agent
..\.venv\Scripts\python preflight.py
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

The worker lives in **`agent/`** — its own directory, and its own Docker build
context. It is separated from the Next.js app at the root for a practical
reason as well as a tidy one: `lk` detects the agent's language from the files
it finds, and a `package.json` in the same folder makes it look for a Node
agent that is not there.

```
agent/
  agent.py          the worker
  preflight.py      key checker
  requirements.txt
  Dockerfile
  livekit.toml
```

```
cd agent
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

## 4. Google Search Console

Do this once, after the site is indexable. It is the only way to see what the
site actually ranks for, and the only place Google tells you it has stopped
indexing you.

### Check indexing is actually on first

Search Console will happily verify a site Google is forbidden to crawl, and
then report nothing for weeks. Confirm both of these before starting:

```bash
curl -s https://www.halyxtechnologies.com/robots.txt          # must say Allow: /
curl -s https://www.halyxtechnologies.com/ | grep 'name="robots"'   # must say index, follow
```

If either says otherwise, `NEXT_PUBLIC_SITE_URL` is missing from the Vercel
production environment. `IS_INDEXABLE` in `lib/site.ts` gates both on it, and
until it is set the site serves `noindex` **and** a blanket disallow.

### Status: verified 2026-09-21

Verified by the **Domain name provider** (DNS TXT) method. The live record is
on the apex of `halyxtechnologies.com`:

```
@   TXT   google-site-verification=6nlwagkDORK8bicqP-4yaA66hkLGiJ_fj8KJpanXgTc
```

**Do not delete that record.** Google re-checks it periodically and removing it
un-verifies the property, which silently stops the reporting this section
exists to switch on. It is the single most deletable-looking line in the DNS
panel, so it is written down here on purpose.

A second method is already available at no cost: `public/google1f4542f1f8253268.html`
is committed and served at the site root. Register it under **Settings →
Ownership verification** as a fallback, so a DNS edit cannot un-verify the
property on its own.

The rest of this section is the original walkthrough, kept for the next
property (a `www` URL-prefix property, or a new domain).

### Add the property

Go to <https://search.google.com/search-console> and sign in with the Google
account that should own this — use a real company account, not a personal one
you will lose access to.

Choose **Domain**, not URL prefix, and enter `halyxtechnologies.com` with no
`https://` and no `www`.

A Domain property covers the apex, `www`, every subdomain and both protocols as
one property. That matters here specifically: the apex `308`s to `www`, so a
URL-prefix property on the wrong one of the two reports almost nothing. It is
DNS-verified, so it also survives moving off Vercel.

### Verify by DNS TXT

Google shows a record like `google-site-verification=xxxxxxxxxxxx`.

**This domain's DNS is at Spaceship, not Vercel.** The nameservers are
`launch1.spaceship.net` and `launch2.spaceship.net`, so the Vercel dashboard
has nothing to edit — adding it there does nothing. Go to
**spaceship.com → Domains → halyxtechnologies.com → Advanced DNS → DNS
Records → Add record**:

| Field | Value |
|-------|-------|
| Type | `TXT` |
| Name | `@` (the apex, not `www`) |
| Value | `google-site-verification=xxxxxxxxxxxx` |
| TTL | leave the default |

Spaceship may label the apex field `@` or leave it blank — either means the
root domain. Do **not** enter `www`.

Save, wait a minute or two, then press **Verify**. If it fails, propagation is
usually the cause — check with `nslookup -type=TXT halyxtechnologies.com` and
try again rather than adding a second record.

**While you are in that DNS panel, add the Resend records too** (see the
Contact form section). The domain currently has no TXT records at all, which
means no SPF, no DKIM and no DMARC — one trip through the panel is better than
three.

**Leave the record in place permanently.** Deleting it un-verifies the
property, and Google rechecks periodically.

#### If you cannot reach DNS

There is an HTML-tag fallback already wired. Pick **HTML tag** in Search
Console, copy only the `content="..."` value, and set it in Vercel:

```bash
npx vercel env add NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION production
npx vercel --prod          # or push to main
```

`app/layout.tsx` emits the tag only when that variable is set. Prefer DNS where
possible — the tag route verifies one hostname, not the domain.

### Submit the sitemap

Once verified, open **Sitemaps** in the sidebar and submit the **full URL**:

```
https://www.halyxtechnologies.com/sitemap.xml
```

**Not** a bare `sitemap.xml`. That form works only in a URL-prefix property,
where the field is pre-filled with the hostname. This is a **Domain** property,
which spans http and https, the apex and every subdomain — so Google cannot
infer which host is meant and answers *"Invalid sitemap address. Please enter a
valid path to a sitemap in your site."*

It should report **Success** and 8 discovered URLs: `/`, the five
`/services/*` pages, `/privacy` and `/terms`. `app/sitemap.ts` generates it, so
it cannot drift out of date.

### Then, and this is the part people skip

- **URL Inspection** on `https://www.halyxtechnologies.com/` → **Request
  indexing**. Seeds the first crawl instead of waiting.
- Come back in **3–7 days**. Indexing is not immediate and an empty report on
  day one means nothing.
- Check **Pages** for anything under *Not indexed*. `Excluded by 'noindex'`
  appearing later means `NEXT_PUBLIC_SITE_URL` was lost from the environment.
- Set the **email preferences** on, so Google can tell you about a manual
  action or a coverage collapse. That notification is the main reason to have
  done any of this.

Bing has an equivalent at <https://www.bing.com/webmasters>, and it can import
the Search Console property directly once this is done.

---

## What the build already guarantees

`npm run build` runs six checks before it compiles, and two of them exist
specifically to stop silent production failures:

- `check-agent-name` — the agent's name is identical in `agent/agent.py`,
  `app/api/livekit/token/route.ts` and `agent/livekit.toml`. A mismatch is the
  silent-empty-room failure described at the top of this file.
- `check-source-links` — every source the assistant cites resolves to a section
  that exists on the page.

Plus `check-css-keyframes`, `check-synonym-keys`, `check-react-keys` and
`check-i18n`.
