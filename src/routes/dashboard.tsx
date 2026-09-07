import { empty, cta } from "@/lib/microcopy";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { AppShell } from "@/components/app-shell";
import { AuthGate } from "@/components/auth-gate";
import { useStore, weekNumber, todayStr, nextScreeningDue } from "@/lib/store";
import { Button } from "@/components/ui/button";
import { BookOpen, ClipboardCheck, MessageCircleHeart, ShieldCheck, AlertTriangle, ChevronRight, Sun, FileHeart, Loader2, Moon } from "lucide-react";
import { DisclosureSection } from "@/components/disclosure-section";
import { useState } from "react";

import { educationModules } from "@/lib/education";
import { InfantStatesModule } from "@/components/infant-states";
import { AgentStatus } from "@/components/agent-status";
import { startAgentTask, endAgentTask } from "@/lib/agent-tasks";
import { ShareCheckinsCard } from "@/components/share-checkins";
import { DraftApprovalQueue } from "@/components/DraftApprovalQueue";
import { InviteCaregiverCard } from "@/components/invite-caregiver-card";
import { CareFeedCard } from "@/components/care/care-feed-card";



export const Route = createFileRoute("/dashboard")({
  head: () => ({
    meta: [
      { title: "Your Home Base — Vela" },
      {
        name: "description",
        content:
          "Your postpartum home base: today's check-in, this week's learning, screening reminders, and gentle nudges toward support.",
      },
      { property: "og:title", content: "Your Home Base — Vela" },
      {
        property: "og:description",
        content: "Today's check-in, this week's learning, and screening reminders in one calm place.",
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
  const thisWeekModule = educationModules.find((m) => m.week === Math.min(Math.max(week, 1), 6)) ?? educationModules[0];

  const greeting = (() => {
    const h = new Date().getHours();
    if (h < 12) return "Good morning";
    if (h < 18) return "Good afternoon";
    return "Good evening";
  })();

  return (
    <AppShell>
      <div className="mb-6">
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

      <DraftApprovalQueue />

      {/* One primary action for the day. */}
      <div className="mb-6 rounded-2xl border border-border/60 bg-card/70 p-5 shadow-sm">
        <div className="flex items-start gap-3">
          <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-primary/10 text-primary">
            <ClipboardCheck className="h-5 w-5" />
          </span>
          <div className="min-w-0 flex-1">
            <h2 className="font-serif text-xl">Daily check-in</h2>
            <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
              {didToday
                ? empty.checkedInToday
                : checkins.length === 0
                  ? empty.noCheckinsYet
                  : "Sixty seconds. Mood, sleep, feeding, overall."}
            </p>
          </div>
        </div>
        <div className="mt-4">
          <Link to="/checkin">
            <Button className="h-12 w-full rounded-full" disabled={didToday}>
              {didToday ? "Check back tomorrow" : cta.start}
            </Button>
          </Link>
        </div>
        {due && (
          <p className="mt-3 text-sm text-muted-foreground">
            Week {due.week} milestone:{" "}
            <Link to="/screening" className="font-medium text-primary underline-offset-4 hover:underline">
              take the EPDS screening
            </Link>
            .
          </p>
        )}
      </div>

      <AgentStatus className="mb-5" />

      {/* Everything else stays folded away until it's wanted. */}
      <DisclosureSection
        icon={Sun}
        title="Today's cues & rhythm"
        hint={`Wake windows at ${Math.max(week, 1)} weeks`}
      >
        <p className="text-sm leading-relaxed text-muted-foreground">
          At {Math.max(week, 1)} weeks, your baby is just beginning to explore active alert moments. Look for gentle
          wake windows around 45–60 minutes — focusing on quiet connection rather than a rigid clock.
        </p>
        <div className="mt-4">
          <InfantStatesModule />
        </div>
        <Link to="/education">
          <Button variant="outline" className="rounded-full">
            Explore today's cues &amp; flow
          </Button>
        </Link>
      </DisclosureSection>

      <DisclosureSection icon={Moon} title="Overnight care" hint="Last night's feeds, diapers and sleep">
        <CareFeedCard />
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
      </DisclosureSection>

      <DisclosureSection icon={BookOpen} title="This week's learning" hint={`${thisWeekModule.title} · ${thisWeekModule.readTime} min read`}>
        <p className="text-sm leading-relaxed text-muted-foreground">{thisWeekModule.summary ?? thisWeekModule.title}</p>
        <div className="mt-4">
          <Link to="/education">
            <Button variant="outline" className="rounded-full">
              Read this week's guide
            </Button>
          </Link>
        </div>
      </DisclosureSection>

      <DisclosureSection icon={ShieldCheck} title="Mood screening" hint={due ? `Week ${due.week} milestone is due` : "EPDS, when it feels right"}>
        <p className="text-sm leading-relaxed text-muted-foreground">
          {due
            ? "A gentle 10-question check on how you've been feeling these last 7 days."
            : empty.noScreeningsYet}
        </p>
        <div className="mt-4">
          <Link to="/screening">
            <Button variant="outline" className="rounded-full">
              Take screening
            </Button>
          </Link>
        </div>
      </DisclosureSection>

      <DisclosureSection icon={FileHeart} title="Sharing & your care team" hint="Handover report, invites, shared check-ins">
        <HandoverReportCard />
        <ShareCheckinsCard />
        <InviteCaregiverCard />
      </DisclosureSection>

      <div className="grid grid-cols-2 gap-3">
        <QuickLink to="/support" icon={MessageCircleHeart} label="Peer community" />
        <QuickLink to="/support" icon={MessageCircleHeart} label="Book a doula" />
      </div>
    </AppShell>
  );
}


function HandoverReportCard() {
  const [pending, setPending] = useState(false);
  const navigate = useNavigate();

  const generate = async () => {
    setPending(true);
    const taskId = startAgentTask("Vela is securely coordinating your care plan…");
    try {
      await new Promise((r) => setTimeout(r, 900));
      await navigate({ to: "/handover" });
    } finally {
      endAgentTask(taskId);
      setPending(false);
    }
  };


  return (
    <Card>
      <div className="flex items-start gap-3">
        <span className="grid place-items-center h-10 w-10 rounded-full bg-primary/10 text-primary">
          <FileHeart className="h-5 w-5" />
        </span>
        <div className="flex-1">
          <h2 className="font-serif text-xl">Pediatrician handover</h2>
          <p className="text-sm text-muted-foreground mt-1 leading-relaxed">
            A calm, one-page summary of how you and baby have been doing — easy to share at your next visit.
          </p>
        </div>
      </div>
      <div className="mt-4">
        <Button
          onClick={generate}
          disabled={pending}
          className="w-full rounded-full h-12 shadow-sm transition-all hover:shadow-md disabled:opacity-70"
        >
          {pending ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              Preparing your summary…
            </>
          ) : (
            <>
              <FileHeart className="h-4 w-4" />
              Generate Pediatrician Handover Report
            </>
          )}
        </Button>
      </div>
    </Card>
  );
}

function Card({ children }: { children: React.ReactNode }) {
  return <div className="rounded-2xl bg-card/70 border border-border/60 p-5 mb-4 shadow-sm">{children}</div>;
}

function QuickLink({ to, icon: Icon, label }: { to: string; icon: React.ComponentType<{ className?: string }>; label: string }) {
  return (
    <Link to={to} className="rounded-2xl bg-secondary p-4 flex items-center justify-between min-h-14 hover:bg-sand-deep transition-colors">
      <div className="flex items-center gap-2">
        <Icon className="h-4 w-4 text-primary" />
        <span className="text-sm font-medium">{label}</span>
      </div>
      <ChevronRight className="h-4 w-4 text-muted-foreground" />
    </Link>
  );
}