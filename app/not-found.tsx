import type { Metadata } from "next";
import Link from "next/link";
import styles from "./not-found.module.css";

/**
 * Deliberately self-contained rather than wrapped in <Nav>/<Footer>.
 *
 * Every link in both of those is an in-page anchor (#services, #contact) that
 * resolves against the homepage's sections. Rendered here they would all be
 * dead: a visitor who clicks "Services" on the 404 page would sit on the 404
 * page. Two links that actually go somewhere beat a full chrome that lies.
 *
 * Returning a real HTTP 404 is what `not-found.tsx` is for — a soft 404 that
 * answers 200 gets the error page itself indexed.
 */
export const metadata: Metadata = {
  title: "Page not found",
  description: "That page does not exist. Head back to the Halyx Technologies homepage.",
  robots: { index: false, follow: true },
};

export default function NotFound() {
  return (
    <main className={styles.main}>
      <div className={styles.inner}>
        <p className={`${styles.code} hx-mono`}>404</p>
        <h1 className={styles.title}>That page does not exist.</h1>
        <p className={styles.lead}>
          The link may be out of date, or the address mistyped. Everything the studio
          publishes lives on one page.
        </p>
        <div className={styles.actions}>
          <Link href="/" className={styles.primary}>
            Back to the homepage
          </Link>
          <Link href="/#contact" className={styles.secondary}>
            Start a conversation &#8599;
          </Link>
        </div>
      </div>
    </main>
  );
}
