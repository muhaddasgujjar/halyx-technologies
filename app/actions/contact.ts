"use server";

import { INTERESTS } from "@/lib/content";
import { EMPTY_CONTACT_VALUES, type ContactState } from "@/lib/contact-state";
import { sendAcknowledgement, sendEnquiry } from "@/lib/email";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

function str(data: FormData, key: string) {
  const v = data.get(key);
  return typeof v === "string" ? v.trim() : "";
}

export async function submitContact(
  _prev: ContactState,
  data: FormData,
): Promise<ContactState> {
  // Honeypot: a real person never fills a field they cannot see. Answer with a
  // success shape so bots learn nothing from the difference.
  if (str(data, "company_website")) {
    return {
      status: "success",
      message: "Thanks — we'll be in touch.",
      fieldErrors: {},
      values: EMPTY_CONTACT_VALUES,
    };
  }

  const name = str(data, "name");
  const company = str(data, "company");
  const email = str(data, "email");
  const phone = str(data, "phone");
  const interest = str(data, "interest");
  const brief = str(data, "brief");

  // Echoed back on failure so React's post-action form reset restores them.
  const values = { name, company, email, phone, interest, brief };

  const fieldErrors: Record<string, string> = {};

  if (name.length < 2) fieldErrors.name = "Tell us who you are.";
  else if (name.length > 120) fieldErrors.name = "That name is too long.";

  if (!email) fieldErrors.email = "We need an email to reply to.";
  else if (!EMAIL_RE.test(email) || email.length > 200)
    fieldErrors.email = "That email doesn't look right.";

  if (company.length > 160) fieldErrors.company = "That company name is too long.";
  if (phone.length > 40) fieldErrors.phone = "That phone number is too long.";
  if (brief.length > 4000) fieldErrors.brief = "Please keep the brief under 4000 characters.";
  if (interest && !INTERESTS.includes(interest)) fieldErrors.interest = "Pick one of the options.";

  if (Object.keys(fieldErrors).length > 0) {
    return {
      status: "error",
      message: "Please check the highlighted fields.",
      fieldErrors,
      values,
    };
  }

  const enquiry = {
    name,
    company,
    email,
    phone,
    interest,
    brief,
    receivedAt: new Date().toISOString(),
  };

  // Delivery goes out over Resend. If it fails, say so rather than pretending.
  const sent = await sendEnquiry(enquiry);

  if (!sent.ok) {
    // The reason is for the operator, never for the visitor.
    console.error("[contact] delivery failed:", sent.error, {
      email: enquiry.email,
      receivedAt: enquiry.receivedAt,
    });
    return {
      status: "error",
      message: "Something went wrong sending that. Email hello@halyx.tech and we'll pick it up.",
      fieldErrors: {},
      values,
    };
  }

  console.info("[contact] enquiry delivered", { id: sent.id, email: enquiry.email });

  /*
   * Best-effort "we got it" reply to the enquirer. Deliberately not awaited for
   * its result path beyond logging: the studio already has the enquiry, so a
   * failed acknowledgement must not turn a successful submission into an error.
   */
  const ack = await sendAcknowledgement(enquiry);
  if (!ack.ok && ack.error !== "acknowledgement disabled") {
    console.warn("[contact] acknowledgement not sent:", ack.error);
  }

  return {
    status: "success",
    message: "Thanks — we'll come back to you within two working days.",
    fieldErrors: {},
    values: EMPTY_CONTACT_VALUES,
  };
}
