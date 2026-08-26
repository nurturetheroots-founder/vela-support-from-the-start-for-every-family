import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { AppShell } from "@/components/app-shell";
import { Button } from "@/components/ui/button";
import { BellRing, CheckCircle2, Phone, Sparkles } from "lucide-react";
import {
  acknowledgeEscalation,
  alertBody,
  alertTitle,
  fetchOpenEscalations,
  fetchSignals,
  signalCopy,
  type DerivedSignal,
  type Escalation,
} from "@/lib/alerts";

export const Route = createFileRoute("/alerts")({
  head: () => ({
    meta: [
      { title: "Your notices — Vela" },
      {
        name: "description",
        content:
          "Gentle notices Vela has surfaced from your recent check-ins and screenings, with ways to reach real support.",
      },
      { property: "og:title", content: "Your notices — Vela" },
      {
        property: "og:description",
        content: "Gentle notices from your recent check-ins and screenings, with ways to reach real support.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: AlertsPage,
});

function formatWhen(iso: string) {
  return new Date(iso).toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

function AlertsPage() {
  const [escalations, setEscalations] = useState<Escalation[]>([]);
  const [signals, setSignals] = useState<DerivedSignal[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);

  const load = async () => {
    try {
      const [e, s] = await Promise.all([fetchOpenEscalations(), fetchSignals()]);
      setEscalations(e);
      setSignals(s);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
  }, []);

  const open = escalations.filter((e) => e.status === "open");
  const handled = escalations.filter((e) => e.status !== "open");

  const acknowledge = async (id: string) => {
    setBusy(id);
    try {
      await acknowledgeEscalation(id);
      await load();
    } finally {
      setBusy(null);
    }
  };

  return (
    <AppShell>
      <h1 className="font-serif text-3xl">Your notices</h1>
      <p className="mt-2 text-muted-foreground leading-relaxed">
        Quiet observations from your check-ins and screenings. Nothing here is a diagnosis — it&apos;s a nudge toward
        support that might help.
      </p>

      {loading ? (
        <p className="mt-8 text-sm text-muted-foreground">Gathering your notices…</p>
      ) : (
        <>
          {open.length === 0 && (
            <div className="mt-8 rounded-2xl bg-secondary p-6 text-center">
              <Sparkles className="h-6 w-6 mx-auto text-primary" />
              <p className="mt-3 text-sm text-muted-foreground leading-relaxed">
                Nothing needs your attention right now. Your check-ins are still being held here.
              </p>
            </div>
          )}

          {open.map((e) => (
            <article key={e.id} className="mt-6 rounded-2xl border border-primary/30 bg-card/70 p-5">
              <div className="flex items-start gap-3">
                <span className="grid place-items-center h-9 w-9 shrink-0 rounded-full bg-primary/15 text-primary">
                  <BellRing className="h-4 w-4" />
                </span>
                <div>
                  <h2 className="font-serif text-xl leading-snug">{alertTitle(e.trigger_type)}</h2>
                  <p className="text-xs text-muted-foreground mt-0.5">{formatWhen(e.triggered_at)}</p>
                </div>
              </div>

              <p className="mt-4 text-sm leading-relaxed">{alertBody(e.trigger_type)}</p>
              {e.trigger_detail && (
                <p className="mt-2 text-xs text-muted-foreground leading-relaxed">{e.trigger_detail}</p>
              )}

              <div className="mt-5 flex flex-wrap gap-2">
                <Button asChild variant="secondary" className="min-h-11">
                  <a href="tel:18339435746">
                    <Phone className="h-4 w-4" /> Call the maternal mental health line
                  </a>
                </Button>
                <Button
                  variant="outline"
                  className="min-h-11"
                  disabled={busy === e.id}
                  onClick={() => acknowledge(e.id)}
                >
                  <CheckCircle2 className="h-4 w-4" /> I&apos;ve seen this
                </Button>
              </div>
            </article>
          ))}

          {signals.length > 0 && (
            <section className="mt-10">
              <h2 className="font-serif text-xl">What we noticed</h2>
              <ul className="mt-3 space-y-2">
                {signals.map((s) => (
                  <li key={s.id} className="rounded-xl bg-secondary px-4 py-3 text-sm">
                    <span>{signalCopy[s.signal_type] ?? s.signal_type}</span>
                    <span className="block text-xs text-muted-foreground mt-0.5">{formatWhen(s.computed_at)}</span>
                  </li>
                ))}
              </ul>
            </section>
          )}

          {handled.length > 0 && (
            <section className="mt-10">
              <h2 className="font-serif text-xl">Already seen</h2>
              <ul className="mt-3 space-y-2">
                {handled.map((e) => (
                  <li key={e.id} className="rounded-xl bg-secondary/60 px-4 py-3 text-sm text-muted-foreground">
                    {alertTitle(e.trigger_type)} · {formatWhen(e.triggered_at)}
                  </li>
                ))}
              </ul>
            </section>
          )}
        </>
      )}
    </AppShell>
  );
}
