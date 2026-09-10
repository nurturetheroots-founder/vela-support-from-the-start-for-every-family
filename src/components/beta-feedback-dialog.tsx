import { useState, type KeyboardEvent } from "react";
import { MessageCircleHeart } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { captureEvent } from "@/lib/analytics-utils";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

/** Matches nothing in the schema — a guard against a runaway paste, not a rule. */
const MAX_LENGTH = 2000;

/**
 * Global beta feedback. Mounted once in __root so it reaches every route,
 * including the caregiver night screens that never render the app shell.
 *
 * The tab lives on the right edge rather than the bottom: /care has a fixed
 * quick-log bar at z-20 and the app shell has a fixed tab bar, so the bottom
 * of the viewport is already spoken for on most screens.
 *
 * Colours come from the night palette on every route, light or dark. Feedback
 * gets written at 3am by someone holding a baby, and a white sheet at that
 * hour is its own small cruelty.
 */
export function BetaFeedback() {
  const [open, setOpen] = useState(false);
  const [message, setMessage] = useState("");
  const [saving, setSaving] = useState(false);

  const text = message.trim();
  const canSend = text.length > 0 && !saving;

  async function submit() {
    if (!canSend) return;
    setSaving(true);
    try {
      // getSession reads the local store; getUser would make a network round
      // trip before we can even start the insert.
      const { data } = await supabase.auth.getSession();
      const { error } = await supabase.from("beta_feedback").insert({
        message: text,
        user_id: data.session?.user.id ?? null,
        page_path: typeof window !== "undefined" ? window.location.pathname : null,
      });
      if (error) throw error;
      captureEvent("beta_feedback_submitted", { length: text.length });
      setMessage("");
      setOpen(false);
      toast.success("Thank you — your thoughts are with us.");
    } catch {
      // Deliberately keep the text: losing a paragraph you just typed one-handed
      // is worse than the failed send.
      toast.error("That didn't send just now. Try once more in a moment.");
    } finally {
      setSaving(false);
    }
  }

  function onKeyDown(event: KeyboardEvent<HTMLTextAreaElement>) {
    if ((event.metaKey || event.ctrlKey) && event.key === "Enter") {
      event.preventDefault();
      void submit();
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <button
          type="button"
          aria-label="Send beta feedback"
          className={[
            // Right edge, vertically centred: clear of both fixed bottom bars.
            "fixed right-0 top-1/2 z-30 -translate-y-1/2",
            "mr-[env(safe-area-inset-right)]",
            // 44px minimum tap target in both directions, before padding.
            "flex min-h-11 min-w-11 items-center justify-center gap-2 px-2 py-4",
            "rounded-l-xl border border-r-0 border-clay-soft/30",
            "bg-night-raised text-night-text shadow-lg",
            "transition-colors hover:bg-night-soft",
            "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-clay-soft",
            "print:hidden",
          ].join(" ")}
        >
          <MessageCircleHeart className="h-5 w-5 shrink-0 text-clay-soft" aria-hidden="true" />
          <span className="text-xs tracking-wide [writing-mode:vertical-rl]">Feedback</span>
        </button>
      </DialogTrigger>

      <DialogContent className="max-w-md border-night-line bg-night text-night-text">
        <DialogHeader>
          <DialogTitle className="font-serif text-night-text">Share your thoughts</DialogTitle>
          <DialogDescription className="text-night-muted">
            A bug, a rough edge, or something that helped — we read every note.
          </DialogDescription>
        </DialogHeader>

        <Textarea
          value={message}
          onChange={(e) => setMessage(e.target.value.slice(0, MAX_LENGTH))}
          onKeyDown={onKeyDown}
          aria-label="Your feedback"
          placeholder="What's on your mind?"
          rows={5}
          maxLength={MAX_LENGTH}
          autoFocus
          className="resize-none border-night-line bg-night-soft text-night-text placeholder:text-night-muted focus-visible:ring-clay-soft"
        />

        <DialogFooter className="flex-col gap-2 sm:flex-col">
          <Button
            onClick={submit}
            disabled={!canSend}
            className="min-h-11 w-full bg-clay-soft text-night hover:bg-clay-soft/90"
          >
            {saving ? "Sending…" : "Send feedback"}
          </Button>
          <p className="text-center text-xs text-night-muted">
            {message.length >= MAX_LENGTH
              ? "That's as much as this box holds — send it and add a second note."
              : "Sent privately to the Vela team. You don't need to be signed in."}
          </p>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
