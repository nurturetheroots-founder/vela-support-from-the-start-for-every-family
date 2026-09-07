import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Heart, Moon, Milk, Baby, Loader2, ArrowRight } from "lucide-react";
import { AppShell } from "@/components/app-shell";
import { AuthGate } from "@/components/auth-gate";
import {
  findBaby,
  fetchLatestPublishedHandover,
  formatDuration,
  type ShiftHandover,
} from "@/lib/care-log";

export const Route = createFileRoute("/care-summary")({
  head: () => ({
    meta: [
      { title: "Your morning summary — Vela" },
      {
        name: "description",
        content:
          "A warm, plain-language recap of your baby's night from your care team: sleep, feeds, diapers, and a note from your caregiver.",
      },
      { property: "og:title", content: "Your morning summary — Vela" },
      {
        property: "og:description",
        content: "How the night went, in plain language, with a note from your caregiver.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: () => (
    <AuthGate>
      <CareSummaryPage />
    </AuthGate>
  ),
});

function CareSummaryPage() {
  const [handover, setHandover] = useState<ShiftHandover | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const baby = await findBaby();
        const h = baby ? await fetchLatestPublishedHandover(baby.id) : null;
        if (!cancelled) setHandover(h);
      } catch {
        /* offline — show the calm empty state */
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const m = handover?.summary_metrics;

  return (
    <AppShell>
      <h1 className="font-serif text-2xl">Your morning summary</h1>
      <p className="mt-1 text-sm text-muted-foreground">How the night went, in plain language.</p>

      {loading ? (
        <div className="mt-6 flex items-center gap-2 text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" /> Gathering last night…
        </div>
      ) : !handover ? (
        <div className="mt-6 rounded-3xl border border-border/60 bg-card/70 p-8 text-center">
          <p className="text-muted-foreground">
            No summary yet. When your caregiver finishes a shift, their note will land right here.
          </p>
          <Link
            to="/care"
            className="mt-4 inline-flex items-center gap-1 text-sm font-medium text-primary underline-offset-4 hover:underline"
          >
            Open the caregiver tracker <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      ) : (
        <div className="mt-6 space-y-4">
          {handover.caregiver_notes?.trim() && (
            <section className="rounded-3xl border border-border/60 bg-secondary/70 p-6">
              <p className="flex items-center gap-2 text-xs uppercase tracking-widest text-muted-foreground">
                <Heart className="h-3.5 w-3.5 text-primary" /> A note from your caregiver
              </p>
              <p className="mt-3 whitespace-pre-line font-serif text-lg leading-relaxed">
                {handover.caregiver_notes}
              </p>
            </section>
          )}

          <section className="grid gap-3 sm:grid-cols-2">
            <Highlight
              icon={Moon}
              headline={`Baby slept a longest stretch of ${formatDuration(m?.longest_sleep_stretch_mins ?? 0)}`}
              sub="Longest continuous rest"
            />
            <Highlight
              icon={Milk}
              headline={
                m?.total_oz
                  ? `Fed ${m.total_oz} oz across ${m.feed_count} feed${m.feed_count === 1 ? "" : "s"}`
                  : `${m?.total_nursing_mins ?? 0} minutes of nursing across ${m?.feed_count ?? 0} feeds`
              }
              sub="Nourishment overnight"
            />
            <Highlight
              icon={Baby}
              headline={`${m?.wet_diapers ?? 0} wet and ${m?.dirty_diapers ?? 0} dirty diapers`}
              sub="A steady sign things are working"
            />
          </section>

          <p className="text-center text-xs text-muted-foreground">
            Shift ended{" "}
            {new Date(handover.shift_end).toLocaleString(undefined, {
              weekday: "long",
              hour: "numeric",
              minute: "2-digit",
            })}
          </p>
        </div>
      )}
    </AppShell>
  );
}

function Highlight({
  icon: Icon,
  headline,
  sub,
}: {
  icon: typeof Moon;
  headline: string;
  sub: string;
}) {
  return (
    <div className="rounded-3xl border border-border/60 bg-card/70 p-5">
      <span className="grid h-10 w-10 place-items-center rounded-full bg-primary/10 text-primary">
        <Icon className="h-5 w-5" />
      </span>
      <p className="mt-3 font-serif text-lg leading-snug">{headline}</p>
      <p className="mt-1 text-sm text-muted-foreground">{sub}</p>
    </div>
  );
}
