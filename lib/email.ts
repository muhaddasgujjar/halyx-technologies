import "server-only";
import { Resend } from "resend";

/**
 * Contact-form delivery over Resend.
 *
 * Sender note: `onboarding@resend.dev` is Resend's sandbox address. It works
 * with no DNS setup, but it can only deliver to the account owner's own email —
 * which is what `CONTACT_TO` is. That is fine for the notification, and it is
 * why the applicant acknowledgement is opt-in (see `sendAcknowledgement`).
 *
 * To send from your own domain, verify `halyx.tech` in the Resend dashboard,
 * then set `CONTACT_FROM="Halyx Technologies <hello@halyx.tech>"`.
 */

export interface Enquiry {
  name: string;
  company: string;
  email: string;
  phone: string;
  interest: string;
  brief: string;
  receivedAt: string;
}

export interface SendResult {
  ok: boolean;
  /** Set when delivery failed; safe to log, never shown verbatim to visitors. */
  error?: string;
  id?: string;
}

let client: Resend | null = null;

function getClient(): Resend | null {
  const key = process.env.RESEND_API_KEY;
  if (!key) return null;
  if (!client) client = new Resend(key);
  return client;
}

/** Reads config at call time so a missing value is a runtime error, not a build one. */
function config() {
  return {
    from: process.env.CONTACT_FROM,
    to: process.env.CONTACT_TO,
    /** Acknowledgement to the enquirer. Needs a verified sending domain. */
    ack: process.env.CONTACT_ACK === "true",
  };
}

const esc = (s: string) =>
  s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");

/** Preserves the visitor's paragraph breaks without trusting their markup. */
const paragraphs = (s: string) =>
  esc(s)
    .split(/\n{2,}/)
    .map((p) => `<p style="margin:0 0 12px">${p.replace(/\n/g, "<br>")}</p>`)
    .join("");

function row(label: string, value: string, href?: string) {
  if (!value) return "";
  const inner = href
    ? `<a href="${esc(href)}" style="color:#bcb2ff;text-decoration:none">${esc(value)}</a>`
    : esc(value);
  return `
    <tr>
      <td style="padding:9px 0;border-bottom:1px solid #1e1e2a;color:#8a8a95;font-size:12px;letter-spacing:.08em;text-transform:uppercase;white-space:nowrap;vertical-align:top">${esc(label)}</td>
      <td style="padding:9px 0 9px 20px;border-bottom:1px solid #1e1e2a;color:#e8e8ef;font-size:14px;vertical-align:top">${inner}</td>
    </tr>`;
}

function notificationHtml(e: Enquiry) {
  return `<!doctype html>
<html><body style="margin:0;padding:24px;background:#060608;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif">
  <table role="presentation" style="max-width:640px;margin:0 auto;width:100%;border-collapse:collapse">
    <tr><td style="padding:0 0 18px">
      <div style="font-size:13px;font-weight:600;letter-spacing:.24em;color:#ffffff">HALYX</div>
      <div style="margin-top:6px;font-size:11px;letter-spacing:.16em;color:#8f83ef">NEW PROJECT ENQUIRY</div>
    </td></tr>
    <tr><td style="padding:22px 24px;background:#0c0c14;border:1px solid #1e1e2a;border-radius:16px">
      <div style="font-size:20px;font-weight:500;color:#ffffff;letter-spacing:-0.02em">${esc(e.name)}</div>
      ${e.company ? `<div style="margin-top:4px;font-size:13px;color:#8a8a95">${esc(e.company)}</div>` : ""}
      <table role="presentation" style="width:100%;margin-top:18px;border-collapse:collapse">
        ${row("Email", e.email, `mailto:${e.email}`)}
        ${row("Phone", e.phone, e.phone ? `tel:${e.phone.replace(/[^\d+]/g, "")}` : undefined)}
        ${row("Interest", e.interest)}
      </table>
      ${
        e.brief
          ? `<div style="margin-top:20px;padding-top:18px;border-top:1px solid #1e1e2a">
               <div style="font-size:11px;letter-spacing:.16em;color:#8f83ef;margin-bottom:10px">THE BRIEF</div>
               <div style="font-size:14px;line-height:1.65;color:#c9c9d2">${paragraphs(e.brief)}</div>
             </div>`
          : ""
      }
      <div style="margin-top:22px;padding-top:16px;border-top:1px solid #1e1e2a">
        <a href="mailto:${esc(e.email)}" style="display:inline-block;padding:11px 22px;border-radius:999px;background:#5647d6;color:#ffffff;font-size:14px;font-weight:500;text-decoration:none">Reply to ${esc(e.name)}</a>
      </div>
    </td></tr>
    <tr><td style="padding:16px 4px 0;font-size:11px;color:#5c5c68">
      Received ${esc(e.receivedAt)} &middot; sent by the halyx.tech contact form
    </td></tr>
  </table>
</body></html>`;
}

function notificationText(e: Enquiry) {
  return [
    "NEW PROJECT ENQUIRY — HALYX",
    "",
    `Name:     ${e.name}`,
    e.company ? `Company:  ${e.company}` : null,
    `Email:    ${e.email}`,
    e.phone ? `Phone:    ${e.phone}` : null,
    e.interest ? `Interest: ${e.interest}` : null,
    "",
    e.brief ? `Brief:\n${e.brief}` : "(no brief supplied)",
    "",
    `Received ${e.receivedAt}`,
  ]
    .filter((l) => l !== null)
    .join("\n");
}

function ackHtml(e: Enquiry) {
  return `<!doctype html>
<html><body style="margin:0;padding:24px;background:#060608;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif">
  <table role="presentation" style="max-width:560px;margin:0 auto;width:100%;border-collapse:collapse">
    <tr><td style="padding:0 0 18px">
      <div style="font-size:13px;font-weight:600;letter-spacing:.24em;color:#ffffff">HALYX</div>
    </td></tr>
    <tr><td style="padding:26px 24px;background:#0c0c14;border:1px solid #1e1e2a;border-radius:16px;color:#c9c9d2;font-size:14px;line-height:1.7">
      <p style="margin:0 0 14px;color:#ffffff;font-size:18px;font-weight:500">Thanks, ${esc(e.name.split(" ")[0])}.</p>
      <p style="margin:0 0 14px">We have your brief and someone from the team will come back to you within two working days.</p>
      <p style="margin:0">If anything changes in the meantime, just reply to this email.</p>
    </td></tr>
    <tr><td style="padding:16px 4px 0;font-size:11px;color:#5c5c68">Halyx Technologies &middot; applied AI and product engineering</td></tr>
  </table>
</body></html>`;
}

/**
 * Sends the enquiry to the studio inbox.
 * `replyTo` is the enquirer, so hitting Reply in the mail client just works.
 */
export async function sendEnquiry(e: Enquiry): Promise<SendResult> {
  const resend = getClient();
  const { from, to } = config();

  if (!resend) return { ok: false, error: "RESEND_API_KEY is not set" };
  if (!from) return { ok: false, error: "CONTACT_FROM is not set" };
  if (!to) return { ok: false, error: "CONTACT_TO is not set" };

  const subject = e.company
    ? `New enquiry — ${e.name}, ${e.company}`
    : `New enquiry — ${e.name}`;

  const { data, error } = await resend.emails.send({
    from,
    to: to.split(",").map((s) => s.trim()).filter(Boolean),
    replyTo: e.email,
    subject,
    html: notificationHtml(e),
    text: notificationText(e),
  });

  if (error) return { ok: false, error: `${error.name}: ${error.message}` };
  return { ok: true, id: data?.id };
}

/**
 * Optional "we got it" reply to the enquirer.
 *
 * Off by default: the sandbox sender can only deliver to the account owner, so
 * this needs a verified domain in `CONTACT_FROM`. Enable with `CONTACT_ACK=true`.
 * Never throws — a failed acknowledgement must not fail the visitor's submission.
 */
export async function sendAcknowledgement(e: Enquiry): Promise<SendResult> {
  const { ack, from } = config();
  if (!ack) return { ok: false, error: "acknowledgement disabled" };

  const resend = getClient();
  if (!resend || !from) return { ok: false, error: "email not configured" };

  try {
    const { data, error } = await resend.emails.send({
      from,
      to: e.email,
      subject: "We got your brief — Halyx Technologies",
      html: ackHtml(e),
      text: `Thanks, ${e.name.split(" ")[0]}.\n\nWe have your brief and someone from the team will come back to you within two working days.\n\nIf anything changes in the meantime, just reply to this email.\n\nHalyx Technologies`,
    });
    if (error) return { ok: false, error: `${error.name}: ${error.message}` };
    return { ok: true, id: data?.id };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : String(err) };
  }
}
