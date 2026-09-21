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
| 1, 2 | Privacy / Terms | `[~]` live | `[~]` live | Pages did not exist; rewritten and shipped |
| 7 | OG image | `[x]` | `[x]` | Did not exist; no `og:image` was served at all |
| 8 | Favicon | `[~]` | `[~]` | `manifest` route did not exist either |
| 11 | Image weight | `[x]` "not one PNG" | `[~]` | 13 MB of raster is now in `public/media` |
| 12 | Page speed | `[~]` 303 KB | `[~]` 490 KB | LiveKit, d3-geo and topojson added |
| 13 | Colour contrast | `[x]` measured | `[ ]` | `npm run audit:contrast` does not exist here |
| 15 | 404 page | `[x]` | `[x]` | Did not exist; shipped |
| 18 | Spam protection | `[x]` two gates | `[~]` | The timing gate is gone; honeypot only |
| 19 | Analytics | `[x]` wired | `[ ]` | `@vercel/analytics` is not a dependency |
| 20 | One clear CTA | `[x]` two phrasings | `[~]` | Four phrasings are live |
| 21 | Unverifiable claims | `[~]` removed | `[ ]` | Invented metrics returned, and contradict each other |

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

**Remaining:** registered entity name and address, governing jurisdiction, and
the supervisory authority. A visible note on the page says so. Have a solicitor
read it once.

**Re-check with:** compare the table against `lib/email.ts`,
`lib/rag/providers/` and `agent/agent.py` after any provider change.

### `[~]` 2. Terms & conditions

Live at `/terms`, linked, in the sitemap. States plainly that it governs the
**website** and does not replace an MSA/SOW, and disclaims the AI assistants —
they are generative, can be wrong, and bind nobody.

**Remaining:** the governing-law clause names no jurisdiction, and the
registered entity is not stated. Flagged in a note on the page.

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

**Still to do:** submit the sitemap in Google Search Console — see
`docs/DEPLOY.md`.

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

Measured against live production, compressed, as a browser receives it:

| | KB |
|---|---|
| document | 19 |
| JS + CSS (18 files) | 471 |
| **first load** | **490** |

Images and video load lazily and are not in that figure.

**That is up from the 303 KB previously recorded** — roughly +62%, and it is
the LiveKit client, `d3-geo`, `topojson-client` and `world-atlas`. The voice
agent and the dotted map are the two features paying for it. Worth confirming
the map libraries are dynamically imported rather than in the initial chunk.

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

### `[~]` 18. Spam protection — **regressed**

Only **one** gate is present: the honeypot (`company_website`), which answers
with a success shape so a bot learns nothing.

The **2.5-second minimum fill time is gone** — the previous checklist records
both gates, and only the honeypot survives in `app/actions/contact.ts`. Worth
restoring; it is a few lines and it catches a different class of bot.

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

### `[ ]` 21. No unverifiable claims — **open, and now self-contradictory**

`TrustedBy` was cleaned up properly, and its comment explains the standard:
invented figures were replaced with counts read off the same data the page
renders. That is the right pattern.

**The rest of the page did not follow it.** Still live:

| Where | Claim |
|-------|-------|
| Hero (`COUNTER_TARGETS`) | `60+` Products Shipped · `12` Industries Served · `24/7` Support |
| `HIGHLIGHTS` | `40+` Interfaces Shipped · `99.9%` Platform Uptime · `4x` Median ROI |
| `TrustedBy` | `6` products live and linkable *(derived, true)* |

The problem is worse than unverifiable. A prospect scrolling one page reads
**60+**, then **40+**, then **6**, for what sounds like the same thing. There is
no monitoring behind `99.9%` and no measurement behind `4x`.

Fix the same way `TrustedBy` was fixed: derive from `PROJECTS` where a number
can be derived, and delete the ones that cannot. One real number that survives
checking does more than six that do not.

**The standing rule:** if you would not be comfortable with a prospect checking
it, it does not ship. Anonymised is fine — "a UK clinical staffing platform,
live in 11 weeks". Invented is not, and for testimonials specifically a
fabricated endorsement is a regulatory problem rather than a marketing one.

---

## Blockers — do not promote the site until these are true

1. **One real enquiry sent through the production form and confirmed to
   arrive**, with the acknowledgement landing in an external inbox. This is the
   top item. Resend domain verification (DKIM + SPF + DMARC) and `CONTACT_FROM`
   off the sandbox sender cannot be checked from outside — the Vercel variables
   are sensitive-flagged and `vercel env pull` returns them empty by design.
   Search traffic is now arriving at that form.
2. **Registered entity, address, jurisdiction and supervisory authority** in
   `/privacy` and `/terms`, then a solicitor's read.
3. **The numeric claims in item 21**, which is the fastest credibility loss on
   the page.
4. **Google Search Console** — verify the domain and submit the sitemap.

Closed in this pass: indexing (9), OG image (7), 404 (15), privacy and terms
(1, 2), footer legal links and social links (16), security headers re-verified
(4), no frontend secrets re-verified (3).
