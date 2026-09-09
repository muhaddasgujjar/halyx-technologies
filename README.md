# Halyx Technologies — marketing homepage

A single-page, dark-mode marketing site for Halyx Technologies, built in Next.js
(App Router) + TypeScript from the design in `docs/design-handoff/`.

```bash
npm install
cp .env.example .env   # then fill in RESEND_API_KEY
npm run dev            # http://localhost:3000
npm run build          # runs check:css first
npm run typecheck
```

## How it maps to the design

The prototype in `docs/design-handoff/Halyx Homepage.dc.html` is the
reference for every hex value, `clamp()` and duration. Its in-browser runtime
(`support.js`) is **not** ported — the markup, styles and logic were rewritten as
React components and CSS Modules.

```
app/
  layout.tsx           fonts (next/font/google), metadata
  page.tsx             composes the sections in DOM order, emits JSON-LD
  globals.css          tokens, reset, hx-* keyframes, the reveal system
  icon.svg             favicon
  robots.ts            disallows everything unless NEXT_PUBLIC_SITE_URL is set
  sitemap.ts           one entry today
  actions/contact.ts   server action for the contact form
components/
  SiteProvider.tsx     the state that crosses section boundaries
  Reveal.tsx           <RevealScope> + <Reveal>, one shared IntersectionObserver
  Nav · Hero · Counters · Services · CaseStudies · TrustedBy · Story
  DottedMap · Highlights · Team · Beliefs · ContactForm · ClosingCTA · Footer
  overlays/
    ParticleCanvas · ScrollToast · ChatDock · CaseModal · VideoModal
lib/
  site.ts              canonical URL / name / email, resolved from the environment
  email.ts             Resend delivery and templates
  projects · reviews · people · services · content · kb · hubs · particles · config
scripts/
  check-css-keyframes.mjs   build-time guard, see "Keyframes in CSS Modules"
public/media/          images, the showcase mp4, and the world atlas
docs/design-handoff/   the original design bundle — reference only, never deployed
```

Styling is **CSS Modules** throughout, over CSS custom properties defined in
`globals.css`. The page is fluid rather than breakpoint-driven: `clamp()` plus
`repeat(auto-fit, minmax(Xpx, 1fr))`, with exactly one media query (see
"Deviations" below).

## Things worth knowing before you change something

**The reveal system.** Every `[data-reveal]` element starts hidden and settles in
when a single shared `IntersectionObserver` fires. Each section declares one
animation family via `<RevealScope variant="…">`, so adjacent sections never
enter the same way — the mapping matches the prototype's `VARIANTS` cycle:

| Section | Variant | | Section | Variant |
|---|---|---|---|---|
| Hero | `mask` | | Highlights | `tilt` |
| Services | `slideL` | | Team | `rise` |
| Case Studies | `rise` | | How We Think | `rise` |
| Trusted by | `blur` | | Let's talk | `rise` |
| Our Story | `slideR` | | Closing CTA | `rise` |
| | | | Footer wordmark | `letter` |

The transition lives on the `.hx-in` class only, so an element leaving the
viewport snaps back to its start state instead of animating in reverse.

**Keyframes in CSS Modules — read this before adding an animation.** CSS Modules
scopes `@keyframes` names *and rewrites the reference*. A bare
`animation: hx-shine 6s …` inside a `*.module.css` compiles to
`animation: Foo-module__hash__hx-shine 6s …`, which matches nothing, because the
keyframes are global in `app/globals.css`. There is no build error and no console
warning — the animation silently never runs. Modules must go through the
`--hx-kf-*` tokens:

```css
animation: var(--hx-kf-shine) 6s linear infinite;   /* correct */
animation: hx-shine 6s linear infinite;             /* silently dead */
animation: :global(hx-shine) 6s linear infinite;    /* emitted verbatim, dropped */
```

Inline `style={{ animation }}` bypasses the transform entirely, which is why the
hero pills, orbit portraits and SVG connectors animate without a token.
`npm run check:css` enforces this and runs as part of `npm run build`.

**One rAF loop.** `ParticleCanvas` owns the page's only animation loop and drives
both particle instances: the backdrop cloud travelling from the hero dock to the
services dock (reforming from a sphere into the active service's glyph), and the
assembler behind the closing CTA. It skips work when `document.hidden`. The
dotted map has its own loop because it is a self-contained canvas, but that one
is gated on an `IntersectionObserver` and costs nothing off-screen.

**`svc` lives in `SiteProvider`, not `Services`.** The active service row decides
which glyph the particle cloud assembles into, so the two need one source of
truth.

**The testimonial rail's `flex: none`.** `components/TrustedBy.module.css`
`.railViewport` must keep `flex: none` plus a resolved height. A `flex: 1` +
`min-height` viewport does not clip, and the card blows out to the full track
height.

**Marquees are pure CSS.** Both vertical rails render their list twice and
translate `-50%`, so the loop is seamless, and pause via
`animation-play-state` on hover. No JS scroll listeners.

**Motion kill-switch.** `SITE_CONFIG.enableMotion` (in `lib/config.ts`) and the
visitor's `prefers-reduced-motion` both feed one resolved `motion` flag. When it
is off: no particle loops, no marquees, no floats, and reveals apply their end
state immediately.

**Config knobs** are in `lib/config.ts`, carried over from the prototype's props
panel: `enableMotion`, `particleDensity` (300–3500, default 1500),
`showHeroStats`, `showFooterWordmark`.

## Contact email

Submissions go out over [Resend](https://resend.com). `app/actions/contact.ts`
validates, then `lib/email.ts` sends a formatted notification to `CONTACT_TO`
with `replyTo` set to the enquirer — so hitting Reply in your mail client just
works.

Configuration lives in `.env` (gitignored; `.env.example` is the template):

| Variable | Purpose |
|---|---|
| `RESEND_API_KEY` | Resend key. A **send-only** restricted key is the right choice. |
| `CONTACT_FROM` | Sender, e.g. `Halyx Technologies <onboarding@resend.dev>`. |
| `CONTACT_TO` | Where enquiries land. Comma-separate for several recipients. |
| `CONTACT_ACK` | `true` to auto-reply to the enquirer. Off by default. |

**About the sender.** `onboarding@resend.dev` is Resend's sandbox address: it
needs no DNS setup, but it can **only deliver to your own Resend account email**.
That is exactly what `CONTACT_TO` is, so the notification works today. It is also
why `CONTACT_ACK` is off — the acknowledgement goes to an arbitrary visitor
address, which the sandbox sender cannot reach.

To lift both limits, verify `halyx.tech` in the Resend dashboard (it is
registered but still `not_started`), then set
`CONTACT_FROM="Halyx Technologies <hello@halyx.tech>"` and `CONTACT_ACK=true`.

**Spam.** A hidden `company_website` honeypot field is checked first. A filled
one returns the normal success message and sends nothing, so a bot cannot tell
the difference. Rate limiting is not implemented — add it at the edge if the
form starts attracting volume.

**Failure is reported honestly.** If Resend rejects the send, the visitor is
told to email `hello@halyx.tech` instead; the reason is logged server-side and
never shown to them. A failed *acknowledgement* never fails the submission — the
studio already has the enquiry by then.

## Deploying

The app is a standard Next.js App Router project and needs no special build step
beyond `npm run build` (which runs `check:css` first).

**Set these in the host's environment:** `RESEND_API_KEY`, `CONTACT_FROM`,
`CONTACT_TO`, and `NEXT_PUBLIC_SITE_URL`. Everything else has a working default.

**`NEXT_PUBLIC_SITE_URL` is the one that bites.** It drives `metadataBase`,
`robots.txt`, the sitemap and the JSON-LD. Set it on production **only**. Leave
it unset on previews: `robots.ts` then serves a blanket `Disallow: /`, so a
staging URL cannot be indexed, and `lib/site.ts` falls back to `VERCEL_URL` so
the preview still describes itself correctly.

**What ships.** `.vercelignore` keeps `docs/` out of the deployment upload — the
design bundle is 7 MB of reference material with no runtime role. Node is pinned
via `.nvmrc` and `engines.node`.

**Headers** are set in `next.config.ts`: `X-Frame-Options`,
`X-Content-Type-Options`, `Referrer-Policy`, `Permissions-Policy` and HSTS, with
`X-Powered-By` removed. There is deliberately **no CSP** — the page uses inline
`style` attributes and an inline JSON-LD script, so a real CSP needs nonces
threaded through middleware. That is worth doing before launch; it is not a
one-liner.

## Deviations from the prototype

Everything is a faithful port except these, all deliberate:

1. **The ~900px grid gap is fixed.** The handoff flagged that the auto-fit grid
   in *Trusted by* strands an empty cell beside the testimonial card once the
   span-2 orbit panel drops to its own row. `.grid` collapses to a single column
   below 1000px. This is the only media query in the project.
2. **The contact form is wired end to end.** The prototype had no endpoint,
   validation or result state. There is now a server action with field
   validation, a honeypot, success/error reporting, and Resend delivery.
3. **The dotted map is a React component, not an iframe**, and loads the world
   atlas from `public/media/countries-110m.json` rather than a CDN.
4. **Keyboard and screen-reader access.** Rows, cards and pills that were click
   handlers on `<div>`s are real `<button>`s; portraits and modals carry labels.
   The visual result is unchanged.
5. **`prefers-reduced-motion`** is honoured, which the prototype did not do.
6. **SEO metadata and Organization JSON-LD** were added; the prototype had none.

## Still open

- **Verify `halyx.tech` in Resend** so mail can come from your own domain and
  the applicant acknowledgement can be switched on. See "Contact email" above.
- **The chat assistant is a canned keyword matcher** (`lib/kb.ts`), not an LLM.
  If it should run on a model, those answers are a good system-prompt seed.
- **Photography.** The five orbit portraits are placeholder stand-ins from the
  design process — replace them with real client photos or drop the faces. Team
  card portraits are missing entirely; `TEAM[].img` is wired and renders through
  `next/image` as soon as you supply one.
- **Testimonial attribution.** The six reviews in `lib/reviews.ts` are written
  copy, not approved client quotes. Confirm names, titles and permission before
  launch. ("Loius" is spelled to match the orbit portrait label — intentional.)
- **Analytics and cookie/consent** are absent, as in the prototype.
