import { Resend } from "resend";

// Runtime guard to prevent client-side bundling/leakage of this module
if (typeof window !== "undefined") {
  throw new Error("resend.server.ts is a server-only module and cannot be loaded on the client.");
}

const RESEND_API_KEY = process.env.RESEND_API_KEY;

if (!RESEND_API_KEY) {
  console.warn(
    "[Resend] Warning: RESEND_API_KEY is not set in process.env. Emails cannot be sent."
  );
}

// Instantiate the Resend client. Fallback to a placeholder string if key is missing to avoid crashing on startup.
export const resend = new Resend(RESEND_API_KEY || "re_missing_api_key_placeholder");
