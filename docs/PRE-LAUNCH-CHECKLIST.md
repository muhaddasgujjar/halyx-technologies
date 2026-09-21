# Halyx Technologies — pre-launch checklist

**Re-audited 2026-09-21 against the current tree and the live production site.**

Read this before trusting the previous version. That checklist was written
against the codebase this repo's `Initial commit` replaced. It is accurate
history for an app that no longer exists here, and roughly six of its `[x]`
marks describe files that were never in these twelve commits. Nothing deleted
them — the rebuild simply started over, and the checklist was not re-run.

The lesson worth keeping: **status is audited, not remembered.** Every mark
below cites how it was checked, so the next person can re-run it rather than
inherit a claim.

Legend: `[x]` done · `[~]` partly done · `[ ]` not started

---

## Summary of what changed in this audit

| # | Item | Was | Now | Why |
|---|------|-----|-----|-----|
| 1, 2 | Privacy / Terms | `[~]` live | `[~]` live | Pages did not exist; rewritten, shipped, and completed with the entity and jurisdiction |
| 7 | OG image | `[x]` | `[x]` | Did not exist; no `og:image` was served at all |
| 8 | Favicon | `[~]` | `[~]` | `manifest` route did not exist either |
| 11 | Image weight | `[x]` "not one PNG" | `[~]` | 13 MB of raster is now in `public/media` |
| 12 | Page speed | `[~]` 303 KB | `[~]` 490 KB | LiveKit, d3-geo and topojson added |
| 13 | Colour contrast | `[x]` measured | `[ ]` | `npm run audit:contrast` does not exist here |
| 15 | 404 page | `[x]` | `[x]` | Did not exist; shipped |
| 18 | Spam protection | `[x]` two gates | `[x]` | Timing gate restored |
| 19 | Analytics | `[x]` wired | `[ ]` | `@vercel/analytics` is not a dependency |
| 20 | One clear CTA | `[x]` two phrasings | `[~]` | Four phrasings are live |
| 21 | Unverifiable claims | `[~]` removed | `[x]` | Invented metrics removed; every number now derived |

---

## Legal & trust

### `[~]` 1. Privacy policy

Live at `/privacy`, linked from the footer, listed in the sitemap.

Written against the code rather than from a template. The processor table is
the substance: this site sends microphone audio to **Deepgram**, transcripts to
**OpenAI**, speech synthesis to **Cartesia**, chat to **Groq**, carries calls
over **LiveKit**, mails through **Resend** and is hosted by **Vercel**. Seven
US processors. The previous checklist named two, because it predates the voice
agent — voice is personal data, and none of it was disclosed.

Also documented honestly: no cookies, no analytics, no database, and the
language preference held in `localStorage`.

**Completed 2026-09-21** with the confirmed entity: the controller is named as
**Halyx Technologies (Private) Limited**, incorporated in Pakistan, registered
with the SECP and based in Lahore, Punjab. The registered name appears once at
first mention; the page then uses the short form it defines, which is why
`LEGAL_ENTITY.name` and `SITE.name` are separate constants.

The international-transfer clause is the one that changed most. With a
Pakistan-based controller and seven US processors, a UK or EEA visitor’s data
leaves the UK/EEA **twice** — to Pakistan and to the United States — and
neither has a UK or EU adequacy decision. The page says exactly that.

On supervisory authorities: the page offers the access, correction, deletion
and objection rights **unconditionally as a matter of policy**, then routes UK
and EEA visitors to the ICO or their own national authority. It deliberately
does **not** name a Pakistani authority, because the country’s data-protection
regime has been under reform and naming the wrong one is worse than offering to
confirm the current route on request.

**Remaining:** the SECP incorporation number and the registered office address
— both ordinarily expected, and the address is needed for Google Business
Profile anyway. Then one read by a lawyer, who should also confirm the
Pakistani data-protection paragraph against the statute in force.

**Re-check with:** compare the table against `lib/email.ts`,
`lib/rag/providers/` and `agent/agent.py` after any provider change.

### `[~]` 2. Terms & conditions

Live at `/terms`, linked, in the sitemap. States plainly that it governs the
**website** and does not replace an MSA/SOW, and disclaims the AI assistants —
they are generative, can be wrong, and bind nobody.

**Completed 2026-09-21.** Opens with a "Who you are contracting with" section
naming the entity, and closes with governing law of Pakistan and exclusive
jurisdiction in the courts of Lahore, Punjab — with a carve-out preserving any
mandatory local consumer protections a visitor has at home. The ownership and
liability clauses now bind to `LEGAL_ENTITY.name`, so a rename on the SECP
certificate does not leave them naming a brand instead of a company.

**Remaining:** incorporation number, registered office address, and a lawyer’s
read. The registered name is confirmed as **Halyx Technologies (Private)
Limited** and is set in `LEGAL_ENTITY.name`; the schema carries it as
`legalName` while `name` stays the trading name.

### `[x]` 5. Cookie consent banner — **not needed, close this item**

Verified: the site sets **no cookies**, runs **no analytics**, and self-hosts
both font families through `next/font`, so no request reaches Google. A banner
would be theatre. This stays true only while item 19 stays cookieless.

---

## Security

### `[x]` 3. No secrets on the frontend

Verified against the built client bundle: **0 occurrences** of either the Resend
or the Groq key in `.next/static/`. The only `NEXT_PUBLIC_*` variable in the
source is `NEXT_PUBLIC_SITE_URL`, which is a public URL by definition.

`.env` and `.env.*` are gitignored (`git check-ignore` confirms).

**Re-run after any dependency or config change:**

```bash
grep -rl "$(grep '^RESEND_API_KEY=' .env | cut -d= -f2)" .next/static/
```

### `[x]` 4. Force HTTPS and security headers

Verified against live production response headers:

```
Strict-Transport-Security: max-age=63072000; includeSubDomains
X-Content-Type-Options:    nosniff
X-Frame-Options:           SAMEORIGIN
Referrer-Policy:           strict-origin-when-cross-origin
Permissions-Policy:        microphone=(self), camera=(), geolocation=(), interest-cohort=()
```

Two deliberate deviations from the original spec, both correct here:
`microphone=(self)` rather than `()`, because the voice agent needs it; and
`X-Frame-Options: SAMEORIGIN` rather than `DENY`. **Confirm the second is
intentional** — if nothing needs to frame the site, `DENY` is stronger.

`preload` is deliberately absent from HSTS: easy to join, months to leave.

**Still to do after launch:** a Content-Security-Policy.

---

## Discoverability

### `[x]` 6. Meta titles and descriptions

Verified live. `metadataBase`, canonical, `og:url`, `og:site_name`, a title
template, and per-page titles and descriptions on `/privacy`, `/terms` and the
404. Canonical resolves to `https://www.halyxtechnologies.com`.

**Note the hostname.** The apex `308`s to `www`, so `www` is canonical.
`NEXT_PUBLIC_SITE_URL` is set to match. `.env.example` previously said
`halyx.tech`, which is where the confusion started; corrected.

### `[x]` 7. Social preview image

`app/opengraph-image.tsx` generates a 1200×630 PNG from JSX at build time — in
the site's palette, no binary in the repo. Verified live: `image/png`, 82 KB,
correct dimensions, and `og:image` plus `twitter:image` with
`summary_large_image` all present.

Until this shipped the page served **no `og:image` at all**, so every shared
link — including the four social profiles — previewed as a grey box.

Linear gradient, not radial: Satori renders a radial one in visible bands.

### `[~]` 8. Favicon

`app/icon.svg` exists and is served. Still missing, and all still 404:

- `favicon.ico` (32×32) — Safari and older browsers ignore SVG
- `apple-touch-icon.png` (180×180) — iOS home-screen bookmarks
- a web manifest with 192 and 512 PNGs — Android install prompt

Generate from `app/icon.svg`. `theme-color` is already set in the viewport
export.

### `[x]` 9. Sitemap and robots.txt

Both generated, both verified live:

```
User-Agent: *
Allow: /
Host: https://www.halyxtechnologies.com
Sitemap: https://www.halyxtechnologies.com/sitemap.xml
```

The sitemap lists exactly three URLs — `/`, `/privacy`, `/terms` — and
correctly omits in-page anchors, which are not separate URLs.

**This was the single highest-impact fix in this pass.** Until
`NEXT_PUBLIC_SITE_URL` was set in Vercel, `IS_INDEXABLE` was false, so the live
site served `noindex, nofollow` on every page *and* a blanket `Disallow: /`.
The guard in `lib/site.ts` was correct; it had simply never been switched on.

**Search Console set up 2026-09-21.** Domain property, verified by DNS TXT on
the apex; that record must stay in place, and `docs/DEPLOY.md` §4 records its
exact value and why it looks deletable. Sitemap submitted and accepted, 8 URLs.

**Still to do:** request indexing on `/` and `/services/ai-machine-learning` to
seed the first crawl, then leave it for 3–7 days. After that, watch **Pages**
for `Excluded by 'noindex'` — if that appears later it means
`NEXT_PUBLIC_SITE_URL` was dropped from the Vercel environment and the site has
silently re-blocked itself.

---

## Accessibility & media

### `[x]` 10. Alt text on images

No `<img>` in the tree is missing an `alt`. `next/image` is used in
`CaseStudies`, `CaseModal` and `Team`.

Rule going forward: `alt=""` only where adjacent text already carries the
meaning. Decorative `<canvas>` should carry `aria-hidden="true"`.

### `[~]` 11. Compress images — **regressed**

The previous entry recorded "every asset is SVG, 195 KB total, not one JPEG or
PNG". That is no longer true. `public/media` is now **13 MB**:

| File | Size |
|------|------|
| `team-numan.jpg` | 2.3 MB |
| `team-muhaddas.png` | 2.0 MB |
| `case-hbevents.png` | 2.0 MB |
| `team-aleem.png` | 1.8 MB |
| `halyx-showcase.mp4` | 2.4 MB |
| `case-architectxpert.png` | 548 KB |
| 5 × `portrait-*.png` | 1.5 MB combined |

**Mitigated, not solved.** Those go through `next/image`, so visitors receive
resized WebP/AVIF, not the originals — this is not a 13 MB page. But a 2 MB
source PNG for a portrait rendered at ~400 px is waste in the repo, in every
clone, and in build time. Downsize at source to roughly 1200 px on the long
edge and re-export. A photograph should be JPEG or WebP, not PNG.

### `[ ]` 13. Colour contrast — **unverified**

The previous entry cites `npm run audit:contrast` and reports 18 passing
checks. **That script does not exist in this tree** — `scripts/` contains only
the six `check-*.mjs` build guards, the i18n extractor and the translator. The
measurements it reports cannot be reproduced here, and the palette has changed
since.

Dark theme, muted greys on near-black, violet accent: exactly the palette where
contrast fails quietly. Target WCAG AA — 4.5:1 body, 3:1 large text and UI
boundaries. Worth porting the script back, since it exits non-zero and can join
the build guards.

### `[~]` 14. Mobile friendly

Verified in CSS: `.input` and `.textarea` are `16px` below the mobile
breakpoint, which is what stops iOS Safari zooming the viewport on focus — the
one bug that fires at the exact moment of conversion. Footer social links and
legal links carry 44 px minimum targets.

**Still needs a real device**, and these are the ones that need your eyes:

- no horizontal scroll anywhere
- the canvas scenes on a mid-range Android — the real performance risk
- the contact form one-handed
- the voice console and chat dock with the on-screen keyboard up

---

## Performance

### `[~]` 12. Page load speed

Measured against live production, compressed, as a browser receives it.
**Corrected 2026-09-21 after a second measurement** — the first pass summed
every `/_next/static/` URL referenced in the HTML, which counts prefetched
chunks a browser fetches at idle, not the blocking payload:

| | KB |
|---|---|
| document | 20 |
| initial `<script>` tags (12 files) | **387** |
| …plus prefetched chunks | ~103 |
| total referenced | 490 |

| | KB |
|---|---|
| document | 19 |
| JS + CSS (18 files) | 471 |
| **first load** | **490** |

Images and video load lazily and are not in that figure.

**Up from the 303 KB previously recorded**, though less dramatically than the
first measurement suggested. Two corrections to that entry, both found by
actually checking rather than inferring from `package.json`:

- **The LiveKit client was never on the homepage.** It is a 601 KB raw chunk,
  and it is already deferred — `VoiceAgent` lives on `/voice`, while the
  homepage mounts the older Groq console. No work needed.
- **`world-atlas` is not bundled.** `DottedMap` fetches
  `/media/countries-110m.json` at runtime, so the topojson data was never in
  the JavaScript. Lazy-loading the map split out ~10 KB gzipped of `d3-geo` and
  `topojson-client`, and deferred the 106 KB JSON fetch until the map mounts —
  worth doing, but an order of magnitude smaller than first estimated.

The remaining weight is a single 159 KB chunk (React, the Next runtime and the
app's own client components) plus four chunks of 38–71 KB. There is no single
heavy dependency left to remove; further reduction means shipping fewer client
components, which is a design decision rather than a config one.

**Still to do, and it needs a browser:** Lighthouse on **mobile**, throttled,
against the deployed build. Targets LCP < 2.5 s, CLS < 0.1, INP < 200 ms.
Desktop numbers on a fast laptop are flattering and meaningless.

### `[x]` 15. Custom 404 page

`app/not-found.tsx`. Verified live: an unknown URL returns a real **HTTP 404**,
not a soft 200 that would get the error page indexed. Sets `noindex`.

Deliberately not wrapped in `<Nav>` and `<Footer>`: every link in both is an
in-page anchor resolving against the homepage's sections, so all of them would
be dead here. Two working links beat full chrome that lies.

---

## Functionality

### `[x]` 16. Broken links

`npm run check:links` passes in the build — 20 chunk links across 7 page
anchors, none broken.

**Fixed in this pass:** the footer's "Privacy Policy" and "Terms & Conditions"
pointed at `#contact`, which scrolled the visitor to the form rather than
admitting the pages did not exist. They now point at `/privacy` and `/terms`.

**Also fixed:** the contact panel's six social badges were placeholders
(`in X IG YT FB TT`), every one an `href="#contact"`. They are now the four
real profiles, from one `SOCIAL_LINKS` list in `lib/site.ts` that also feeds the
footer row and `sameAs` in the JSON-LD. YouTube and Facebook were dropped —
there are no accounts behind them.

### `[x]` 17. Form validation

Server-side in `app/actions/contact.ts`, which is the copy that counts:
required name and email, length caps on every field, an email shape check, and
`interest` validated against the allowlist. Per-field errors are wired with
`aria-invalid` and `aria-describedby`.

### `[x]` 18. Spam protection

Both gates present again in `app/actions/contact.ts`, both silent — a tripped
submission gets the ordinary success shape, because telling a bot it was caught
only teaches its author what to change.

1. **Honeypot** (`company_website`) — a person never fills a field they cannot
   see.
2. **Minimum fill time**, 2.5 s, restored in this pass. `started_at` is stamped
   in a mount effect, *not* during render: the page is prerendered, so a
   render-time value would carry the build timestamp and disable the gate
   entirely.

A missing or unparseable stamp **passes** deliberately. The form is a real POST
and works with JavaScript off, and nothing stamps it then; dropping every no-JS
enquiry is a worse failure than letting a bot through.

**Known trade-off:** a genuine visitor who submits in under 2.5 s is silently
dropped and sees a success message. Inherent to the design — an error would
defeat the gate — but it is a lost lead with no trace. 2.5 s is short enough
that reading six fields will not hit it.

Still **no rate limit**, accepted deliberately. Serverless has no shared memory,
so a real one needs Vercel KV or Upstash keyed on IP. Note that
`lib/rag/ratelimit.ts` exists for the chat route and documents the same
trade-off — the contact action does not use it.

### `[ ]` 19. Analytics — **not wired**

`@vercel/analytics` is **not in `package.json`** and nothing is imported in
`app/layout.tsx`. The previous `[x]` describes a different codebase.

Recommendation unchanged, and it is the right one: **cookieless**, which is what
keeps item 5 closed. `@vercel/analytics` is one dependency and one component.
Then add custom events for CTA clicks and form submissions, so conversion is
measurable and not just traffic.

### `[~]` 20. One clear call to action — **regressed**

Four distinct phrasings are live on the homepage right now:

- "Start a conversation" ×2
- "Start a project"
- "Get Started"
- "Book a call"

The rule from the original entry still stands and is still right: **pick two —
one primary, one soft — and use them everywhere.** Varied labels read as varied
destinations.

---

## Content integrity

### `[x]` 21. No unverifiable claims — **closed in this pass**

`TrustedBy` was cleaned up properly, and its comment explains the standard:
invented figures were replaced with counts read off the same data the page
renders. That is the right pattern.

The rest of the page did not follow it, and has now been made to. What was
live, and what replaced it:

| Where | Was | Now |
|-------|-----|-----|
| Hero | `60+` Products Shipped · `12` Industries Served · `24/7` Support | `5` Products Live · `5` Practices · `8` Regions — read from `PROJECTS`, `SERVICES`, `HUBS` |
| `HIGHLIGHTS` | `40+` Interfaces · `99.9%` Uptime · `4x` Median ROI | `01` / `02` / `03`, the Beliefs numbering — a marker, not a measurement |
| `TrustedBy` | `5` derived *(already correct)* | unchanged |

`COUNTER_TARGETS` is deleted from `lib/config.ts`, so there is no longer a
place to type a number nobody can defend. The `+` and `/7` suffixes went with
it: a suffix on a derived count turns it back into a claim.

**The assistant was repeating all of it**, which is worse than the page doing
it — a figure inside a retrieved chunk comes back as an answer. Three fixes in
`lib/rag/corpus.ts` and `lib/kb.ts`: `co:proof` handed the model the invented
metrics and then asked it not to lean on them (a losing instruction);
`proc:support` claimed a 99.9% SLA nobody signed, an unattributable client
anecdote, and follow-the-sun "across four regions" when `HUBS` has eight; and
the no-LLM fallback matcher made the same 24/7 claim. The corpus now states
positively that Halyx publishes no uptime percentage and no ROI multiple, and
to say so if asked.

**Verified on live production:** zero occurrences of `60+`, `40+`, `99.9%`,
`4x`, `24/7`, `INTERFACES SHIPPED`, `PLATFORM UPTIME` or `MEDIAN ROI`.

**Still open, and the real content gap:** the page has no case studies, no
client logos and no testimonials. That is honest but not persuasive. It closes
when real material lands — one real engagement with one defensible number does
more than six invented ones ever did.

**The standing rule:** if you would not be comfortable with a prospect checking
it, it does not ship. Anonymised is fine — "a UK clinical staffing platform,
live in 11 weeks". Invented is not, and for testimonials specifically a
fabricated endorsement is a regulatory problem rather than a marketing one.

---

## Blockers — do not promote the site until these are true

1. **`halyxtechnologies.com` is not verified for sending. Confirmed by DNS on
   2026-09-21, and this is the most urgent open item.**

   The evidence is DNS, and it is conclusive for this domain: there are **zero
   TXT records** on the apex, none at `resend._domainkey`, and none at `send.`
   — so no SPF, no DKIM, no DMARC. Resend cannot mark a domain verified
   without a DKIM TXT record, so this one is not verified.

   **What is *not* established:** whether some *other* domain is verified on
   the Resend account. An earlier note here claimed the account had no domains
   at all — that was wrong. The API key in `.env` is send-only, so
   `GET /domains` returns 401, and the check that produced that claim misread
   the error object as an empty list. The production `CONTACT_FROM` is
   sensitive-flagged and still cannot be read, so it may point at a different
   verified domain.

   **The risk, stated accurately:** if `CONTACT_FROM` is the sandbox sender
   `onboarding@resend.dev`, Resend delivers only to the account owner’s own
   address — enquiries reach the studio inbox, but the **acknowledgement to
   the client never arrives**, and the visitor gets silence. Indexing is now
   on, so the form is taking real traffic. One end-to-end test from an outside
   address settles it in two minutes and nothing else will.

   Fix: add `halyxtechnologies.com` in the Resend dashboard, paste the MX, SPF
   and DKIM records it generates into Spaceship DNS, point `CONTACT_FROM` at an
   address on it, and add a DMARC record in the same session.
2. **Registered entity, address, jurisdiction and supervisory authority** in
   `/privacy` and `/terms`, then a solicitor's read.
3. **Google Search Console** — verify the domain and submit the sitemap. See
   `docs/DEPLOY.md` section 4.

Closed in this pass: indexing (9), OG image (7), 404 (15), privacy and terms
(1, 2), footer legal links and social links (16), spam protection (18),
unverifiable claims (21), security headers re-verified (4), no frontend secrets
re-verified (3).

Known minor gap, pre-existing: the hero counter labels pass through `t()` as
variables, so `i18n-extract` cannot see them and they stay English in all 14
languages. The previous labels had the same problem. Harmless by design — the
translator falls back to the English it was given — but worth a fix if the
hero is touched again.
