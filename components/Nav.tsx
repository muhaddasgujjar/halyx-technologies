import { NAV_LINKS } from "@/lib/content";
import styles from "./Nav.module.css";

export function Nav() {
  return (
    <nav className={styles.nav} aria-label="Primary">
      <div className={styles.wordmark}>HALYX</div>
      <div className={styles.links}>
        {NAV_LINKS.map((l) => (
          <a key={l.text} href={l.href} className={styles.link}>
            {l.text}
          </a>
        ))}
      </div>
      <a href="#contact" className={styles.cta}>
        Start Your Project
        <span className={styles.ctaBadge} aria-hidden="true">
          &#8599;
        </span>
      </a>
    </nav>
  );
}
