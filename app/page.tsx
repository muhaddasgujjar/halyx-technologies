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
        // Search engines get the studio and its shipped work as structured data.
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "Organization",
            name: SITE.name,
            description: SITE.description,
            url: SITE.url,
            email: SITE.email,
            // Ties the official profiles to this domain, so a search engine
            // treats them as the same entity rather than look-alikes.
            sameAs: SOCIAL_LINKS.map((s) => s.url),
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
