import type { Metadata } from "next";
import Link from "next/link";
import { LEGAL_ENTITY, LOCATION, SITE } from "@/lib/site";
import styles from "../legal.module.css";

/**
 * Describes what this site actually does, not what a generator assumes.
 *
 * The processor table is the part that matters and the part that goes stale:
 * it is derived from the code, so changing a provider means changing this page
 * in the same commit. As of writing — Resend in `lib/email.ts`, Groq in
 * `lib/rag/providers/`, and LiveKit, Deepgram, OpenAI and Cartesia in
 * `agent/agent.py`.
 */
export const metadata: Metadata = {
  title: "Privacy Policy",
  description:
    "What Halyx Technologies collects through this website, why, who processes it, and how to have it deleted.",
};

const LAST_UPDATED = "21 September 2026";

const PROCESSORS = [
  ["Vercel", "Hosting and delivery of this site", "United States"],
  ["Resend", "Delivers the enquiry email and your acknowledgement", "United States"],
  ["Groq", "Generates the text assistant's replies", "United States"],
  ["LiveKit", "Carries the audio for a voice conversation", "United States"],
  ["Deepgram", "Transcribes your speech during a voice conversation", "United States"],
  ["OpenAI", "Generates the voice assistant's replies", "United States"],
  ["Cartesia", "Synthesises the assistant's speech", "United States"],
];

export default function PrivacyPage() {
  return (
    <main className={styles.main}>
      <div className={styles.inner}>
        <Link href="/" className={styles.back}>
          &#8592; Back to Halyx Technologies
        </Link>

        <p className={`${styles.eyebrow} hx-mono`}>LEGAL</p>
        <h1 className={styles.h1}>Privacy Policy</h1>
        <p className={styles.updated}>Last updated {LAST_UPDATED}</p>

        <p className={styles.gap}>
          <strong>Still outstanding:</strong> the SECP incorporation number and the
          registered office address are not printed below, because they have not been
          supplied &mdash; a privacy policy is ordinarily expected to carry both. This
          page accurately describes the data flows in the site&rsquo;s code, but it has
          not been reviewed by a lawyer, and the paragraph on Pakistani data-protection
          law below should be confirmed against the statute in force today.
        </p>

        <h2 className={styles.h2}>Who is responsible for your data</h2>
        <p className={styles.p}>
          The data controller is{" "}
          <span className={styles.term}>{LEGAL_ENTITY.name}</span>, a company
          incorporated in {LEGAL_ENTITY.jurisdiction}, registered with the{" "}
          {LEGAL_ENTITY.registrar} and based in {LOCATION.city}, {LOCATION.region}.
          Anything on this page can be raised by email at{" "}
          <a href={`mailto:${SITE.email}`} className={styles.link}>
            {SITE.email}
          </a>
          .
        </p>

        <h2 className={styles.h2}>The short version</h2>
        <p className={styles.p}>
          This site sets <span className={styles.term}>no cookies</span> and runs{" "}
          <span className={styles.term}>no analytics or tracking</span> of any kind.
          Fonts are served from this domain, so no request for them reaches a third
          party. Nothing you send is written to a database. The only personal data that
          persists anywhere is the enquiry email itself, sitting in the studio&rsquo;s
          inbox.
        </p>

        <h2 className={styles.h2}>What is collected, and when</h2>
        <p className={styles.p}>
          Only when you choose to start one of these three things. Browsing the page
          collects nothing.
        </p>
        <ul className={styles.list}>
          <li>
            <span className={styles.term}>The enquiry form.</span> Your name, and
            optionally your company, email address, phone number, the service you are
            interested in, and your brief. Name and email are required because there is
            no way to reply without them.
          </li>
          <li>
            <span className={styles.term}>The text assistant.</span> The messages you
            type. Do not paste anything confidential into it.
          </li>
          <li>
            <span className={styles.term}>The voice assistant.</span> Your microphone
            audio, for as long as the conversation is running. Your browser will ask
            permission first, and the conversation does not start until you grant it.
            The audio is transcribed as it arrives and is not recorded or stored by this
            site.
          </li>
        </ul>
        <p className={styles.p}>
          Your language choice is kept in your browser&rsquo;s local storage so the site
          remembers it on your next visit. It stays on your device, is never sent
          anywhere, and clearing your browser data removes it.
        </p>

        <h2 className={styles.h2}>Why, and on what basis</h2>
        <p className={styles.p}>
          Enquiry details are used to answer your enquiry and for nothing else. They are
          not sold, rented, or added to a marketing list, and you will not receive
          anything you did not ask for. The lawful basis is legitimate interest &mdash;
          you contacted a business expecting a reply. For the microphone, the basis is
          your consent, which you give in the browser prompt and can withdraw by ending
          the conversation or revoking the permission.
        </p>

        <h2 className={styles.h2}>Who else processes it</h2>
        <p className={styles.p}>
          These providers handle your data on the studio&rsquo;s behalf in order to make
          the site work. Each sees only the part it needs.
        </p>
        <div className={styles.scroller}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th>Provider</th>
                <th>What it does</th>
                <th>Located</th>
              </tr>
            </thead>
            <tbody>
              {PROCESSORS.map(([name, role, where]) => (
                <tr key={name}>
                  <td className={styles.term}>{name}</td>
                  <td>{role}</td>
                  <td>{where}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className={styles.p}>
          <span className={styles.term}>International transfers.</span> Two of them,
          stated plainly. {LEGAL_ENTITY.name} is in {LOCATION.country}, and every
          provider in the table above is a United States company. So if you are in the
          UK or the EEA, your data leaves it twice over &mdash; once to
          {" "}{LOCATION.country} and once to the United States &mdash; and neither is
          covered by a UK or EU adequacy decision. Transfers to the providers rely on
          their own safeguards, typically Standard Contractual Clauses under their data
          processing agreements. If that matters to you, email before using the form or
          the assistant and we will take your enquiry by another route.
        </p>

        <h2 className={styles.h2}>How long it is kept</h2>
        <ul className={styles.list}>
          <li>
            <span className={styles.term}>Enquiries:</span> the email stays in the
            studio&rsquo;s inbox while the conversation is live and for up to 24 months
            afterwards, then is deleted.
          </li>
          <li>
            <span className={styles.term}>Assistant conversations:</span> not stored.
            They exist for the length of the exchange and are gone when you close the
            page. There is no transcript to request or delete.
          </li>
        </ul>

        <h2 className={styles.h2}>Your rights</h2>
        <p className={styles.p}>
          Wherever you are, and whatever your local law entitles you to, you can ask for
          a copy of what is held about you, ask for it to be corrected or deleted, or
          object to it being held at all. Email{" "}
          <a href={`mailto:${SITE.email}`} className={styles.link}>
            {SITE.email}
          </a>{" "}
          and say what you want done. There is no form and no account to log into
          &mdash; a plain email is enough, and we will act on it within 30 days. We
          offer this as a matter of policy rather than only where a statute compels it,
          because the alternative is deciding which visitors deserve an answer.
        </p>
        <p className={styles.p}>
          <span className={styles.term}>If you are in the UK or the EEA</span> and the
          UK GDPR or the GDPR applies to this processing, you additionally keep your
          statutory rights, including the right to complain to your own supervisory
          authority &mdash; the Information Commissioner&rsquo;s Office in the UK, or
          your national data protection authority in the EEA. You do not have to come to
          us first.
        </p>
        <p className={styles.p}>
          <span className={styles.term}>If you are in {LOCATION.country}</span>, the
          applicable regime is {LOCATION.country}&rsquo;s own law on electronic crime and
          data protection, which has been undergoing reform. Rather than name an
          authority that may not be the right one by the time you read this, we will
          tell you the current route on request &mdash; and the rights above apply to
          you regardless of what the statute requires.
        </p>

        <h2 className={styles.h2}>Changes</h2>
        <p className={styles.p}>
          If the site starts collecting something new &mdash; analytics, a cookie, a
          different provider &mdash; this page changes in the same release, and the date
          at the top moves. It is not updated quietly.
        </p>

        <h2 className={styles.h2}>Contact</h2>
        <p className={styles.p}>
          Questions about any of this go to{" "}
          <a href={`mailto:${SITE.email}`} className={styles.link}>
            {SITE.email}
          </a>
          .
        </p>
      </div>
    </main>
  );
}
