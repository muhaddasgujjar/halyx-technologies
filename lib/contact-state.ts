/**
 * Shared shape for the contact form's action state.
 *
 * This lives outside the `"use server"` module on purpose: a server-action file
 * may only export async functions, so a plain constant declared there arrives
 * as `undefined` on the client.
 */

/**
 * What the visitor typed, echoed back so it can be restored.
 *
 * React 19 resets a form after *any* action submission, successful or not, and
 * a reset restores each field to its `defaultValue`. Feeding these values back
 * in as defaults is what stops a single mistyped email from wiping a brief the
 * visitor spent five minutes writing.
 */
export interface ContactValues {
  name: string;
  company: string;
  email: string;
  phone: string;
  interest: string;
  brief: string;
}

export interface ContactState {
  status: "idle" | "success" | "error";
  message: string;
  /** Field name → error, for inline messages. */
  fieldErrors: Record<string, string>;
  values: ContactValues;
}

export const EMPTY_CONTACT_VALUES: ContactValues = {
  name: "",
  company: "",
  email: "",
  phone: "",
  interest: "",
  brief: "",
};

export const CONTACT_INITIAL_STATE: ContactState = {
  status: "idle",
  message: "",
  fieldErrors: {},
  values: EMPTY_CONTACT_VALUES,
};
