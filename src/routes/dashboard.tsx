import { empty, cta } from "@/lib/microcopy";
import { createFileRoute, Link } from "@tanstack/react-router";
import { AppShell } from "@/components/app-shell";
import { AuthGate } from "@/components/auth-gate";
import { useStore, weekNumber, todayStr, nextScreeningDue } from "@/lib/store";
import { Button } from "@/components/ui/button";
import { ClipboardCheck, AlertTriangle, ChevronRight, Moon } from "lucide-react";

import { InfantStatesModule } from "@/components/infant-states";
import { AgentStatus } from "@/components/agent-status";
import { DraftApprovalQueue } from "@/components/DraftApprovalQueue";
import { CareFeedCard } from "@/components/care/care-feed-card";

export const Route = createFileRoute("/dashboard")({
  head: () => ({
    meta: [
      { title: "Your Home Base — Vela" },
      {
        name: "description",
        content:
          "Your postpartum home base: baby's rhythms right now, last night's care, and one gentle check-in on you.",
      },
      { property: "og:title", content: "Your Home Base — Vela" },
      {
        property: "og:description",
        content: "Baby's rhythms, last night's care, and one gentle check-in on you.",
      },
      { property: "og:type", content: "website" },
      { property: "og:url", content: "https://app.nurturetheroots.co/dashboard" },
      { name: "twitter:card", content: "summary" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: () => (
    <AuthGate requireOnboarded>
      <Dashboard />
    </AuthGate>
  ),
});

function Dashboard() {
  const profile = useStore((s) => s.profile);
  const checkins = useStore((s) => s.checkins);
  const screenings = useStore((s) => s.screenings);
  const { label, week } = weekNumber(profile);
  const today = todayStr();
  const didToday = checkins.some((c) => c.date === today);
  const due = nextScreeningDue(profile, screenings);
  const flagged = checkins.slice(-3).length === 3 && checkins.slice(-3).every((c) => c.mood <= 2);
  const weeks = Math.max(week, 1);

  const greeting = (() => {
    const h = new Date().getHours();
    if (h < 12) return "Good morning";
    if (h < 18) return "Good afternoon";
    return "Good evening";
  })();

  return (
    <AppShell>
      {/* 1 — Right now */}
      <div className="mb-5">
        <p className="text-sm text-primary">{label}</p>
        <h1 className="mt-1 font-serif text-3xl">{`${greeting}${profile.name ? `, ${profile.name}` : ""}.`}</h1>
      </div>

      {flagged && (
        <div className="mb-5 flex gap-3 rounded-2xl border border-clay/30 bg-clay/10 p-4">
          <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-clay" />
          <div className="min-w-0 text-sm">
            <div className="font-medium">We're noticing a few hard days in a row.</div>
            <p className="mt-1 text-muted-foreground">
              That's worth honoring. Would it feel okay to take the EPDS screening, or to reach out to a doula?
            </p>
          </div>
        </div>
      )}

      <InfantStatesModule />

      <DraftApprovalQueue />
      <AgentStatus className="mb-5" />

      {/* 2 — Care continuity */}
      <section className="mb-5 rounded-2xl border border-border/60 bg-card/70 p-5 shadow-sm">
        <div className="flex items-start gap-3">
          <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-primary/10 text-primary">
            <Moon className="h-5 w-5" />
          </span>
          <div className="min-w-0 flex-1">
            <h2 className="font-serif text-xl">Care continuity</h2>
            <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
              At {weeks} {weeks === 1 ? "week" : "weeks"}, wake windows tend to run about 45–60 minutes.
            </p>
          </div>
        </div>

        <div className="mt-4">
          <CareFeedCard />
        </div>

        <div className="mt-4 flex flex-wrap gap-2">
          <Link
            to="/care-summary"
            className="inline-flex min-h-11 items-center gap-1 rounded-full bg-primary px-4 text-sm font-medium text-primary-foreground"
          >
            Morning summary <ChevronRight className="h-4 w-4" />
          </Link>
          <Link
            to="/care"
            className="inline-flex min-h-11 items-center rounded-full border border-border px-4 text-sm font-medium"
          >
            Caregiver tracker
          </Link>
        </div>
      </section>

      {/* 3 — Parent pulse */}
      <section className="rounded-2xl border border-border/60 bg-card/70 p-5 shadow-sm">
        <div className="flex items-start gap-3">
          <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-primary/10 text-primary">
            <ClipboardCheck className="h-5 w-5" />
          </span>
          <div className="min-w-0 flex-1">
            <h2 className="font-serif text-xl">{due ? "A check-in on you" : "Daily check-in"}</h2>
            <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
              {due
                ? `Your week ${due.week} milestone screening is ready when you are.`
                : didToday
                  ? empty.checkedInToday
                  : "Sixty seconds. Mood, sleep, feeding, overall."}
            </p>
          </div>
        </div>
        <div className="mt-4">
          {due ? (
            <Link to="/screening">
              <Button className="h-12 w-full rounded-full">Take the screening</Button>
            </Link>
          ) : (
            <Link to="/checkin">
              <Button className="h-12 w-full rounded-full" disabled={didToday}>
                {didToday ? "Check back tomorrow" : cta.start}
              </Button>
            </Link>
          )}
        </div>
        <Link
          to="/support"
          className="mt-3 inline-flex min-h-11 items-center text-sm text-muted-foreground underline-offset-4 hover:text-foreground hover:underline"
        >
          Your support team
        </Link>
      </section>
    </AppShell>
  );
}
