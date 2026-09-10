import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { LegalFooter } from "@/components/legal-footer";

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
  const [ready, setReady] = useState<"checking" | "ok" | "expired">("checking");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Arriving from the emailed link, supabase-js exchanges the token in the URL
    // for a short-lived recovery session. That can land either before this
    // mounts or just after, so check once and also listen for the event.
    let settled = false;

    const { data: sub } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === "PASSWORD_RECOVERY" || session) {
        settled = true;
        setReady("ok");
      }
    });

    void supabase.auth.getSession().then(({ data }) => {
      if (data.session) {
        settled = true;
        setReady("ok");
        return;
      }
      // No session and no event within a moment means the link was already
      // used, or it expired.
      window.setTimeout(() => {
        if (!settled) setReady("expired");
      }, 2500);
    });

    return () => sub.subscription.unsubscribe();
  }, []);

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
      await nav({ to: "/dashboard" });
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

        {ready === "checking" && (
          <p className="mt-6 flex items-center gap-2 text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" /> Checking your link…
          </p>
        )}

        {ready === "expired" && (
          <div className="mt-6 space-y-4">
            <p className="leading-relaxed text-muted-foreground">
              That link has expired or was already used. Reset links are good for one hour, and only
              once.
            </p>
            <Button asChild size="lg" className="min-h-11 w-full rounded-full">
              <Link to="/auth">Ask for a new link</Link>
            </Button>
          </div>
        )}

        {ready === "ok" && (
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
