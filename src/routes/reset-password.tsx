import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useCallback, useEffect, useRef, useState } from "react";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { fetchRoleInfo } from "@/lib/roles";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { LegalFooter } from "@/components/legal-footer";

type Stage = "checking" | "ok" | "expired" | "signed-in";

export const Route = createFileRoute("/reset-password")({
  head: () => ({
    meta: [
      { title: "Set a new password — Vela" },
      { name: "description", content: "Choose a new password for your Vela account." },
      // A recovery link should never be indexed or previewed.
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
  component: ResetPasswordPage,
});

function ResetPasswordPage() {
  const nav = useNavigate();
  const [stage, setStage] = useState<Stage>("checking");
  const [email, setEmail] = useState<string | null>(null);
  const [linkSent, setLinkSent] = useState(false);
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const hasSession = useRef(false);
  // The stage is tracked in a ref as well as state, and the ref is the one an
  // in-flight async exit consults. Mirroring it during render was not enough:
  // setStage only schedules a re-render, so between a recovery arriving and
  // that render committing the ref still read stale, and the exit could
  // navigate away from a form that had already opened. Writing it here, at the
  // moment the stage changes, makes it true immediately.
  const stageRef = useRef<Stage>("checking");
  const applyStage = useCallback((next: Stage) => {
    stageRef.current = next;
    setStage(next);
  }, []);

  useEffect(() => {
    // Holding a session is not enough to prove someone owns this account — an
    // unlocked phone carries one too, and whoever is holding it could set a new
    // password and lock the owner out. So only a genuine recovery email opens
    // the form.
    //
    // PASSWORD_RECOVERY is the only thing we trust for that. What the URL looks
    // like is not evidence: anyone can append ?code=anything to the address bar,
    // and a code that fails to exchange fires no event at all.
    // The recovery event always wins, whenever it arrives. The timer below is
    // only a fallback for the case where it never does. An earlier version
    // latched on whichever came first, so a code exchange slower than the
    // timer — an ordinary phone connection — showed "expired", swallowed the
    // event that followed, and burned a one-time link.
    const { data: sub } = supabase.auth.onAuthStateChange((event) => {
      if (event === "PASSWORD_RECOVERY") applyStage("ok");
    });

    void supabase.auth.getSession().then(({ data }) => {
      if (data.session) {
        hasSession.current = true;
        setEmail(data.session.user.email ?? null);
      }
    });

    // If no recovery has landed by now, settle on a fallback that still leaves
    // a way forward: someone signed in gets a one-tap way to have a real link
    // emailed. Never overwrite an "ok" — the exchange may have completed while
    // this was pending.
    const timer = window.setTimeout(() => {
      if (stageRef.current === "ok") return;
      applyStage(hasSession.current ? "signed-in" : "expired");
    }, 8000);

    return () => {
      window.clearTimeout(timer);
      sub.subscription.unsubscribe();
    };
  }, [applyStage]);

  async function emailMeALink() {
    if (!email) {
      await nav({ to: "/auth", search: { mode: "forgot" } });
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const { error: sendError } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/reset-password`,
      });
      if (sendError) throw sendError;
      setLinkSent(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "That didn't send. Try again in a moment.");
    } finally {
      setBusy(false);
    }
  }

  // Send people where signing in would have sent them. A caregiver dropped on
  // the parent dashboard gets pushed through parent onboarding by AuthGate,
  // which is not their account to set up. Used after a successful reset and by
  // the signed-in panel's way out, so neither path can drift from the other.
  async function goHome({ yieldToRecovery = false } = {}) {
    const info = await fetchRoleInfo().catch(() => null);
    // A recovery that landed while the role lookup was in flight has opened
    // the form. Leaving now would spend the one-time session with no password
    // set — the exact loss this page is meant to prevent. After a successful
    // save there is nothing left to protect, so that exit never yields.
    if (yieldToRecovery && stageRef.current === "ok") return;
    await nav({ to: info?.role === "caregiver" ? "/caregiver/shift-dashboard" : "/dashboard" });
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (password.length < 6) {
      setError("Please choose at least 6 characters.");
      return;
    }
    if (password !== confirm) {
      setError("Those two don't match yet.");
      return;
    }

    setBusy(true);
    try {
      const { error: updateError } = await supabase.auth.updateUser({ password });
      if (updateError) throw updateError;
      toast.success("Your new password is saved.");
      await goHome();
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "That didn't save. Try the link from your email again.",
      );
    } finally {
      setBusy(false);
    }
  }

  return (
    <div
      className="flex min-h-dvh flex-col"
      style={{ backgroundImage: "var(--gradient-welcome)", backgroundAttachment: "fixed" }}
    >
      <main className="mx-auto w-full max-w-md flex-1 px-6 py-14">
        <h1 className="font-serif text-3xl lowercase">set a new password.</h1>

        {stage === "checking" && (
          <p className="mt-6 flex items-center gap-2 text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" /> Checking your link…
          </p>
        )}

        {stage === "expired" && (
          <div className="mt-6 space-y-4">
            <p className="leading-relaxed text-muted-foreground">
              That link has expired or was already used. Reset links are good for one hour, and only
              once.
            </p>
            <Button asChild size="lg" className="min-h-11 w-full rounded-full">
              {/* Straight to the reset form. Landing on sign-up instead invites
                  a second account under the same address. */}
              <Link to="/auth" search={{ mode: "forgot" }}>
                Ask for a new link
              </Link>
            </Button>
          </div>
        )}

        {stage === "signed-in" && (
          <div className="mt-6 space-y-4">
            <p className="leading-relaxed text-muted-foreground">
              You're signed in{email ? ` as ${email}` : ""}. Changing your password always goes
              through a link we email you — so that someone who picks up your phone while it's
              unlocked can't quietly take your account. If you just opened a reset link, it had
              already expired or been used.
            </p>
            {linkSent ? (
              <p role="status" className="rounded-2xl bg-secondary/70 p-4 text-sm leading-relaxed">
                Sent. The link is good for one hour — open it on any device to set a new password.
              </p>
            ) : (
              <Button
                type="button"
                size="lg"
                className="min-h-11 w-full rounded-full"
                disabled={busy}
                onClick={emailMeALink}
              >
                {busy && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Email me a reset link
              </Button>
            )}
            {error && (
              <p role="alert" className="text-sm text-destructive">
                {error}
              </p>
            )}
            <Button
              type="button"
              variant="ghost"
              size="lg"
              className="min-h-11 w-full rounded-full"
              onClick={() => void goHome({ yieldToRecovery: true })}
            >
              Back to Vela
            </Button>
          </div>
        )}

        {stage === "ok" && (
          <>
            <p className="mt-3 leading-relaxed text-muted-foreground">
              Choose something you'll remember. You'll be signed in straight after.
            </p>

            <form onSubmit={submit} className="mt-8 space-y-5">
              <div>
                <Label htmlFor="password">New password</Label>
                <Input
                  id="password"
                  type="password"
                  required
                  minLength={6}
                  autoComplete="new-password"
                  autoFocus
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="mt-2 rounded-2xl bg-card/70"
                />
              </div>

              <div>
                <Label htmlFor="confirm">Type it once more</Label>
                <Input
                  id="confirm"
                  type="password"
                  required
                  minLength={6}
                  autoComplete="new-password"
                  value={confirm}
                  onChange={(e) => setConfirm(e.target.value)}
                  className="mt-2 rounded-2xl bg-card/70"
                />
              </div>

              {error && (
                <p role="alert" className="text-sm text-destructive">
                  {error}
                </p>
              )}

              <Button
                type="submit"
                size="lg"
                className="min-h-11 w-full rounded-full"
                disabled={busy}
              >
                {busy && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Save new password
              </Button>
            </form>
          </>
        )}
      </main>
      <LegalFooter />
    </div>
  );
}
