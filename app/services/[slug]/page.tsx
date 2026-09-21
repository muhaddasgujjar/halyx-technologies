import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { PROJECTS } from "@/lib/projects";
import {
  SERVICE_PAGES,
  SERVICE_PAGES_BY_SLUG,
  serviceFor,
  type ServicePage,
} from "@/lib/service-pages";
import { SITE } from "@/lib/site";
import styles from "./page.module.css";

/**
 * One indexable page per practice.
 *
 * Statically generated from `SERVICE_PAGES`, so adding a practice is a data
 * edit rather than a new route. Every one of these was previously an anchor on
 * the homepage, which is why the site ranked for nothing commercial: an anchor
 * is not a URL, and Google saw a single document about five different things.
 *
 * Each page emits its own `Service` and `FAQPage` JSON-LD. The FAQ markup is
 * the cheapest rich result available on a page like this, and the answers are
 * the ones a scoping call actually opens with.
 */

export function generateStaticParams() {
  return SERVICE_PAGES.map((p) => ({ slug: p.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const page = SERVICE_PAGES_BY_SLUG.get(slug);
  if (!page) return {};

  const url = `${SITE.url}/services/${page.slug}`;

  return {
    title: page.seoTitle,
    description: page.seoDescription,
    alternates: { canonical: `/services/${page.slug}` },
    openGraph: {
      type: "article",
      url,
      siteName: SITE.name,
      title: `${page.seoTitle} — ${SITE.name}`,
      description: page.seoDescription,
    },
  };
}

function ProofBlock({ page }: { page: ServicePage }) {
  const shown = PROJECTS.filter((p) => page.proof.includes(p.name));
  if (shown.length === 0) return null;

  return (
    <section className={styles.section}>
      <h2 className={styles.h2}>
        {shown.length === 1 ? "Shipped work" : `${shown.length} of these are live right now`}
      </h2>
      <p className={styles.body}>
        Not a portfolio of screenshots — every one of these opens.
      </p>
      <ul className={styles.proofGrid}>
        {shown.map((p) => (
          <li key={p.name} className={styles.proofCard}>
            <h3 className={styles.proofName}>{p.name}</h3>
            <p className={styles.proofCat}>{p.cat}</p>
            <p className={styles.proofNote}>{p.solution}</p>
            <a
              href={p.url}
              className={styles.proofLink}
              target="_blank"
              rel="noopener noreferrer"
            >
              {p.host} &#8599;
            </a>
          </li>
        ))}
      </ul>
    </section>
  );
}

export default async function ServiceDetailPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const page = SERVICE_PAGES_BY_SLUG.get(slug);
  if (!page) notFound();

  const service = serviceFor(page);
  const url = `${SITE.url}/services/${page.slug}`;
  const others = SERVICE_PAGES.filter((p) => p.slug !== page.slug);

  return (
    <main className={styles.main}>
      <div className={styles.inner}>
        <nav className={styles.crumbs} aria-label="Breadcrumb">
          <Link href="/" className={styles.crumb}>
            Halyx Technologies
          </Link>
          <span aria-hidden="true">/</span>
          <span className={styles.crumbCurrent}>{page.title}</span>
        </nav>

        <p className={`${styles.eyebrow} hx-mono`}>
          {service.num} &nbsp;·&nbsp; {page.title.toUpperCase()}
        </p>
        <h1 className={styles.h1}>{page.h1}</h1>
        <p className={styles.lede}>{page.lede}</p>

        <div className={styles.ctaRow}>
          <Link href="/#contact" className={styles.primary}>
            Book a scoping call
          </Link>
          <span className={styles.ctaNote}>
            Free, and it ends with a range or a straight no.
          </span>
        </div>

        <ul className={styles.capabilities}>
          {service.services.map((s) => (
            <li key={s} className={styles.capability}>
              {s}
            </li>
          ))}
        </ul>

        {page.sections.map((section) => (
          <section key={section.heading} className={styles.section}>
            <h2 className={styles.h2}>{section.heading}</h2>
            <p className={styles.body}>{section.body}</p>
            {section.points && (
              <div className={styles.points}>
                {section.points.map((pt) => (
                  <div key={pt.heading} className={styles.point}>
                    <h3 className={styles.h3}>{pt.heading}</h3>
                    <p className={styles.pointBody}>{pt.body}</p>
                  </div>
                ))}
              </div>
            )}
          </section>
        ))}

        <ProofBlock page={page} />

        <section className={styles.section}>
          <h2 className={styles.h2}>What we build on</h2>
          <ul className={styles.stack}>
            {service.stack.map((s) => (
              <li key={s} className={styles.stackItem}>
                {s}
              </li>
            ))}
          </ul>
          <p className={styles.body}>
            Halyx is not religious about the stack — it picks what your team can
            maintain — but these are the defaults it is fastest and safest in.
          </p>
        </section>

        <section className={styles.section}>
          <h2 className={styles.h2}>Questions we get asked first</h2>
          <dl className={styles.faq}>
            {page.faqs.map((f) => (
              <div key={f.q} className={styles.faqItem}>
                <dt className={styles.faqQ}>{f.q}</dt>
                <dd className={styles.faqA}>{f.a}</dd>
              </div>
            ))}
          </dl>
        </section>

        <section className={styles.section}>
          <h2 className={styles.h2}>The other four practices</h2>
          <ul className={styles.related}>
            {others.map((o) => (
              <li key={o.slug}>
                <Link href={`/services/${o.slug}`} className={styles.relatedLink}>
                  {o.title}
                </Link>
              </li>
            ))}
          </ul>
        </section>

        <section className={styles.closing}>
          <h2 className={styles.closingH2}>Talk to the people who would build it</h2>
          <p className={styles.body}>
            The first conversation is a scoping call, not a pitch: what you are
            trying to move, what already exists, what the constraint is. It ends
            with either a range and a proposed first step, or a straight answer
            that Halyx is not the right fit.
          </p>
          <div className={styles.ctaRow}>
            <Link href="/#contact" className={styles.primary}>
              Start a conversation
            </Link>
            <a href={`mailto:${SITE.email}`} className={styles.secondary}>
              {SITE.email}
            </a>
          </div>
        </section>
      </div>

      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            "@context": "https://schema.org",
            "@graph": [
              {
                "@type": "Service",
                "@id": `${url}#service`,
                name: page.title,
                serviceType: page.seoTitle,
                description: page.seoDescription,
                url,
                provider: { "@id": `${SITE.url}/#organization` },
                hasOfferCatalog: {
                  "@type": "OfferCatalog",
                  name: `${page.title} capabilities`,
                  itemListElement: service.services.map((s) => ({
                    "@type": "Offer",
                    itemOffered: { "@type": "Service", name: s },
                  })),
                },
              },
              {
                "@type": "FAQPage",
                "@id": `${url}#faq`,
                mainEntity: page.faqs.map((f) => ({
                  "@type": "Question",
                  name: f.q,
                  acceptedAnswer: { "@type": "Answer", text: f.a },
                })),
              },
              {
                "@type": "BreadcrumbList",
                itemListElement: [
                  { "@type": "ListItem", position: 1, name: "Home", item: SITE.url },
                  { "@type": "ListItem", position: 2, name: page.title, item: url },
                ],
              },
            ],
          }),
        }}
      />
    </main>
  );
}
