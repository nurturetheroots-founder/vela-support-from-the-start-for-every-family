import { empty, cta } from "@/lib/microcopy";
import { createFileRoute, Link } from "@tanstack/react-router";
import { AppShell } from "@/components/app-shell";
import { AuthGate } from "@/components/auth-gate";
import { useStore, weekNumber, todayStr, nextScreeningDue } from "@/lib/store";
import { Button } from "@/components/ui/button";
import { BookOpen, ClipboardCheck, MessageCircleHeart, ShieldCheck, AlertTriangle, ChevronRight, Sun, FileHeart, Loader2 } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { educationModules } from "@/lib/education";
import { InfantStatesModule } from "@/components/infant-states";
import { AgentStatus } from "@/components/agent-status";
import { startAgentTask, endAgentTask } from "@/lib/agent-tasks";

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
      { property: "og:url", content: "https://vela-maternity-care.lovable.app/dashboard" },
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
        <h1 className="text-3xl font-serif mt-1">{greeting}{profile.name ? `, ${profile.name}` : ""}.</h1>
      </div>

      <AgentStatus className="mb-5" />


      {flagged && (
        <div className="mb-5 rounded-2xl bg-clay/10 border border-clay/30 p-4 flex gap-3">
          <AlertTriangle className="h-5 w-5 text-clay mt-0.5" />
          <div className="text-sm">
            <div className="font-medium">We're noticing a few hard days in a row.</div>
            <p className="text-muted-foreground mt-1">That's worth honoring. Would it feel okay to take the EPDS screening, or to reach out to a doula?</p>
          </div>
        </div>
      )}

      <Card>
        <div className="flex items-start gap-3">
          <span className="grid place-items-center h-10 w-10 rounded-full bg-primary/10 text-primary">
            <Sun className="h-5 w-5" />
          </span>
          <div className="flex-1">
            <h2 className="font-serif text-xl">Your {Math.max(week, 1)}-week rhythm &amp; wake windows</h2>
            <p className="text-sm text-muted-foreground mt-1 leading-relaxed">
              At {Math.max(week, 1)} weeks, your baby is just beginning to explore active alert moments. Look for gentle
              wake windows around 45–60 minutes — focusing on quiet connection rather than a rigid clock.
            </p>
          </div>
        </div>
        <div className="mt-4">
          <Link to="/education"><Button variant="outline" className="rounded-full">Explore today's cues &amp; flow</Button></Link>
        </div>
      </Card>

      <Card>
        <div className="flex items-start gap-3">
          <span className="grid place-items-center h-10 w-10 rounded-full bg-primary/10 text-primary">
            <ClipboardCheck className="h-5 w-5" />
          </span>
          <div className="flex-1">
            <h2 className="font-serif text-xl">Daily check-in</h2>
            <p className="text-sm text-muted-foreground mt-1">
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
            <Button className="rounded-full" disabled={didToday}>
              {didToday ? "Check back tomorrow" : cta.start}
            </Button>
          </Link>
        </div>
      </Card>

      {due && (
        <Card>
          <div className="flex items-start gap-3">
            <span className="grid place-items-center h-10 w-10 rounded-full bg-primary/10 text-primary">
              <ShieldCheck className="h-5 w-5" />
            </span>
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <h2 className="font-serif text-xl">EPDS screening</h2>
                <span className="text-xs rounded-full bg-clay/15 text-clay px-2 py-0.5">
                  Week {due.week} milestone
                </span>
              </div>
              <p className="text-sm text-muted-foreground mt-1">
                A gentle 10-question check on how you've been feeling these last 7 days.
              </p>
            </div>
          </div>
          <div className="mt-4">
            <Link to="/screening"><Button variant="outline" className="rounded-full">Take screening</Button></Link>
          </div>
        </Card>
      )}

      {!due && screenings.length === 0 && (
        <Card>
          <div className="flex items-start gap-3">
            <span className="grid place-items-center h-10 w-10 rounded-full bg-primary/10 text-primary">
              <ShieldCheck className="h-5 w-5" />
            </span>
            <div className="flex-1">
              <h2 className="font-serif text-xl">Mood screening</h2>
              <p className="text-sm text-muted-foreground mt-1 leading-relaxed">
                {empty.noScreeningsYet}
              </p>
            </div>
          </div>
        </Card>
      )}

      <Card>
        <div className="flex items-start gap-3">
          <span className="grid place-items-center h-10 w-10 rounded-full bg-primary/10 text-primary">
            <BookOpen className="h-5 w-5" />
          </span>
          <div className="flex-1">
            <h2 className="font-serif text-xl">This week's learning</h2>
            <p className="text-sm text-muted-foreground mt-1">
              {thisWeekModule.title} · {thisWeekModule.readTime} min read
            </p>
          </div>
        </div>
        <div className="mt-4">
          <Link to="/education"><Button variant="outline" className="rounded-full">Read this week's guide</Button></Link>
        </div>
      </Card>

      <InfantStatesModule />

      <HandoverReportCard />


      <div className="grid grid-cols-2 gap-3">
        <QuickLink to="/support" icon={MessageCircleHeart} label="Peer community" />
        <QuickLink to="/support" icon={MessageCircleHeart} label="Book a doula" />
      </div>
    </AppShell>
  );
}

function HandoverReportCard() {
  const [pending, setPending] = useState(false);
  const [sent, setSent] = useState(false);

  const generate = async () => {
    setPending(true);
    const taskId = startAgentTask("Vela is securely coordinating your care plan…");
    try {
      // Placeholder until the report API is wired up.
      await new Promise((r) => setTimeout(r, 1600));
      setSent(true);
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
      <HandoverSentDialog open={sent} onOpenChange={setSent} />
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