import "server-only";
import { sendAcknowledgement, sendEnquiry } from "@/lib/email";
import type { ChatMode } from "./prompt";
import type { Lead } from "./types";

/**
 * Lead capture from inside the conversation.
 *
 * This is the commercial point of the assistant: a visitor who is already
 * talking should never be told to go and fill in a form. The lead lands in the
 * same studio inbox as the contact form, through the same Resend transport and
 * the same `Enquiry` shape, so there is one place to read enquiries and one
 * place for delivery to break.
 */

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

/**
 * Disposable and placeholder domains.
 *
 * A model asked to be pushy will occasionally invent an address to close the
 * loop. Rejecting these gives it a corrective tool result to react to, rather
 * than the studio receiving a lead it can never reply to.
 */
const BLOCKED_DOMAINS = new Set([
  "example.com", "example.org", "example.net", "test.com", "email.com",
  "domain.com", "yourcompany.com", "company.com", "mailinator.com",
  "10minutemail.com", "guerrillamail.com", "tempmail.com", "trashmail.com",
  "sharklasers.com", "yopmail.com",
]);

export interface LeadResult {
  ok: boolean;
  /** Fed back to the model as the tool result — it is read, so write it for a reader. */
  detail: string;
  /** Shown to the visitor by the UI via the `lead` event. */
  visitorMessage: string;
}

function invalid(detail: string): LeadResult {
  return {
    ok: false,
    detail,
    visitorMessage: "",
  };
}

/** Parses the model's tool input into a `Lead`, or explains what is wrong with it. */
export function parseLead(input: unknown): { ok: true; lead: Lead } | { ok: false; detail: string } {
  if (typeof input !== "object" || input === null) {
    return { ok: false, detail: "Invalid input: expected an object." };
  }
  const raw = input as Record<string, unknown>;
  const str = (key: string) => (typeof raw[key] === "string" ? (raw[key] as string).trim() : "");

  const name = str("name");
  const email = str("email").toLowerCase();
  const need = str("need");

  if (name.length < 2 || name.length > 120) {
    return { ok: false, detail: "Rejected: `name` is missing or implausible. Ask the visitor for their name." };
  }
  if (!EMAIL_RE.test(email) || email.length > 200) {
    return { ok: false, detail: "Rejected: `email` is not a valid address. Ask the visitor to type it out." };
  }
  if (BLOCKED_DOMAINS.has(email.split("@")[1] ?? "")) {
    return {
      ok: false,
      detail:
        "Rejected: that is a placeholder or disposable email domain. Do not guess an address — ask the visitor for a real work email.",
    };
  }
  if (need.length < 10) {
    return {
      ok: false,
      detail:
        "Rejected: `need` is too thin to be useful to the team. Ask one more question about what they are building, then call this again.",
    };
  }

  return {
    ok: true,
    lead: {
      name,
      email,
      company: str("company").slice(0, 160) || undefined,
      need: need.slice(0, 3_000),
      budget: str("budget").slice(0, 120) || undefined,
      timeline: str("timeline").slice(0, 120) || undefined,
    },
  };
}

/**
 * Delivers a captured lead to the studio inbox.
 *
 * Never throws: a delivery failure has to come back to the model as a tool
 * result it can recover from — by pointing the visitor at the contact form —
 * rather than as an exception that kills the stream mid-sentence.
 */
export async function deliverLead(input: unknown, mode: ChatMode = "text"): Promise<LeadResult> {
  const parsed = parseLead(input);
  if (!parsed.ok) return invalid(parsed.detail);

  const { lead } = parsed;

  const enquiry = {
    name: lead.name,
    company: lead.company ?? "",
    email: lead.email,
    phone: "",
    // Mirrors the contact form's interest field so the notification email reads
    // the same way, and so the studio can tell chat leads from form leads.
    interest: mode === "voice" ? "Halyx AI voice console" : "Halyx AI assistant",
    brief: [
      lead.need,
      lead.budget ? `\nBudget indication: ${lead.budget}` : "",
      lead.timeline ? `\nTimeline: ${lead.timeline}` : "",
      mode === "voice"
        ? "\n\n— captured by the Halyx AI voice console. The visitor spoke to the agent, which defers all pricing to the CEO, so they are expecting figures back from him personally."
        : "\n\n— captured by the Halyx AI assistant during a homepage conversation.",
    ]
      .filter(Boolean)
      .join(""),
    receivedAt: new Date().toISOString(),
  };

  try {
    const sent = await sendEnquiry(enquiry);

    if (!sent.ok) {
      // The reason is for the operator; the model gets a recovery instruction.
      console.error("[chat] lead delivery failed:", sent.error, { email: lead.email });
      return {
        ok: false,
        detail:
          "Delivery failed on our side. Apologise briefly, give the visitor hello@halyx.tech directly, and suggest the contact form as a backup. Do not retry this tool.",
        visitorMessage: "",
      };
    }

    console.info("[chat] lead captured", { id: sent.id, email: lead.email, company: lead.company });

    // Best effort, exactly as the contact form treats it: the studio already has
    // the lead, so a failed acknowledgement must not become a failed capture.
    const ack = await sendAcknowledgement(enquiry);
    if (!ack.ok && ack.error !== "acknowledgement disabled") {
      console.warn("[chat] lead acknowledgement not sent:", ack.error);
    }

    return {
      ok: true,
      detail: `Sent to the studio inbox. Confirm to ${lead.name} that the team has it and will come back within two working days, then keep the conversation going — ask one more useful question about the project rather than signing off.`,
      visitorMessage: `Sent to the Halyx team — they will come back to ${lead.email} within two working days.`,
    };
  } catch (error) {
    console.error("[chat] lead delivery threw:", error);
    return {
      ok: false,
      detail:
        "Delivery failed unexpectedly. Give the visitor hello@halyx.tech and the contact form. Do not retry this tool.",
      visitorMessage: "",
    };
  }
}
