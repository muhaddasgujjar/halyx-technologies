import type { Metadata } from "next";
import Link from "next/link";
import { LEGAL_ENTITY, LOCATION, SITE } from "@/lib/site";
import styles from "../legal.module.css";

/**
 * Website terms of use. NOT the contract for client work — that is a separate
 * MSA and statement of work, and conflating the two is how a website
 * disclaimer ends up being argued over in a delivery dispute. The opening
 * section says so in as many words, deliberately.
 */
export const metadata: Metadata = {
  title: "Terms & Conditions",
  description:
    "The terms governing use of the Halyx Technologies website — what it is, what it is not, and who owns what.",
};

const LAST_UPDATED = "21 September 2026";

export default function TermsPage() {
  return (
    <main className={styles.main}>
      <div className={styles.inner}>
        <Link href="/" className={styles.back}>
          &#8592; Back to Halyx Technologies
        </Link>

        <p className={`${styles.eyebrow} hx-mono`}>LEGAL</p>
        <h1 className={styles.h1}>Terms &amp; Conditions</h1>
        <p className={styles.updated}>Last updated {LAST_UPDATED}</p>

        <p className={styles.gap}>
          <strong>Still outstanding:</strong> the company&rsquo;s SECP incorporation
          number and registered office address are not printed below, because they have
          not been supplied. Both are ordinarily expected. These terms have also not
          been reviewed by a lawyer &mdash; worth one read before the site is promoted
          hard.
        </p>

        <h2 className={styles.h2}>Who you are contracting with</h2>
        <p className={styles.p}>
          This website is operated by{" "}
          <span className={styles.term}>{LEGAL_ENTITY.name}</span>, a company
          incorporated in {LEGAL_ENTITY.jurisdiction} and registered with the{" "}
          {LEGAL_ENTITY.registrar}, based in {LOCATION.city}, {LOCATION.region}.
          &ldquo;Halyx&rdquo;, &ldquo;we&rdquo; and &ldquo;us&rdquo; everywhere below
          mean that company. &ldquo;Halyx Technologies&rdquo; on its own is the trading
          name.
        </p>

        <h2 className={styles.h2}>What these terms cover</h2>
        <p className={styles.p}>
          They govern your use of this <span className={styles.term}>website</span>. They
          are not the contract for client work. If we build something for you, that
          engagement is governed by a separate signed agreement &mdash; a master
          services agreement and a statement of work &mdash; and where that agreement
          and this page disagree, that agreement wins. Nothing here narrows it.
        </p>

        <h2 className={styles.h2}>The site is informational</h2>
        <p className={styles.p}>
          Everything published here &mdash; service descriptions, case studies, team
          information, timelines and indicative figures &mdash; is for information. None
          of it is an offer capable of acceptance, a quotation, or a guarantee of a
          result. A price and a scope become binding only when both sides sign for them.
        </p>
        <p className={styles.p}>
          Descriptions of past work describe what was built for a particular client under
          particular constraints. They are not a promise that your project will go the
          same way.
        </p>

        <h2 className={styles.h2}>The assistants on this page</h2>
        <p className={styles.p}>
          The text and voice assistants are generative AI. They are grounded in the
          studio&rsquo;s own material, but like any such system they can be wrong,
          incomplete, or out of date. Treat what they tell you as a starting point rather
          than a commitment by us, and confirm anything that matters with a person.
          Nothing an assistant says forms a contract or binds the studio.
        </p>
        <p className={styles.p}>
          Please do not paste confidential or personal information about other people
          into them. What happens to what you send is set out in the{" "}
          <Link href="/privacy" className={styles.link}>
            Privacy Policy
          </Link>
          .
        </p>

        <h2 className={styles.h2}>Ownership</h2>
        <p className={styles.p}>
          The design, code, copy, brand marks and imagery on this site belong to us,
          except where a third party&rsquo;s name or mark is shown, which remains
          theirs. You are welcome to read, link to, and quote the site with
          attribution. You may not republish it wholesale, or present it as your own.
        </p>

        <h2 className={styles.h2}>Acceptable use</h2>
        <p className={styles.p}>Please do not:</p>
        <ul className={styles.list}>
          <li>
            Use the enquiry form or the assistants to send unlawful, abusive or
            deliberately misleading content, or unsolicited marketing.
          </li>
          <li>
            Attempt to break, overload, probe or gain unauthorised access to the site or
            anything behind it.
          </li>
          <li>
            Scrape the site at a rate that degrades it for anyone else, or reuse its
            content to train a model without permission.
          </li>
        </ul>
        <p className={styles.p}>
          Found a security problem instead? Please report it to{" "}
          <a href={`mailto:${SITE.email}`} className={styles.link}>
            {SITE.email}
          </a>{" "}
          rather than publishing it, and you will get a straight answer.
        </p>

        <h2 className={styles.h2}>Availability</h2>
        <p className={styles.p}>
          The site is offered as it is. It is not promised to be available without
          interruption or free of errors, and it may change or be taken down at any time.
          The voice assistant in particular depends on third-party services and on
          capacity limits, so it will sometimes be unavailable.
        </p>

        <h2 className={styles.h2}>Liability</h2>
        <p className={styles.p}>
          To the extent the law allows, we are not liable for loss arising from your
          use of this site or reliance on its content, including lost profit,
          lost business or lost data. Nothing here excludes liability that cannot legally
          be excluded &mdash; notably for death or personal injury caused by negligence,
          or for fraud.
        </p>

        <h2 className={styles.h2}>Links out</h2>
        <p className={styles.p}>
          This site links to client projects and to the studio&rsquo;s social profiles.
          Those are run by other people. We do not control them and are not responsible
          for their content.
        </p>

        <h2 className={styles.h2}>Changes to these terms</h2>
        <p className={styles.p}>
          These terms may change. The current version is always the one on this page, and
          the date at the top tells you when it last moved. Continuing to use the site
          after a change means you accept it.
        </p>

        <h2 className={styles.h2}>Governing law and jurisdiction</h2>
        <p className={styles.p}>
          These terms, and any dispute or claim arising out of them or their subject
          matter, are governed by the laws of {LEGAL_ENTITY.jurisdiction}. The courts of{" "}
          {LEGAL_ENTITY.courts} have exclusive jurisdiction to settle any such dispute.
        </p>
        <p className={styles.p}>
          If you are a consumer resident somewhere that gives you the benefit of
          mandatory local protections, nothing here removes them &mdash; you keep any
          right to bring proceedings in your own courts that the law of your country
          gives you.
        </p>

        <h2 className={styles.h2}>Contact</h2>
        <p className={styles.p}>
          Questions about these terms go to{" "}
          <a href={`mailto:${SITE.email}`} className={styles.link}>
            {SITE.email}
          </a>
          .
        </p>
      </div>
    </main>
  );
}
