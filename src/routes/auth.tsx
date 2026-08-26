import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { LegalFooter } from "@/components/legal-footer";

function safeNext(value: unknown): string | undefined {
  if (typeof value !== "string") return undefined;
  return value.startsWith("/") && !value.startsWith("//") ? value : undefined;
}

export const Route = createFileRoute("/auth")({
  validateSearch: (s: Record<string, unknown>) => ({ next: safeNext(s.next) }),
  head: () => ({
    meta: [
      { title: "Sign in — Vela" },
      { name: "description", content: "Sign in to Vela to keep your check-ins, learning, and support in one warm place." },
      { property: "og:title", content: "Sign in — Vela" },
      { property: "og:description", content: "Sign in to Vela to keep your check-ins, learning, and support in one warm place." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: AuthPage,
});

function AuthPage() {
  const nav = useNavigate();
  const { next } = Route.useSearch();
  const { user, loading } = useAuth();
  const [mode, setMode] = useState<"signin" | "signup">("signup");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!loading && user) {
      if (next) window.location.href = next;
      else nav({ to: "/dashboard" });
    }
  }, [loading, user, nav, next]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      if (mode === "signup") {
        const { error } = await supabase.auth.signUp({
          email: email.trim(),
          password,
          options: {
            emailRedirectTo: `${window.location.origin}${next ?? "/dashboard"}`,
            data: { display_name: name.trim() },
          },
        });
        if (error) throw error;
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
        if (error) throw error;
      }
      if (next) window.location.href = next;
      else nav({ to: "/onboarding" });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something didn't go through. Try again in a moment.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div
      className="min-h-dvh flex flex-col"
      style={{ backgroundImage: "var(--gradient-welcome)", backgroundAttachment: "fixed" }}
    >
      <main className="flex-1 w-full max-w-md mx-auto px-6 py-14">
        <h1 className="text-3xl font-serif lowercase">
          {mode === "signup" ? "let's make you a space." : "welcome back."}
        </h1>
        <p className="mt-3 text-muted-foreground leading-relaxed">
          {mode === "signup"
            ? "Your check-ins and notes stay private to you, saved so you never have to start over."
            : "Sign in to pick up right where you left off."}
        </p>

        <form onSubmit={submit} className="mt-8 space-y-5">
          {mode === "signup" && (
            <div>
              <Label htmlFor="name">What should we call you?</Label>
              <Input id="name" value={name} onChange={(e) => setName(e.target.value)} className="mt-2 rounded-2xl bg-card/70" placeholder="First name" />
            </div>
          )}
          <div>
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              required
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="mt-2 rounded-2xl bg-card/70"
            />
          </div>
          <div>
            <Label htmlFor="password">Password</Label>
            <Input
              id="password"
              type="password"
              required
              minLength={6}
              autoComplete={mode === "signup" ? "new-password" : "current-password"}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="mt-2 rounded-2xl bg-card/70"
            />
          </div>

          {error && (
            <p role="alert" className="text-sm text-destructive">
              {error}
            </p>
          )}

          <Button type="submit" size="lg" className="rounded-full w-full" disabled={busy}>
            {busy && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {mode === "signup" ? "Create my space" : "Sign in"}
          </Button>
        </form>

        <button
          type="button"
          onClick={() => {
            setMode(mode === "signup" ? "signin" : "signup");
            setError(null);
          }}
          className="mt-6 text-sm text-primary underline underline-offset-4"
        >
          {mode === "signup" ? "I already have an account" : "I'm new here — create an account"}
        </button>
      </main>
      <LegalFooter />
    </div>
  );
}
