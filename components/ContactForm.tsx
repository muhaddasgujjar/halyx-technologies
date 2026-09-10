"use client";

import { useActionState, useState } from "react";
import { useFormStatus } from "react-dom";
import { submitContact } from "@/app/actions/contact";
import { CONTACT_INITIAL_STATE, EMPTY_CONTACT_VALUES } from "@/lib/contact-state";
import { INTERESTS, SOCIALS } from "@/lib/content";
import { useLocale } from "./LocaleProvider";
import { Reveal, RevealScope } from "./Reveal";
import styles from "./ContactForm.module.css";

function SubmitButton() {
  const { pending } = useFormStatus();
  const { t } = useLocale();
  return (
    <button type="submit" className={styles.submit} disabled={pending}>
      {pending ? t("SENDING…") : `${t("SEND")} →`}
    </button>
  );
}

export function ContactForm() {
  const [state, formAction] = useActionState(submitContact, CONTACT_INITIAL_STATE);
  const [interest, setInterest] = useState(0);
  const { t } = useLocale();

  // Defensive: a stale client (an open tab across a deploy) can hand back a
  // state shape from an older build. Falling back beats throwing mid-render.
  const err = state.fieldErrors ?? {};
  // React resets the form after every action run; these defaults are what the
  // reset restores, so a failed submit no longer wipes what was typed.
  const v = state.values ?? EMPTY_CONTACT_VALUES;

  return (
    <RevealScope variant="rise">
      <section className={styles.section}>
        <div className={styles.glow} aria-hidden="true" />

        <Reveal className={styles.panelBorder}>
          <div className={styles.panel}>
            <div className={styles.grid}>
              <div className={styles.left}>
                <div>
                  <div className={styles.pill}>
                    <span className={styles.pillDot} aria-hidden="true" />
                    <span className={styles.pillLabel}>{t("Get Started")}</span>
                  </div>
                  <h2 className={styles.h2}>{t("Let’s build your next intelligent product")}</h2>
                  <div className={styles.rule} aria-hidden="true" />
                  <p className={styles.lead}>
                    {t("Turn your vision into a system that ships, scales, and")}{" "}
                    <span className={styles.leadStrong}>{t("stands out")}</span>.
                  </p>
                </div>

                <div className={styles.socials}>
                  {SOCIALS.map((s) => (
                    <a key={s} href="#contact" className={styles.social} aria-label={s}>
                      {s}
                    </a>
                  ))}
                </div>
              </div>

              <div>
                <h3 className={styles.h3}>{t("Let’s talk")}</h3>

                <form action={formAction} noValidate>
                  {/* Bots fill this; people never see it. */}
                  <div className={styles.honeypot} aria-hidden="true">
                    <label htmlFor="company_website">{t("Leave this empty")}</label>
                    <input
                      id="company_website"
                      name="company_website"
                      type="text"
                      tabIndex={-1}
                      autoComplete="off"
                    />
                  </div>

                  <div className={styles.fields}>
                    <div className={styles.field}>
                      <label htmlFor="name" className="hx-sr-only">
                        {t("Full name")}
                      </label>
                      <input
                        id="name"
                        name="name"
                        defaultValue={v.name}
                        type="text"
                        placeholder={t("Full name")}
                        autoComplete="name"
                        required
                        aria-invalid={Boolean(err.name)}
                        aria-describedby={err.name ? "name-error" : undefined}
                        className={styles.input}
                      />
                      {err.name && (
                        <p id="name-error" className={styles.fieldError}>
                          {err.name}
                        </p>
                      )}
                    </div>

                    <div className={styles.field}>
                      <label htmlFor="company" className="hx-sr-only">
                        {t("Company")}
                      </label>
                      <input
                        id="company"
                        name="company"
                        defaultValue={v.company}
                        type="text"
                        placeholder={t("Company")}
                        autoComplete="organization"
                        aria-invalid={Boolean(err.company)}
                        aria-describedby={err.company ? "company-error" : undefined}
                        className={styles.input}
                      />
                      {err.company && (
                        <p id="company-error" className={styles.fieldError}>
                          {err.company}
                        </p>
                      )}
                    </div>

                    <div className={styles.field}>
                      <label htmlFor="email" className="hx-sr-only">
                        {t("Email")}
                      </label>
                      <input
                        id="email"
                        name="email"
                        defaultValue={v.email}
                        type="email"
                        placeholder={t("Email")}
                        autoComplete="email"
                        required
                        aria-invalid={Boolean(err.email)}
                        aria-describedby={err.email ? "email-error" : undefined}
                        className={styles.input}
                      />
                      {err.email && (
                        <p id="email-error" className={styles.fieldError}>
                          {err.email}
                        </p>
                      )}
                    </div>

                    <div className={styles.field}>
                      <label htmlFor="phone" className="hx-sr-only">
                        {t("Phone")}
                      </label>
                      <input
                        id="phone"
                        name="phone"
                        defaultValue={v.phone}
                        type="tel"
                        placeholder={t("Phone")}
                        autoComplete="tel"
                        aria-invalid={Boolean(err.phone)}
                        aria-describedby={err.phone ? "phone-error" : undefined}
                        className={styles.input}
                      />
                      {err.phone && (
                        <p id="phone-error" className={styles.fieldError}>
                          {err.phone}
                        </p>
                      )}
                    </div>
                  </div>

                  <div id="interest-label" className={styles.interestLabel}>
                    {t("I’m interested in")}
                  </div>
                  <div className={styles.interests} role="group" aria-labelledby="interest-label">
                    {INTERESTS.map((label, i) => (
                      <button
                        key={label}
                        type="button"
                        className={styles.interest}
                        data-selected={interest === i}
                        aria-pressed={interest === i}
                        onClick={() => setInterest(i)}
                      >
                        {t(label)}
                      </button>
                    ))}
                    <input type="hidden" name="interest" value={INTERESTS[interest]} />
                  </div>

                  <label htmlFor="brief" className="hx-sr-only">
                    {t("Tell us more about your project")}
                  </label>
                  <textarea
                    id="brief"
                    name="brief"
                    defaultValue={v.brief}
                    rows={3}
                    placeholder={t("Tell us more about your project!")}
                    aria-invalid={Boolean(err.brief)}
                    aria-describedby={err.brief ? "brief-error" : undefined}
                    className={styles.textarea}
                  />
                  {err.brief && (
                    <p id="brief-error" className={styles.fieldError}>
                      {err.brief}
                    </p>
                  )}

                  <SubmitButton />

                  <p
                    className={`${styles.status} ${
                      state.status === "success" ? styles.statusOk : styles.statusBad
                    }`}
                    role="status"
                    aria-live="polite"
                  >
                    {state.message}
                  </p>
                </form>
              </div>
            </div>
          </div>
        </Reveal>
      </section>
    </RevealScope>
  );
}
