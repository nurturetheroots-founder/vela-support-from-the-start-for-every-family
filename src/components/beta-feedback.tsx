import { useEffect, useRef, useState } from "react";
import { useRouterState } from "@tanstack/react-router";
import { MessageCircle, Loader2, Check, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { sendFeedback } from "@/lib/feedback";
import { cn } from "@/lib/utils";

const FEEDBACK_EMAIL = "hello@nurturetheroots.co";

type Stage = "writing" | "sending" | "sent" | "failed";

/**
 * Beta feedback, reachable from every screen.
 *
 * Mounted once at the root rather than per page, so a tester never has to go
 * looking for it — the moment something feels wrong is the moment she will say
 * so, and that moment passes.
 */
export function BetaFeedback() {
  const [open, setOpen] = useState(false);
  const [stage, setStage] = useState<Stage>("writing");
  const [message, setMessage] = useState("");
  const [email, setEmail] = useState("");
  const dialogRef = useRef<HTMLDivElement | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);
  const openerRef = useRef<HTMLButtonElement | null>(null);
  const pagePath = useRouterState({ select: (s) => s.location.pathname });

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") close();
    };
    document.addEventListener("keydown", onKey);
    // Focus the field she came here to type in, not the dialog wrapper.
    const id = window.setTimeout(() => textareaRef.current?.focus(), 60);
    return () => {
      document.removeEventListener("keydown", onKey);
      window.clearTimeout(id);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  function close() {
    setOpen(false);
    // Send her back to whatever she was doing, not to the top of the page.
    openerRef.current?.focus();
    // A sent message resets; an unsent one is deliberately kept, so closing by
    // accident at 3am does not cost her what she wrote.
    if (stage === "sent") {
      setMessage("");
      setEmail("");
      setStage("writing");
    }
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!message.trim() || stage === "sending") return;
    setStage("sending");
    const result = await sendFeedback({ message, email, pagePath });
    setStage(result.ok ? "sent" : "failed");
  }

  const mailto =
    `mailto:${FEEDBACK_EMAIL}` +
    `?subject=${encodeURIComponent("Vela beta feedback")}` +
    `&body=${encodeURIComponent(message + "\n\n— sent from " + pagePath)}`;

  return (
    <>
      <button
        ref={openerRef}
        type="button"
        onClick={() => setOpen(true)}
        aria-haspopup="dialog"
        className={cn(
          "fixed right-0 top-1/2 z-30 -translate-y-1/2 rounded-l-2xl",
          "min-h-[112px] min-w-11 px-2 py-4",
          "flex items-center justify-center gap-2",
          "border border-r-0 border-clay/40 bg-clay text-primary-foreground",
          "shadow-lg transition-transform hover:-translate-x-0.5",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-clay focus-visible:ring-offset-2",
        )}
      >
        <span className="flex items-center gap-2 [writing-mode:vertical-rl] rotate-180 text-xs font-medium tracking-wide">
          <MessageCircle className="h-4 w-4 rotate-90" aria-hidden="true" />
          Feedback
        </span>
      </button>

      {open && (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center sm:items-center"
          role="presentation"
          onMouseDown={(e) => {
            if (e.target === e.currentTarget) close();
          }}
        >
          <div className="absolute inset-0 bg-black/55 backdrop-blur-[2px]" aria-hidden="true" />
          <div
            ref={dialogRef}
            role="dialog"
            aria-modal="true"
            aria-labelledby="feedback-title"
            className={cn(
              "relative w-full max-w-md rounded-t-3xl sm:rounded-3xl",
              "border border-border/60 bg-card p-6 shadow-2xl",
              "max-h-[90dvh] overflow-y-auto",
            )}
          >
            <button
              type="button"
              onClick={close}
              aria-label="Close"
              className="absolute right-3 top-3 grid h-11 w-11 place-items-center rounded-full text-muted-foreground hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-clay"
            >
              <X className="h-5 w-5" aria-hidden="true" />
            </button>

            {stage === "sent" ? (
              <div className="py-4 text-center">
                <span className="mx-auto grid h-12 w-12 place-items-center rounded-full bg-primary/15 text-primary">
                  <Check className="h-6 w-6" aria-hidden="true" />
                </span>
                <h2 id="feedback-title" className="mt-4 font-serif text-2xl">
                  Thank you — that helps.
                </h2>
                <p className="mt-2 leading-relaxed text-muted-foreground">
                  It went straight to Ashlee. If you left your email, she may write back.
                </p>
                <Button size="lg" className="mt-6 min-h-11 w-full rounded-full" onClick={close}>
                  Back to Vela
                </Button>
              </div>
            ) : (
              <form onSubmit={submit}>
                <h2 id="feedback-title" className="pr-10 font-serif text-2xl leading-snug">
                  What's on your mind?
                </h2>
                <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                  Broken, confusing, or just wrong-feeling — all of it helps. There's no wrong way
                  to say it.
                </p>

                <div className="mt-5">
                  <Label htmlFor="feedback-message">Your note</Label>
                  <Textarea
                    id="feedback-message"
                    ref={textareaRef}
                    required
                    rows={5}
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    placeholder="The shift tracker wouldn't open…"
                    className="mt-2 min-h-32 rounded-2xl bg-background/70"
                  />
                </div>

                <div className="mt-4">
                  <Label htmlFor="feedback-email">Your email (optional)</Label>
                  <Input
                    id="feedback-email"
                    type="email"
                    inputMode="email"
                    autoComplete="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="Only if you'd like a reply"
                    className="mt-2 min-h-11 rounded-2xl bg-background/70"
                  />
                </div>

                {stage === "failed" && (
                  <div
                    role="alert"
                    className="mt-4 rounded-2xl border border-destructive/40 bg-destructive/10 p-4 text-sm leading-relaxed"
                  >
                    <p className="font-medium text-foreground">That didn't send.</p>
                    <p className="mt-1 text-muted-foreground">
                      Your words are still here — nothing was lost. Try again, or send them straight
                      to Ashlee instead.
                    </p>
                    <a href={mailto} className="mt-3 inline-block">
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        className="min-h-11 rounded-full"
                      >
                        Email it instead
                      </Button>
                    </a>
                  </div>
                )}

                <Button
                  type="submit"
                  size="lg"
                  disabled={!message.trim() || stage === "sending"}
                  className="mt-6 min-h-11 w-full rounded-full"
                >
                  {stage === "sending" && (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden="true" />
                  )}
                  {stage === "failed" ? "Try again" : "Send to Ashlee"}
                </Button>

                <p className="mt-3 text-center text-xs leading-relaxed text-muted-foreground">
                  Only what you type here and the screen you're on is sent. Your check-ins and notes
                  stay private.
                </p>
              </form>
            )}
          </div>
        </div>
      )}
    </>
  );
}
