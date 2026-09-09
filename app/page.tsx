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
import { ContactForm } from "@/components/ContactForm";
import { ClosingCTA } from "@/components/ClosingCTA";
import { Footer } from "@/components/Footer";
import { PROJECTS } from "@/lib/projects";
import { SITE } from "@/lib/site";

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
