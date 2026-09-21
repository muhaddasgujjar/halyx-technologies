import { SiteProvider } from "@/components/SiteProvider";
import { ParticleCanvas } from "@/components/overlays/ParticleCanvas";
import { ScrollToast } from "@/components/overlays/ScrollToast";
import { ChatDock } from "@/components/overlays/ChatDock";
import { CaseModal } from "@/components/overlays/CaseModal";
import { VideoModal } from "@/components/overlays/VideoModal";
import { Nav } from "@/components/Nav";
import { Hero } from "@/components/Hero";
import { Services } from "@/components/Services";
import { CaseStudies } from "@/components/CaseStudies";
import { TrustedBy } from "@/components/TrustedBy";
import { Story } from "@/components/Story";
import { Highlights } from "@/components/Highlights";
import { Team } from "@/components/Team";
import { Beliefs } from "@/components/Beliefs";
import { HalyxAI } from "@/components/halyx-ai/HalyxAI";
import { ContactForm } from "@/components/ContactForm";
import { ClosingCTA } from "@/components/ClosingCTA";
import { Footer } from "@/components/Footer";
import { PROJECTS } from "@/lib/projects";
import { SERVICE_PAGES } from "@/lib/service-pages";
import { SERVICES } from "@/lib/services";
import { TEAM } from "@/lib/content";
import { SITE, SOCIAL_LINKS } from "@/lib/site";

/**
 * One continuous scroll. `<SiteProvider>` holds the handful of pieces of state
 * that cross section boundaries; everything else is local, and the sections
 * that need no interactivity stay server components.
 */
export default function HomePage() {
  return (
    <SiteProvider>
      <ParticleCanvas />

      <ScrollToast />
      <ChatDock />
      <VideoModal />
      <CaseModal />

      <Nav />

      <main>
        <Hero />
        <Services />
        <CaseStudies />
        <TrustedBy />
        <Story />
        {/*
          Straight after the story, not before the contact form.
          The story is where a visitor decides the studio is real; the agent is
          the proof, and it lands hardest while that is still the last thing
          they read. Down at the bottom it was competing with the CTA it was
          supposed to feed.
        */}
        <HalyxAI />
        <Highlights />
        <Team />
        <Beliefs />
        <ContactForm />
        <ClosingCTA />
      </main>

      <Footer />

      <script
        type="application/ld+json"
        /*
         * The studio as a single entity, with a stable `@id` the practice
         * pages point their `provider` at — so the five service pages and this
         * one describe one organisation rather than six unrelated ones.
         *
         * Two deliberate omissions. There is no `address` or `areaServed`,
         * because the registered entity is not settled (see /privacy) and a
         * wrong address is worse than none. There is no `aggregateRating`,
         * because there are no reviews — review markup without reviews is a
         * manual action, not a grey area.
         */
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "ProfessionalService",
            "@id": `${SITE.url}/#organization`,
            name: SITE.name,
            alternateName: "Halyx",
            description: SITE.description,
            slogan: SITE.tagline,
            url: SITE.url,
            email: SITE.email,
            logo: {
              "@type": "ImageObject",
              url: `${SITE.url}/icon.svg`,
            },
            image: `${SITE.url}/opengraph-image`,
            // Named people are the strongest experience signal this site has.
            founder: TEAM.filter((m) => m.linkedin).map((m) => ({
              "@type": "Person",
              name: m.name,
              jobTitle: m.title,
              sameAs: m.linkedin,
            })),
            knowsAbout: SERVICES.flatMap((s) => s.services),
            // Ties the official profiles to this domain, so a search engine
            // treats them as the same entity rather than look-alikes.
            sameAs: SOCIAL_LINKS.map((s) => s.url),
            contactPoint: {
              "@type": "ContactPoint",
              contactType: "sales",
              email: SITE.email,
            },
            hasOfferCatalog: {
              "@type": "OfferCatalog",
              name: `${SITE.name} services`,
              itemListElement: SERVICE_PAGES.map((p) => ({
                "@type": "Offer",
                itemOffered: {
                  "@type": "Service",
                  name: p.title,
                  description: p.seoDescription,
                  url: `${SITE.url}/services/${p.slug}`,
                },
              })),
            },
            makesOffer: PROJECTS.map((p) => ({
              "@type": "Offer",
              itemOffered: { "@type": "SoftwareApplication", name: p.name, url: p.url },
            })),
          }),
        }}
      />
    </SiteProvider>
  );
}
