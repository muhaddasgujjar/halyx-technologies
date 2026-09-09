# Handoff: Halyx Technologies — Marketing Homepage

## Overview

A single-page, dark-mode marketing homepage for Halyx Technologies, an applied-AI and product-engineering studio. One continuous scroll covering hero, services, case studies, social proof, company story, team, principles, a contact form, and footer — plus three persistent overlays (particle canvas, scroll toast, chat assistant) and two modals (case study detail, showcase video).

The target implementation is **Next.js (App Router) with TypeScript**. See "Target: Next.js" below.

## About the design files

The files in this bundle are **design references authored in HTML**. They are a working prototype of the intended look, motion, and behavior — **not production code to lift wholesale**. `Halyx Homepage.dc.html` runs on a small in-browser design runtime (`support.js`) that provides `{{ }}` template holes, `<sc-for>` / `<sc-if>`, and a React-like logic class. None of that runtime belongs in the Next.js app.

The task is to **recreate this design in a real Next.js codebase** using idiomatic React components, real CSS (CSS Modules or Tailwind — pick one and be consistent), and the project's own conventions. Read the prototype for exact values, copy, and animation timings; write fresh code.

Open `Halyx Homepage.dc.html` directly in a browser (no server needed) to see and interact with the reference.

## Fidelity

**High fidelity.** Final colors, typography, spacing, radii, shadows, copy, and interaction timings. Recreate it faithfully — every hex value and duration in the prototype is intentional. Where a value is a `clamp()`, keep the `clamp()`; the whole page is fluid rather than breakpoint-driven.

---

## Design tokens

### Color

| Token | Value | Use |
|---|---|---|
| `bg` | `#060608` | Page background |
| `ink` | `#f2f2f4` | Default text |
| `ink-strong` | `#ffffff` | Headline emphasis, hover text |
| `ink-2` | `#e8e8ef` | Card titles, secondary headings |
| `ink-3` | `#c9c9d2` | Hero subcopy |
| `muted` | `#8a8a95` | Body copy |
| `muted-2` | `#9a9aa6` | Nav links (rest) |
| `muted-3` | `#7d7d89` | Metric captions |
| `mono-dim` | `#6f6f7d` | Mono eyebrow labels |
| `mono-dimmer` | `#4f4f5c` | Footnote mono labels |
| `accent` | `#6b5cf0` | Primary violet |
| `accent-200` | `#bcb2ff` | Accent text on dark |
| `accent-100` | `#c9c4ff` | Icon fills, host labels |
| `accent-300` | `#8f83ef` | Eyebrow accent, icon strokes |
| `accent-400` | `#b6aeff` | Link default |
| `accent-deep` | `#5647d6` / `#4b3fd4` | Gradient stop, `::selection` |
| `mint` | `#8ff0c0` | "Live" status dot and label |
| `surface-0` | `#0a0a10` / `#0c0c11` | Modal & media backgrounds |
| `particle` | `rgb(188 178 255)` | Canvas particle color (`ACCENT`) |

Glass surfaces (used on nearly every card):

```
background: rgba(255,255,255,0.028 – 0.055)
border:     1px solid rgba(255,255,255,0.08 – 0.14)
backdrop-filter: blur(12–22px) saturate(150–160%)
box-shadow: inset 0 1px 0 rgba(255,255,255,0.12–0.20),
            0 30px 70px -40px rgba(0,0,0,0.95)
```

Ambient glows are absolutely-positioned `radial-gradient(ellipse at center, rgba(107,92,240,0.16–0.34), rgba(107,92,240,0) 68–70%)` with `filter: blur(26–30px)` and `pointer-events:none`, one per major section, bleeding outside the container.

Accent hover glow, used on every interactive glass element:
`border-color: rgba(188,178,255,0.4–0.7)` + `box-shadow: 0 0 26–44px rgba(150,136,255,0.4–0.85)`.

### Typography

- **Display / UI:** Instrument Sans — weights 300, 400, 500, 600 (400/500 do most of the work).
- **Mono / labels:** JetBrains Mono — 400, 500. Only ever used for eyebrows, metadata, and status text.
- Google Fonts import in the prototype; in Next.js use `next/font/google` for both.

| Role | Size | Weight | Tracking | Notes |
|---|---|---|---|---|
| Hero H1 | `clamp(34px,6.6vw,96px)` | 300, emphasis span 600 | `-0.045em` | `line-height:1.02`, `text-wrap:balance`, `text-shadow:0 4px 50px rgba(6,6,8,0.92)` |
| Hero sub | `clamp(13px,1.4vw,16px)` | 400 | — | `line-height:1.6`, max-width 620px |
| Section H2 | `clamp(24px,3.4vw,46px)` | 500 | `-0.03em` | Varies slightly per section (see file) |
| Sub-head H3 | `clamp(20px,2.6vw,36px)` | 400–500 | `-0.03em` | Modal titles, "Let's talk" |
| Body | 13–15px | 400 | — | `line-height:1.6–1.7`, `color:#8a8a95` |
| Metric | `clamp(20px,3vw,40px)` | 500 | `-0.03em` | `font-variant-numeric: tabular-nums` |
| Mono eyebrow | 9–10.5px | 400 | `0.14–0.20em` | UPPERCASE |
| Nav link | 13.5px | 400 | — | |
| Wordmark | 15px | 600 | `0.24em` | "HALYX" |

Minimum body size on the page is 11px (mono metadata only); prose never below 12px.

### Spacing, radius, shadow

- Section vertical rhythm: `padding: clamp(60px,8vw,120px) clamp(18px,3vw,40px)`; the tallest sections use `clamp(72px,10vw,150px)`.
- Content containers: `max-width` 1180 / 1280 / 1320 / 1440px, `margin: 0 auto`. Footer 1760px.
- Grid gaps: `clamp(20px,3vw,48px)`; card inner padding `clamp(18px,2.4vw,30px)`.
- Radii: `999px` (pills, avatars), `24–26px` (large panels), `18–22px` (cards), `15–16px` (tooltips), `10px` (chat inputs/buttons).
- Shadows: `0 14px 34px -20px rgba(0,0,0,0.95)` (pills) · `0 30px 70px -40px rgba(0,0,0,0.95)` (cards) · `0 40px 90px -50px rgba(0,0,0,0.95)` (large panels) · `0 26px 60px -28px rgba(0,0,0,0.98)` (tooltips/modals).

### Keyframes (all defined in the prototype's `<style>`)

| Name | Definition | Used by |
|---|---|---|
| `hx-marquee` | `translate3d(0,0,0) → translate3d(-50%,0,0)` | Horizontal logo/quote strips |
| `hx-vmarquee` | `translate3d(0,0,0) → translate3d(0,-50%,0)` | Case-study card column (46s), testimonial column (58s) |
| `hx-float-a…e` | ±4–15px 2-axis drift, 7–11s | Hero pills, orbit portraits |
| `hx-shine` | `background-position: -140% 0 → 240% 0` | Gradient border sweeps, toast |
| `hx-ring` | `scale(1)/.55 → scale(1.5)/0` | Play button + toast icon pulse |
| `hx-dash` | `stroke-dashoffset: → -240` | SVG connector lines, 8.5–12s |
| `hx-pulse` | opacity `.3 → .65 → .3` | Ambient dots |
| `hx-spin` / `hx-spin-rev` | 360° / −360° | Orbit rings |
| `hx-arc` | `rotate(0) → rotate(-360deg)` | Arc accents |
| `hx-glowline` | opacity `.35 → .85 → .35` | Divider glow |
| `hx-badge` | `translateY(0 → -4px)` | Badge bob |
| `hx-bar` | `scaleX(1 → 0)` | Toast progress bar |

All marquee tracks render their list **twice** and translate `-50%`, so the loop is seamless. Every marquee pauses on hover (`animation-play-state: paused`).

---

## Screens / views

One route: `/`. Sections in DOM order, with their anchor ids.

### 1. Particle canvas (fixed backdrop)
`<canvas>` absolutely positioned at the top of the page, `width:100%; height:100vh; pointer-events:none`. A 2D point cloud (default 1500 points, `ACCENT` color) that assembles into shapes — `["code","chip","network","cloud","database"]` — and travels/reforms as the user scrolls. Driven by one `requestAnimationFrame` loop; a second assembler instance runs on the CTA canvas. Point count is a prop (`particleDensity`, 300–3500).

### 2. Nav (fixed, `z-index:100`)
Full-width bar, `padding:16px clamp(18px,3vw,40px)`, `background:rgba(6,6,8,0.72)`, `backdrop-filter:blur(14px)`, `border-bottom:1px solid rgba(255,255,255,0.06)`.
Left: wordmark `HALYX`. Center: `Work` → `#work`, `Company` → `#company`, `Services` → `#services`, `Halyx AI` → `#halyx-ai`, `Contact` → `#contact` (13.5px, `#9a9aa6`, hover `#fff`). Right: pill CTA "Start Your Project" with a 28px white circular `↗` badge.

### 3. Hero
`min-height:100vh`, centered column, `padding: clamp(110px,14vw,150px) clamp(18px,3vw,40px) 48px`.
- Giant watermark `HALYX TECHNOLOGIES` at `top:15%`, `clamp(48px,11vw,190px)`, `color:rgba(255,255,255,0.045)`, `white-space:nowrap`, non-interactive. **The floating pills intentionally overlap it** — that layering is by design, not a bug.
- H1: `We Build **Intelligent Systems**\nThat Matter` (the emphasis span is weight 600).
- Sub: "Because lasting systems aren't built by chance — / they're engineered with purpose." (second line `#8a8a95`).
- Four glass pills float around the headline, each with a tiny geometric mark: **UI/UX** (rounded square gradient), **Development** (ring outline), **Branding** (rotated square), **3D Animation** (3-bar equalizer). Positions `left:2%/top:4%`, `right:2%/top:9%`, `left:6%/bottom:6%`, `right:5%/bottom:2%`; each on a different `hx-float-*` cycle with staggered reveal delays 160/240/320/400ms.
- Bottom row: primary pill CTA "Start Your Project" (gradient `rgba(160,146,255,0.34) → rgba(107,92,240,0.18)`) and three count-up metrics (Products Shipped, and two more — see `[data-counters]`), `tabular-nums`, animated from 0 when scrolled into view. Metrics are behind the `showHeroStats` prop.

### 4. Services — `#services`
Two-column grid (`repeat(auto-fit,minmax(300px,1fr))`, the text column spanning 2). H2 "Our Services" + intro "End-to-end digital solutions that turn technology into measurable results across every part of your business." Five practices, selectable, `svc` state drives the active row and the paired visual: **AI & Machine Learning, Custom Software, Web & Mobile Apps, Business Automation, Data & Cloud**.

### 5. Case Studies — `#work` (`data-casestudies="1"`)
H2 "Case Studies" + eyebrow "SHIPPED FOR TEAMS IN SOUTH ASIA, AFRICA AND EUROPE" + intro "Every project below is live. Open one for the problem, what we built, and the deployed URL you can use right now."
Two columns:
- **Left — index list.** One row per project: zero-padded number (mono, `#6f6f7d`), mint status dot with glow, name (15px/500), category (12px `#8a8a95`), `↗` at the right. Rows separated by `border-top:1px solid rgba(255,255,255,0.09)`, `padding:20px 8px`, hover `background:rgba(255,255,255,0.03)` + `inset 0 0 30px rgba(150,136,255,0.12)`. Footer line: "FIVE LIVE DEPLOYMENTS · TAP A ROW FOR THE FULL CASE". Click opens the case modal.
- **Right — vertical marquee.** Height `clamp(420px,50vw,600px)`, `overflow:hidden`, edge fade via `mask-image: linear-gradient(180deg,transparent,#000 10%,#000 90%,transparent)`. Track is the project list rendered twice, `gap:18px`, `animation: hx-vmarquee 46s linear infinite`, paused on hover. Each card: 16/10 screenshot (`object-fit:cover`, `object-position:50% 0`) under a `linear-gradient(180deg, rgba(6,6,10,0) 40%, rgba(6,6,10,0.85))` scrim, host label bottom-left in mono `#c9c4ff`, then name / category / mono note in `#bcb2ff`. Click opens the modal.

The five projects (name · category · host · note, with `problem` / `solution` / `facts` for the modal) are the `PROJECTS` array — Maiku AI, ArchitectXpert, H&B Event Solution, Axiom, Cartesia Assistant. Copy them verbatim from the prototype; they are real client work.

### 6. Trusted by industry leaders
Eyebrow "TRUSTED BY INDUSTRY LEADERS", H2 "The people who put our systems into production.", and three metrics: **99.98%** "Uptime across managed platforms", **140ms** "Median p95 inference latency", **4** "Delivery regions on call".

Below, a two-cell grid (`repeat(auto-fit,minmax(320px,1fr))`, `gap:clamp(20px,2.6vw,34px)`, `align-items:stretch`):

- **Orbit panel** (`grid-column: span 2`) — a glass panel, inner stage `aspect-ratio:16/11; min-height:470px; padding-bottom:120px`. A `viewBox="0 0 100 100"` `preserveAspectRatio="none"` SVG draws five dashed quadratic connectors from the center `50 46` out to each portrait, animated with `hx-dash`. Five circular client portraits (`clamp(58px, 8.4–9.8vw, 76–88px)`, 3px gradient ring, `object-position:50% 22%`) sit at `16%/26%`, `84%/22%`, `84%/68%`, `16%/72%`, `50%/88%`, each drifting on its own float cycle. Below each: name (11.5px/500) and mono role (8.5px, `0.12em`). Hovering a portrait raises its z-index and fades in a 210–262px testimonial tooltip (mint "CLIENT TESTIMONIAL" eyebrow + 12px quote) — tooltips on the top row open **downward**, bottom-row tooltips open **upward**. Center of the panel holds the video card: `width:min(34%,320px); min-width:168px`, animated gradient border (`hx-shine` 8s), 16/10 dotted-grid poster, 60px glass play button with an `hx-ring` pulse, and a footer strip "Inside Halyx — showcase film" / "00:10 · APPLIED AI STUDIO" / `PLAY`. Click opens the video modal.
- **Testimonial scroller** — glass card, header row "CLIENT TESTIMONIALS" (mono, `#8f83ef`) and "HOVER TO PAUSE" (mono, `#4f4f5c`). Viewport is `flex:none; height:clamp(300px,32vw,430px); overflow:hidden` with the same top/bottom mask fade (9%/91%). **The resolved height matters** — a `flex:1` + `min-height` viewport does not clip and the card blows out to full track height. Track: six reviews rendered twice, `gap:14px`, `animation: hx-vmarquee 58s linear infinite`, paused on hover. Each review card: 13.5px quote (`line-height:1.66`, `#dcdce4`), divider, 38px circular initials avatar (`rgba(150,136,255,0.14)` on `rgba(188,178,255,0.35)` border, `#d8d3ff` text), name 12.5px/500, role 11px `#7d7d89`. Data is the `REVIEWS` array (Loius Walker · Dr. Anita Rao · Marcus Kelling · Folake Ogunbiyi · Tomas Svoboda · Priya Nandakumar) — **copy the strings exactly**, including the "Loius" spelling, which matches the orbit portrait label.

### 7. Our Story — `#company`
Eyebrow "OUR STORY". H2 "Halyx Technologies operates at the intersection of applied AI and transformative product design." Right column: "**Founded by engineers, designers, and operators**, we started with one product and a small team. Today 200–500 people build AI systems for clients across four regions." + mono hint "HOVER THE MARKERS TO FOLLOW THE STORY". Below: a `clamp(340px,44vw,620px)`-tall rounded panel containing a **dotted world map** with hoverable story markers, embedded in the prototype as an `<iframe src="./dotted-map.html">`. In Next.js this becomes a client component rendering the map inline (see `dotted-map.html` for the dot grid and marker data).

### 8. Key highlights
H2 "Key highlights" + mono hint "TAP A CARD TO EXPAND". A row of cards; `hl` state tracks which is expanded (one at a time, `-1` = none).

### 9. Team
Centered H2 "Meet the Team / Behind Halyx". Grid `repeat(auto-fit,minmax(240px,1fr))`, `gap:22px`, cards `aspect-ratio:3/4`, radius 22px, glass. **Portrait photography is not yet supplied** — the cards currently carry gradient/placeholder treatments. Wire them to a real image field.

### 10. How We Think — `#halyx-ai`
Centered: mono eyebrow "CORE BELIEFS", H2 "How We Think", intro "We don't just build products — we build momentum. Four principles decide what we take on and how we run it." Four principle cards; `belief` state tracks the open one.

### 11. Let's talk
Two columns. Left: pill "Get Started", H2 "Let's build your next intelligent product", a 64×1px rule, and "Turn your vision into a system that ships, scales, and **stands out**."
Right: H3 "Let's talk" and the form — four underline inputs in a `repeat(auto-fit,minmax(200px,1fr))` grid (`Full name`, `Company`, `Email` type=email, `Phone` type=tel), each `padding:10px 2px 12px; border:0; border-bottom:1px solid rgba(255,255,255,0.16); background:transparent`. Then "I'm interested in" and five selectable interest pills (`interest` state, single-select; selected state changes border, background and text color). Then a 3-row `textarea` "Tell us more about your project!" on the same underline treatment, and a full-width pill submit "SEND →" (20px vertical padding).
**Not wired.** No validation, no submit handler, no success/error state in the prototype — see "What still needs deciding".

### 12. Closing CTA — `#contact`
Single bordered panel, radius 24px, `padding:clamp(32px,5vw,64px)`, gradient fill, with its own particle canvas behind. H2 "We turn bold ideas into / powerful digital realities." + pill CTA.

### 13. Footer
Four columns (`repeat(auto-fit,minmax(210px,1fr))`, `gap:clamp(28px,4vw,60px)`, container 1760px): **ABOUT US**, **SERVICES**, **OTHER SERVICES**, **GET IN TOUCH** (with an underlined "Contact" link). Column links are `clamp(16px,1.55vw,21px)`, `#e8e8ef`, hover `#fff` + text-shadow glow. Closes with a large `HALYX` wordmark (behind the `showFooterWordmark` prop).

---

## Overlays

### Scroll toast (fixed bottom-left, `z-index:115`)
`width:min(330px, calc(100vw - 28px))`, glass at `rgba(12,12,18,0.86)`, radius 18px, `hx-shine` sweep, an icon tile with an `hx-ring` pulse, and an `hx-bar` progress bar that scales out over the dismiss timer. **Fires once, on entering the Case Studies section** (`[data-casestudies]`), gated at ~20% scroll. It must not fire on portrait hover or chat open — that was a bug and is now scoped.

### Chat assistant (fixed bottom-right, `z-index:120`)
Appears at ~30% scroll (`botDock`). States: `botOpen`, `botMin` (minimized), `botMax` (expanded), plus a **draggable** dock (pointer drag with a `moved` flag so a drag never counts as a click). Body height animates via `max-height` + opacity, `.42s cubic-bezier(.16,.84,.24,1)`. Log is a scrolling column (`gap:10px`) of bubbles aligned left (bot) / right (user); input placeholder "Ask about services, work, timelines…" with a 38px send button, Enter to send.
Replies come from `KB` — an array of `{ k: string[], a: string }` matched by keyword against the lowercased question, first hit wins, with a greeting fallback. Topics covered: what Halyx is, services, founding/history, clients/industries, case studies, contact, timelines, tech stack, support/SLA, greeting. **This is a canned matcher, not an LLM.** If the real site should use a model, that is a product decision — the prototype's copy is a good system-prompt seed either way.

### Case modal (`z-index:200`)
Backdrop `rgba(4,4,7,0.74)` + `blur(14px)`, panel `min(680px,100%)`, `max-height:100%`, own scroll, 1px gradient border, body `rgba(10,10,16,0.95)`. Header: mono "LIVE · {host}" in mint, H3 name, category, tag pills. Body: Problem, What we built, and a facts table of `[label, value]` pairs, plus the live URL. Opened from either case-study column; `caseIdx` state, `-1` closed. Backdrop click closes.

### Video modal (`z-index:210`)
Backdrop `rgba(4,4,7,0.78)` + `blur(16px)`. `<video controls playsinline preload="metadata">`, `max-height:74vh`, source `uploads/Halyx_technologies.mp4`. Opened by the video card. **Pause and reset the element on close** — the prototype does this in `closeVideo`.

---

## Interactions & behavior

**Scroll reveal.** Every `[data-reveal]` element starts hidden (`opacity:0` + a transform/filter) and animates in when an `IntersectionObserver` fires; `data-reveal-delay="<ms>"` staggers siblings (typical steps 60/80/120/140/160/220/240/320/400). One animation family per section, cycled from `VARIANTS = ["rise","rise","rise","slideL","slideR","scale","mask","slideL","rise","blur","slideR","tilt","rise"]` — section N uses variant N, so adjacent sections never enter the same way:

- `rise` — `translateY(24px)` → 0
- `slideL` / `slideR` — ±40px horizontal
- `scale` — `scale(.94)` → 1
- `mask` — `clip-path` wipe
- `blur` — `filter: blur(10px)` → 0
- `tilt` — small `rotate` + `translateY`

Easing throughout is `cubic-bezier(.16,.84,.24,1)` / `(.16,.9,.24,1)` / `(.16,.94,.24,1)` — a fast-out, long-settle curve. Durations: micro-hovers `.3–.45s`, reveals `.6–.9s`, panel expands `.42s`.

**Hover.** Glass elements shift border to `rgba(188,178,255,0.4–0.7)` and add an accent glow; some lift `translateY(-1px)` or `scale(1.06)`. Marquees pause. Portrait tooltips fade + slide 6px into place.

**Counters.** `[data-counters]` metrics ease from 0 to their target when first visible, `tabular-nums` so digits don't jitter.

**Motion kill-switch.** The `enableMotion` prop (default true) short-circuits reveals. In Next.js, drive this from `prefers-reduced-motion` as well: no marquee, no float, no particle loop, reveals become instant.

**Responsive.** No media queries — everything is `clamp()` plus `repeat(auto-fit, minmax(Xpx, 1fr))`. Known rough edge: around **900px** the Trusted-by grid drops the `span 2` orbit panel onto its own row and leaves an empty cell beside the testimonial card. Fix in the rebuild — collapse that grid to a single column below ~1000px.

## State

Prototype state, all local to the page:

| Key | Type | Meaning |
|---|---|---|
| `svc` | number | Active service row |
| `cs` | number | Case carousel index (auto-advanced on an interval) |
| `person` | number | Hovered testimonial person, `-1` none |
| `ring` | number | Orbit ring shape index |
| `hl` | number | Expanded highlight card, `-1` none |
| `belief` | number | Expanded principle, `-1` none |
| `interest` | number | Selected contact-form interest pill |
| `botOpen` / `botMin` / `botMax` / `botDock` | boolean | Chat visibility, minimized, expanded, docked-in |
| `toast` | boolean | Toast shown |
| `caseIdx` | number | Open case modal, `-1` closed |
| `quote` | number | Open portrait tooltip, `-1` none |
| `videoOpen` | boolean | Video modal |
| `counts` | number[3] | Hero counter values |
| `msgs` | `{who,text}[]` | Chat transcript |

Props (host-tweakable in the prototype; make them component props or config in Next.js): `enableMotion` (boolean, true), `particleDensity` (range 300–3500, step 100, default 1500), `showHeroStats` (boolean, true), `showFooterWordmark` (boolean, true).

No data fetching. Everything is local constants: `PROJECTS`, `REVIEWS`, `PEOPLE`, `CASES`, `KB`, `SHAPES`, `GLYPHS`, `VARIANTS`, `ACCENT`.

---

## Target: Next.js

Suggested shape (App Router, TypeScript):

```
app/
  layout.tsx            fonts (next/font/google), <html lang> , global CSS, metadata
  page.tsx              server component: composes the sections in order
  globals.css           resets, ::selection, @keyframes (hx-*), CSS variables for tokens
components/
  Nav.tsx               server
  Hero.tsx              server shell + <HeroPills/> client, <Counters/> client
  Services.tsx          client (svc state)
  CaseStudies.tsx       server list + <CaseMarquee/> client, opens <CaseModal/>
  TrustedBy.tsx         server shell
    OrbitPanel.tsx      client (hover tooltips, z-index juggling)
    TestimonialRail.tsx client only if you need pause-on-hover in JS; CSS-only is fine
  Story.tsx             client (DottedMap)
  Highlights.tsx        client (hl state)
  Team.tsx              server
  Beliefs.tsx           client (belief state)
  ContactForm.tsx       client (server action for submit)
  ClosingCTA.tsx        server shell + <ParticleCanvas/> client
  Footer.tsx            server
  overlays/
    ParticleCanvas.tsx  client, canvas + rAF
    ScrollToast.tsx     client
    ChatDock.tsx        client
    CaseModal.tsx       client
    VideoModal.tsx      client
  Reveal.tsx            client wrapper: <Reveal variant="rise" delay={140}>
lib/
  projects.ts  reviews.ts  kb.ts  people.ts   (the constant arrays, typed)
public/
  media/…      the images and mp4 from uploads/
```

Notes for the smooth/fast goal the design is being ported for:

- Keep the page a **server component**; push `'use client'` down to the smallest leaves (the eight or so above). Most sections are static markup.
- Fonts through `next/font/google` (`Instrument_Sans`, `JetBrains_Mono`) with `display: swap` — no render-blocking `<link>`, no layout shift.
- Images through `next/image` with explicit `sizes`; the case-study screenshots are the heaviest payload. Mark the hero-adjacent ones `priority`, everything else lazy. Consider `blurDataURL` placeholders.
- The showcase video: `preload="metadata"` only, and only mount `<video>` when the modal opens.
- **Animate only `transform`, `opacity`, and `filter`.** Every animation in the design already respects this. Set `will-change` on marquee tracks and reveal targets, and remove it once settled.
- One `requestAnimationFrame` loop for the whole page (the prototype does this) — never one per element. Cancel on unmount, and skip work when `document.hidden`.
- Marquees are pure CSS (`hx-vmarquee` + duplicated list + `animation-play-state` on hover) — no JS scroll listeners needed.
- Reveal via a single shared `IntersectionObserver` in a context/hook, not one observer per element.
- `backdrop-filter` is the expensive property here. It appears on many surfaces; keep the blurred elements small, avoid stacking two blurs, and drop `backdrop-filter` under `prefers-reduced-motion`/low-end heuristics if profiling shows compositor pressure.
- Honor `prefers-reduced-motion: reduce`: no particle loop, no marquee, no float, reveals apply their end state immediately.
- The particle canvas should be DPR-aware (`canvas.width = w * devicePixelRatio`), resize-observed, and capped — 1500 points is the design default, but scale down on small viewports.

## Assets

All in `uploads/` in this bundle; move to `public/media/`.

| File | Use |
|---|---|
| `Halyx_technologies.mp4` | Showcase film in the video modal (~10s) |
| `Maiku-AI-Desktop-App-Full-Window.png` | Case card — Maiku AI |
| `floorplan generation.png` | Case card — ArchitectXpert (URL-encode the space, or rename) |
| `pasted-1788915580017-0.png` | Case card — H&B Event Solution |
| `axiom.png` | Case card — Axiom |
| `pasted-1788915800850-0.png` | Case card — Cartesia Assistant |
| `pasted-1788910804450-0.png` | Orbit portrait 1 (CTO · Curalink) |
| `pasted-1788911027223-0.png` | Orbit portrait 2 (Loius Walker, VP Eng · Nortex) |
| `pasted-1788911118734-0.png` | Orbit portrait 3 (Lovie Hardin, Head of Data · Vantiq) |
| `pasted-1788911211545-0.png` | Orbit portrait 4 (COO · Bluepeak) |
| `pasted-1788911385788-0.png` | Orbit portrait 5 (Thais Miranda, Product · Synergise4) |

The portraits are placeholder stand-ins from the design process — **replace with real client photography or drop the faces** before launch. Team card photography is still missing entirely. No icon library is used: every glyph (chat icon, play triangle, equalizer, service marks, canvas shapes) is hand-built from divs, SVG, or canvas paths.

## Files in this bundle

| File | What it is |
|---|---|
| `Halyx Homepage.dc.html` | The full design reference. Opens in any browser. All markup, styles (inline), and logic. |
| `support.js` | The prototype's runtime. Needed only to open the reference file; **do not port**. |
| `dotted-map.html` | The Our Story dotted world map, embedded as an iframe in the reference. Port its dot grid and marker data into a React component. |
| `uploads/` | Images and video listed above. |

Useful line anchors in `Halyx Homepage.dc.html`: keyframes ~14–41 · overlays 46–196 · nav 197–212 · hero 213–269 · services 270–448 · case studies 449–497 · trusted by 498–681 · story 682–700 · highlights 701–757 · team 758–809 · how we think 810–866 · let's talk 867–920 · closing CTA 921–934 · footer 935–1004 · data constants 1006–1221 · logic class 1222–end.

## What still needs deciding

1. **Contact form backend.** No endpoint, validation, or success/error state exists. Needs a server action, field validation, spam protection, and a submitted state.
2. **Chat assistant.** Canned keyword matcher today. Real LLM, or keep it scripted?
3. **Real photography.** Client portraits are placeholders; team photos are missing.
4. **Testimonial attribution.** The six reviews are written copy, not yet approved client quotes. Confirm names, titles, and permission before launch.
5. **The ~900px grid gap** in Trusted by (see Responsive).
6. **Analytics, cookie/consent, and SEO metadata** are entirely absent from the prototype.
