import { useState } from "react";
import { Copy, Check } from "lucide-react";

const APP_URL = "https://app.nurturetheroots.co";

/**
 * A doula cannot mint a code for a family — only the family can, so their
 * private data stays theirs. This hands the doula the exact words to ask with.
 */
export function ClientInviteRequest({ providerName }: { providerName?: string }) {
  const [copied, setCopied] = useState(false);

  const message = [
    `Hi! It's ${providerName?.trim() || "your doula"}.`,
    `I'll be logging our shifts in Vela so you can see feeds, sleep and diapers when you wake up.`,
    `Open ${APP_URL}, go to Support, tap "Invite a caregiver", and send me the 6-character code it gives you.`,
  ].join(" ");

  async function copy() {
    try {
      await navigator.clipboard.writeText(message);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setCopied(false);
    }
  }

  return (
    <div className="rounded-3xl bg-night-soft p-5 ring-1 ring-night-line">
      <h3 className="font-serif text-lg text-night-text">Ask a client for their code</h3>
      <p className="mt-2 text-sm leading-relaxed text-night-muted">
        Families create their own code, so their private notes stay theirs. Send them this.
      </p>
      <p className="mt-3 rounded-2xl bg-night px-4 py-3 text-sm leading-relaxed text-night-text">
        {message}
      </p>
      <button
        type="button"
        onClick={copy}
        className="mt-3 inline-flex min-h-11 items-center gap-2 rounded-full bg-clay-soft px-5 text-sm font-medium text-night"
      >
        {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
        {copied ? "Copied" : "Copy message"}
      </button>
    </div>
  );
}
