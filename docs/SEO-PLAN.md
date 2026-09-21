# Halyx Technologies — SEO execution plan

**Written 2026-09-21.** Companion to `PRE-LAUNCH-CHECKLIST.md`, which covers the
technical foundation this plan assumes.

## Three facts this plan is built on

1. **The site was `noindex` until 2026-09-21.** `NEXT_PUBLIC_SITE_URL` was never
   set in Vercel production, so `IS_INDEXABLE` was false and the site served
   `noindex, nofollow` on every page plus a blanket `Disallow: /`. Google has
   never crawled it. Every timeline below counts from that date.
2. **The domain is new.** First commit 2026-09-09, first production deploy about
   ten days later. No backlinks, no reviews, no history.
3. **The commercial pages did not exist until this plan shipped them.** The five
   practices lived behind `#services`, an anchor rather than a URL — so Google
   saw one document about five different things and could rank it for none of
   them. `/services/[slug]` now exists; see "What has been built" below.

**Assumption to confirm:** remote-first, targeting US and UK B2B buyers in
English. Geography could not be derived from the repo — `lib/hubs.ts` lists
eight regions but they read as coverage claims, not offices. **If Halyx has a
registered office anywhere, Phase 5 changes substantially** — local packs are
far less competitive than national commercial terms and would be the fastest
route to page one.

---

## Phase 1 — Keyword strategy

Difficulty is judged against this domain at DR~0, not in the abstract.

| # | Keyword | Intent | Difficulty | Target page |
|---|---|---|---|---|
| 1 | AI agent development company | Commercial | High | `/services/ai-machine-learning` ✅ |
| 2 | LLM application development services | Commercial | High | `/services/ai-machine-learning` ✅ |
| 3 | hire AI developers for startups | Transactional | Medium | **To build:** `/hire/ai-developers` |
| 4 | custom voice AI assistant development | Commercial | Medium | `/services/business-automation` ✅ |
| 5 | RAG chatbot development services | Commercial | Medium | `/services/ai-machine-learning` ✅ |
| 6 | MLOps consulting services | Commercial | Medium | `/services/ai-machine-learning` ✅ |
| 7 | custom software development company | Commercial | High | `/services/custom-software` ✅ |
| 8 | legacy system modernisation services | Commercial | Medium | `/services/custom-software` ✅ |
| 9 | business process automation consultants | Commercial | Medium | `/services/business-automation` ✅ |
| 10 | document intelligence solutions | Commercial | Medium | `/services/business-automation` ✅ |
| 11 | AI development agency vs in-house team | Commercial | Low | **To build:** `/compare/ai-agency-vs-in-house` |
| 12 | LangGraph vs LangChain for production agents | Informational | Low | Blog pillar |
| 13 | cost to build an AI agent | Commercial | Medium | **To build:** `/pricing/ai-agent-cost` |
| 14 | AI proof of concept to production | Informational | Medium | Blog pillar |
| 15 | real-time voice agent latency optimization | Informational | Low | Blog pillar |

**Why AI-weighted.** Generic dev-agency terms are the most saturated queries in
B2B tech and this DR cannot touch them. The genuine differentiator is five
live, clickable products — Maiku AI, ArchitectXpert, Axiom, Cartesia Assistant,
H&B Event Solution. Very few agencies at this stage can link working software.

### Quick wins — 30–60 days

All five are already solved problems sitting in this repo, with the reasoning
written in the code comments. Cheapest credible content available.

| Keyword | Source in this repo |
|---|---|
| `named LiveKit worker vs auto dispatch` | `scripts/check-agent-name.mjs` and its header comment |
| `Windows Display Affinity screen capture exclusion` | Maiku AI; described in `lib/projects.ts` |
| `Groq model decommissioned production` | `checkModel()` in the chat route |
| `Next.js robots.txt noindex on Vercel production` | `lib/site.ts`, `app/robots.ts`, and the bug fixed on 2026-09-21 |
| `LiveKit agent not joining room silently` | `docs/DEPLOY.md`, the silent-empty-room failure |

These attract developers rather than buyers. That is the point: they rank fast
and build the authority the commercial pages need.

---

## Phase 2 — Technical

Full audit lives in `PRE-LAUNCH-CHECKLIST.md`. SEO-specific items only here.

### Done in this pass

- Indexing switched on; `robots.txt` serves `Allow: /` with host and sitemap.
- `ProfessionalService` JSON-LD on the homepage with a stable
  `@id` (`/#organization`), founders, `knowsAbout`, `hasOfferCatalog` and
  `sameAs`. No `address` (entity unsettled) and no `aggregateRating` (no
  reviews — inventing it is a manual action, not a grey area).
- `Service` + `FAQPage` + `BreadcrumbList` JSON-LD on every practice page.
- Sitemap: 8 URLs. `/voice` deliberately excluded — it is a test surface and
  sets `noindex`.
- Homepage title changed from the tagline to the category. *"We Build
  Intelligent Systems That Matter"* is good positioning and a poor title tag:
  no term in it is one anyone searches for.
- Map lazy-loaded (`next/dynamic`, `ssr: false`). Smaller win than estimated:
  `world-atlas` was never bundled (`DottedMap` fetches the topojson at runtime),
  so this split out ~10 KB gzipped of `d3-geo`/`topojson-client` and deferred a
  106 KB JSON fetch. Worth doing; not the 100 KB+ first claimed.

### Still open

| Priority | Item |
|---|---|
| **P0** | Google Search Console — Domain property, DNS TXT. `docs/DEPLOY.md` §4 |
| ~~P1~~ | ~~Lazy-load the LiveKit client~~ — **already deferred.** The 601 KB chunk is not on the homepage; `VoiceAgent` is only on `/voice` |
| **P1** | Downsize `public/media` portraits — 3 × ~2 MB PNGs, should be ~1200px WebP |
| **P1** | Lighthouse on **mobile**, throttled, against production. Initial payload measured at 387 KB compressed across 12 scripts |
| **P2** | `/hire/ai-developers`, `/compare/ai-agency-vs-in-house`, `/pricing/ai-agent-cost` |
| **P2** | `/work/[slug]` case-study routes — currently `#work` anchors only |
| **P2** | Blog infrastructure; none exists |

---

## Phase 3 — On-page blueprint

Implemented at `/services/ai-machine-learning`. Chosen over the homepage
deliberately: the homepage should own brand and category, and cannot rank for a
specific service while also carrying five practices, a team and a voice demo.

| Element | Shipped value |
|---|---|
| Title | `AI Agent Development Company — Halyx Technologies` |
| Description | Leads with "not demos", the four live systems, and the two-day reply |
| H1 | `AI agent development that reaches production` |
| H2s | What we build · Why most agents never reach production · How an engagement runs · Live work · Stack · FAQ · Other practices |
| Schema | `Service` + `FAQPage` + `BreadcrumbList` |

**Internal links in, as built:** homepage Services section (the cards are
carousel buttons and cannot contain links, so a separate "Read in full" row
carries the real anchors), plus the footer Services column. Both point at all
five practice pages. Future case-study and blog pages should link in with
varied anchor text — exact-match no more than once per source page.

---

## Phase 4 — 90-day content roadmap

| # | Wk | Article | Keyword | Angle | Funnel |
|---|---|---|---|---|---|
| 1 | 1–2 | The LiveKit Agent That Joins a Room Nobody Else Is In | `named LiveKit worker vs auto dispatch` | Page 1 is docs fragments and unanswered issues. Publish the build-time guard — a preventive fix nobody else has | TOF |
| 2 | 2–3 | Hiding a Window from Screen Capture on Windows | `Windows Display Affinity screen capture exclusion` | Near-zero competition, shipped in Maiku AI. The ethics section is what earns the editorial link | TOF |
| 3 | 4–5 | Your Groq Model Will Be Decommissioned | `Groq model decommissioned production` | Existing results are changelogs, not solutions. Ship `checkModel()` as copy-paste | TOF |
| 4 | 6–7 | What an AI Agent Actually Costs to Build | `cost to build an AI agent` | Page 1 hides behind "it depends". Publish real ranges by scope tier. Specificity is the whole play | **BOF** |
| 5 | 8–10 | From PoC to Production: Why Most AI Pilots Die | `AI proof of concept to production` | Competitors write Gartner-citing think-pieces. Write five post-mortems from five shipped systems | MOF |
| 6 | 11–13 | Agency vs In-House: An Honest Comparison | `AI development agency vs in-house team` | Every competitor concludes "hire an agency". Genuinely recommend in-house where it wins — that is what gets cited | **BOF** |

Do not reorder. Articles 1–3 rank fast and build the DR that 4–6 need.

---

## Phase 5 — Off-page

### Directories

| Platform | Status |
|---|---|
| **Clutch.co** | **Blocked** — requires verified client reviews and there are none. Highest ROI item on this page and it cannot start today |
| Crunchbase | Claim now; free, no reviews needed |
| GoodFirms | Lower barrier than Clutch; do while reviews accumulate |
| LinkedIn company page | ✅ Live, linked via `sameAs` |
| GitHub org | Maiku AI core is open source — devs check this before enquiring |

### PR angles

1. **"The software built not to be seen."** Maiku AI's Display Affinity
   exclusion is newsworthy *and* contentious. Pitch tech-ethics and
   future-of-work desks. Publish an actual position — hedging kills it.
2. **"We removed every number from our website."** The invented metrics
   (`60+`, `99.9%`, `4x`) were deleted on 2026-09-21 and replaced with counts
   derived from live data. A page that cannot state a number it can't prove.
3. **"Our AI agent tells prospects what we can't do."** The RAG corpus now
   instructs the assistant to decline to invent figures. The live demo is the
   proof, which is what makes it linkable.

All three are true, verifiable in ten seconds, and cannot be copied without
doing the work.

---

## Honest expectations

- Quick wins (Phase 1, second table): **30–60 days**, realistic.
- Commercial head terms (Phase 1, rows 1–10): **9–18 months**, and only with
  the remaining pages built and links earned.
- **The real bottleneck is not SEO.** No case studies, no testimonials, no
  client reviews. That blocks Clutch, weakens every service page and caps
  conversion on whatever traffic this plan produces. Two real client reviews
  would move revenue more in 90 days than half of Phase 4.

---

## What has been built

`/services/[slug]`, statically generated from `lib/service-pages.ts` — five
pages, each with its own title, description, canonical, long-form copy, FAQ,
live-work proof block and JSON-LD. Two integrity guards run at module load, so
a page whose title drifts from `SERVICES`, or which cites a project not in
`PROJECTS`, fails the build rather than shipping.
