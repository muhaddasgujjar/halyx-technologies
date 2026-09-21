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

**Confirmed 2026-09-21:** the studio is in **Lahore, Pakistan**, selling mostly
to the **US, UK and Gulf**. Phase 5 is written around that and is the section
to read first — it is the part of this plan that geography changes most.
`LOCATION` in `lib/site.ts` now carries the city and the export markets, and
the homepage schema states them.

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

## Phase 5 — Off-page, geography and authority

**Confirmed 2026-09-21: the studio is in Lahore, Pakistan, selling mostly to
the US, UK and Gulf.** That combination decides everything in this phase, and
it is not the same problem as an agency competing at home.

### The thing to understand before spending a rupee

**There is no global ranking.** Google returns a different first page for the
same query in Lahore, London, New York and Dubai. "AI development company"
searched in Chicago returns Chicago agencies, because Google reads commercial
intent as local intent and weights proximity, local links and local reviews
heavily. A Lahore studio is not competing against US agencies on merit in that
SERP — it is competing against a localisation signal it does not have.

So the goal "appear on page one anywhere in the world" splits into three
different problems, only one of which is winnable quickly:

| Query type | Localised? | Page 1 worldwide? |
|---|---|---|
| Technical / informational — `named LiveKit worker vs auto dispatch` | **No.** Same results everywhere | **Yes, and fast.** The genuine global play |
| Offshore-intent commercial — `hire AI developers Pakistan` | Weakly | **Yes**, 3–6 months |
| Local-intent commercial — `AI development company` in a US city | **Heavily** | **No**, not without years of authority and US links |

The honest route to worldwide page-one presence is therefore **the technical
content in Phase 4**, not the commercial terms. A post about excluding a window
from screen capture ranks identically in Lahore and Los Angeles, because Google
has no local intent to satisfy. That is how a studio this size gets seen
globally, and it is the same reason the Phase 4 order is not negotiable.

### 5a. Lahore local — fastest wins available, and mostly not about revenue

Local competition in Lahore is far weaker than any international SERP, so this
ranks in weeks rather than quarters. Treat it as a **credibility and recruiting
asset**: a verified local presence is also what US buyers check when deciding
whether an offshore studio is real.

**Google Business Profile — do this first.**

- Category: *Software company*. Secondary: *Website designer*, *Business to
  business service*.
- **Needs a real, verifiable address in Lahore.** Postcard verification to a
  physical location. Do not invent one and do not use a virtual office — a
  suspended profile is much harder to recover than a slow one is to build.
- Set a **service area** covering Lahore and Punjab, plus the export countries.
- Post the Phase 4 articles to GBP Posts. Almost no Pakistani software house
  does this, and it is a live ranking signal.
- Add the five practice pages as GBP **Services**, named exactly as
  `/services/[slug]`.

**Lahore keyword set** — add to Phase 1, all Low difficulty:

| Keyword | Target |
|---|---|
| software company in Lahore | Homepage + GBP |
| AI development company Lahore | `/services/ai-machine-learning` |
| custom software development Lahore | `/services/custom-software` |
| mobile app development company Lahore | `/services/web-mobile-apps` |
| best software house in Lahore | Homepage |

**NAP consistency is the whole game locally.** Name, address and phone must be
byte-identical everywhere. Note the site currently publishes **no phone number
and no address** — both are needed before citations are worth building, and
`LOCATION` in `lib/site.ts` is where they belong so every surface reads one
source.

**Pakistani citation sites:**

| Site | Why |
|---|---|
| Google Business Profile | Non-negotiable, do first |
| Pakistan Software Houses Association **(P@SHA)** | A credibility signal for export buyers, not just a link |
| Pakistan Software Export Board **(PSEB)** registration | Government listing; also unlocks export incentives, and serious Gulf buyers verify it |
| Bing Places | Trivial, and Bing localises less aggressively — useful for export queries |
| Rozee.pk employer profile | High-authority Pakistani domain, and it doubles as recruiting |
| LinkedIn company page | Already live — set the location to Lahore |

### 5b. Export authority — where the revenue actually is

| Platform | Priority | Note |
|---|---|---|
| **Clutch.co** | **Highest** | Has dedicated *Pakistan* and *Lahore* leaderboards where competition is a fraction of the US board. **Still blocked on client reviews — there are none.** The single highest-ROI unstarted item |
| **PSEB** | High | Registration gives export credibility a directory link cannot |
| GoodFirms | High | Strong Pakistani agency presence; lower barrier than Clutch |
| Crunchbase | Medium | Free, no reviews needed, feeds brand SERPs — claim today |
| GitHub org | Medium | Maiku AI core is open source. For an offshore studio this is the strongest possible "we can actually build" signal, and it is free |
| Upwork / Toptal agency profile | Medium | Worth it at this stage as a lead channel rather than a link |

**The offshore-intent keyword set** — where commercial terms are genuinely
winnable, because the searcher is explicitly looking outside their own country
and Google stops localising:

| Keyword | Difficulty |
|---|---|
| hire AI developers Pakistan | Low |
| offshore AI development team | Medium |
| software development outsourcing Pakistan | Low |
| dedicated development team Pakistan | Low |
| Pakistan software house for US clients | Low |

Build these into `/hire/ai-developers` (already on the P2 list) rather than
scattering them across the practice pages.

**Do not hide where you are.** The instinct for an offshore studio is to look
American. It fails twice: you lose the offshore-intent queries above, which are
the winnable ones, and you cannot win the US-local queries anyway. Buyers
searching those terms have already decided to hire offshore — being clearly and
confidently Lahore-based is the match, not the obstacle.

### 5c. Digital PR

The three original angles stand, and Pakistan adds reach rather than replacing
them: Pakistani tech press is markedly easier to place in than US tech press,
and a `.pk` outlet still passes a real editorial link.

1. **"The software built not to be seen."** Maiku AI's Display Affinity
   exclusion — newsworthy and contentious. Pitch tech-ethics and
   future-of-work desks internationally; pitch *TechJuice*, *ProPakistani* and
   *Dawn* business desks domestically.
2. **"We removed every number from our website."** The invented metrics were
   deleted on 2026-09-21 and replaced with counts derived from live data. In a
   market where inflated agency claims are routine, this is a domestic
   business-press story as much as an international one.
3. **"Our AI agent tells prospects what we cannot do."** The RAG corpus now
   refuses to invent figures. The live demo is the proof, which is what makes
   it linkable rather than merely claimed.

**A fourth angle, available only because of the location:** a Lahore studio
shipping a production voice agent with sub-second turn-taking is a story
*ProPakistani* and *TechJuice* will take — and it is the kind of coverage that
makes a US buyer's due-diligence search return something reassuring.

### 5d. Two technical items this location adds

- **Do not use hreflang, and do not move to a `.pk` domain.** `.com` with a
  single English locale is correct for an export business. A ccTLD would
  geo-lock the site to Pakistan, which is the opposite of the goal.
- **Schema now carries `addressLocality: Lahore`, `addressRegion: Punjab` and
  `areaServed`** for the export markets. Street address is still absent on
  purpose: GBP needs a verifiable one, and that is not something to invent.


## Honest expectations

Split by the three query types in Phase 5, because a single timeline across all
of them would be meaningless:

| Target | Realistic timeline |
|---|---|
| Lahore local pack — `software company in Lahore` | **3–8 weeks** after GBP verification. The fastest win available |
| Technical long-tail, worldwide — the Phase 1 quick-wins table | **30–60 days.** Not localised, so page 1 everywhere at once |
| Offshore-intent commercial — `hire AI developers Pakistan` | **3–6 months**, once `/hire/ai-developers` exists |
| International head terms — `AI agent development company` in a US SERP | **12–24 months**, and only with US links and reviews. Possibly never for the most competitive of them, and that is an acceptable answer |

**On ranking page 1 "anywhere in the world":** achievable, but only for queries
Google does not localise — which means the technical content, not the money
terms. See the table at the top of Phase 5. Any agency promising worldwide
page-one for commercial keywords is describing something Google does not
offer.

**The real bottleneck is still not SEO.** No case studies, no testimonials and
no client reviews. That blocks Clutch — including the Pakistan and Lahore
leaderboards, which are the easiest version of it — weakens every service page,
and caps conversion on whatever traffic this plan produces. Two real client
reviews would move revenue more in 90 days than half of Phase 4.

---

## What has been built

`/services/[slug]`, statically generated from `lib/service-pages.ts` — five
pages, each with its own title, description, canonical, long-form copy, FAQ,
live-work proof block and JSON-LD. Two integrity guards run at module load, so
a page whose title drifts from `SERVICES`, or which cites a project not in
`PROJECTS`, fails the build rather than shipping.
