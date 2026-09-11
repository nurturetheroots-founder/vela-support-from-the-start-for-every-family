import { createFileRoute, redirect, Link } from "@tanstack/react-router";
import { AppShell } from "@/components/app-shell";
import { getState } from "@/lib/store";
import { Button } from "@/components/ui/button";
import { Users, MessageCircleHeart, Stethoscope, Globe2, ChevronRight } from "lucide-react";
import { legal } from "@/lib/microcopy";

export const Route = createFileRoute("/support")({
  head: () => ({ meta: [{ title: "Support — Vela" }] }),
  beforeLoad: () => {
    if (typeof window !== "undefined" && !getState().profile.onboarded) {
      throw redirect({ to: "/onboarding" });
    }
  },
  component: SupportPage,
});

const doulas = [
  {
    name: "Maya R.",
    lang: "English · Spanish",
    specialty: "Postpartum mood, breastfeeding",
    initial: "M",
  },
  {
    name: "Aisha O.",
    lang: "English · Yoruba",
    specialty: "Black maternal health, sleep",
    initial: "A",
  },
  {
    name: "Linh T.",
    lang: "English · Vietnamese",
    specialty: "NICU graduates, feeding",
    initial: "L",
  },
];

function SupportPage() {
  return (
    <AppShell>
      <h1 className="font-serif text-3xl">Support</h1>
      <p className="mt-2 text-muted-foreground">
        Three ways to be held. Use one, use all — at whatever pace feels right.
      </p>

      <Link
        to="/providers"
        className="mt-6 flex items-center justify-between rounded-2xl bg-secondary p-4 min-h-14 hover:bg-sand-deep transition-colors"
      >
        <div>
          <div className="text-sm font-medium">Provider &amp; specialist directory</div>
          <p className="text-xs text-muted-foreground mt-0.5">
            Lactation, mental health, pelvic floor, and doula care near you.
          </p>
        </div>
        <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" />
      </Link>

      <Link
        to="/terms"
        className="mt-3 flex items-center justify-between rounded-2xl border border-border/60 p-4 min-h-14 hover:bg-secondary transition-colors"
      >
        <div>
          <div className="text-sm font-medium">{legal.termsLink}</div>
          <p className="text-xs text-muted-foreground mt-0.5">
            What Vela is, what it isn't, and where to turn in a crisis.
          </p>
        </div>
        <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" />
      </Link>

      <div className="mt-7 space-y-4">
        <TierCard
          icon={Users}
          eyebrow="Free · Peer community"
          title="Other parents, right now"
          body="A moderated forum organized by week and topic. Read quietly, or post when you're ready."
          cta="Browse the community"
          tone="default"
        />
        <TierCard
          icon={MessageCircleHeart}
          eyebrow="Sliding $10–$50 · Doula session"
          title="A doula, on video or text"
          body="Forty-five minute sessions with a trained postpartum doula. Bring anything — feeding, sleep, your mood, your relationship."
          cta="Find a doula"
          tone="primary"
        />
        <TierCard
          icon={Stethoscope}
          eyebrow="Insurance navigation · Therapist referral"
          title="A therapist who takes your insurance"
          body="Tell us what you have and we'll match you with perinatal-trained clinicians, with a warm hand-off rather than a phone-tree."
          cta="Start a referral"
          tone="default"
        />
      </div>

      <section className="mt-12">
        <h2 className="font-serif text-2xl">Meet a few of our doulas</h2>
        <div className="mt-4 grid sm:grid-cols-3 gap-3">
          {doulas.map((d) => (
            <div key={d.name} className="rounded-2xl bg-card/70 border border-border/60 p-5">
              <div className="h-12 w-12 rounded-full bg-primary/10 text-primary grid place-items-center font-serif text-xl">
                {d.initial}
              </div>
              <div className="mt-3 font-medium">{d.name}</div>
              <div className="text-xs text-muted-foreground mt-1 flex items-center gap-1.5">
                <Globe2 className="h-3 w-3" /> {d.lang}
              </div>
              <p className="mt-2 text-sm text-muted-foreground leading-relaxed">{d.specialty}</p>
            </div>
          ))}
        </div>
        <p className="mt-4 text-xs text-muted-foreground">
          Live booking opens soon — for now, sessions are scheduled by message after onboarding.
        </p>
      </section>
    </AppShell>
  );
}

function TierCard({
  icon: Icon,
  eyebrow,
  title,
  body,
  cta,
  tone,
}: {
  icon: React.ComponentType<{ className?: string }>;
  eyebrow: string;
  title: string;
  body: string;
  cta: string;
  tone: "default" | "primary";
}) {
  return (
    <div className="rounded-2xl border border-border/60 bg-card/70 p-5">
      <div className="flex items-start gap-3">
        <span className="grid place-items-center h-10 w-10 rounded-full bg-primary/10 text-primary">
          <Icon className="h-5 w-5" />
        </span>
        <div className="flex-1">
          <p className="text-xs uppercase tracking-wider text-primary">{eyebrow}</p>
          <h3 className="font-serif text-xl mt-1">{title}</h3>
          <p className="mt-2 text-sm text-muted-foreground leading-relaxed">{body}</p>
        </div>
      </div>
      <div className="mt-4">
        <Button variant={tone === "primary" ? "default" : "outline"} className="rounded-full">
          {cta}
        </Button>
      </div>
    </div>
  );
}
