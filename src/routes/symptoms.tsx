import { createFileRoute, redirect } from "@tanstack/react-router";
import { AppShell } from "@/components/app-shell";
import { getState } from "@/lib/store";
import {
  Phone,
  PhoneCall,
  AlertTriangle,
  Stethoscope,
  HeartPulse,
  MessageSquare,
} from "lucide-react";

export const Route = createFileRoute("/symptoms")({
  head: () => ({
    meta: [
      { title: "Symptom Checker & Red Flags — Vela" },
      {
        name: "description",
        content:
          "Know which postpartum symptoms need attention now, which need a call to your provider, and which are common in recovery.",
      },
      { property: "og:title", content: "Symptom Checker & Red Flags — Vela" },
      {
        property: "og:description",
        content:
          "Know which postpartum symptoms need attention now, which need a call to your provider, and which are common in recovery.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  beforeLoad: () => {
    if (typeof window !== "undefined" && !getState().profile.onboarded) {
      throw redirect({ to: "/onboarding" });
    }
  },
  component: SymptomsPage,
});

const emergency = [
  "Heavy bleeding — soaking through a pad in an hour, or passing clots larger than an egg",
  "Chest pain, trouble breathing, or a racing heart that won't settle",
  "A seizure, fainting, or sudden confusion",
  "Severe headache with vision changes, or a headache that won't ease with medication",
  "Thoughts of harming yourself or your baby",
];

const sameDay = [
  "Fever of 100.4°F (38°C) or higher",
  "A red, hot, painful area on your breast with chills or body aches",
  "Incision or tear site that's warm, swollen, oozing, or newly painful",
  "Pain, redness, or swelling in one leg",
  "Feeling like you can't sleep even when the baby sleeps, for several nights running",
];

const common = [
  "Afterpains and cramping while feeding, easing through the first weeks",
  "Night sweats as hormone levels shift",
  "Tearfulness and mood swings in the first two weeks",
  "Hair shedding, usually starting around month three",
];

function SymptomsPage() {
  return (
    <AppShell>
      <HelpBanner />

      <h1 className="font-serif text-3xl mt-6">Your safety &amp; care always come first</h1>
      <p className="mt-2 text-muted-foreground leading-relaxed">
        If you feel something isn't right, trust your instincts. Here is a clear guide on when to
        call your care team.
      </p>

      <section className="mt-8">
        <SectionHead
          icon={AlertTriangle}
          eyebrow="Urgent red flags"
          title="Seek immediate medical care (call 911)"
          note="Don't wait, and don't drive yourself if you can help it."
        />
        <ul className="mt-4 space-y-3">
          {emergency.map((item) => (
            <li key={item} className="rounded-2xl border border-clay/30 bg-clay/10 p-5">
              <p className="leading-relaxed">{item}</p>
              <a
                href="tel:911"
                className="mt-4 inline-flex items-center justify-center gap-2 rounded-full bg-clay px-5 min-h-12 text-sm font-medium text-background transition-opacity hover:opacity-90"
              >
                <PhoneCall className="h-4 w-4" aria-hidden="true" />
                Call 911
              </a>
            </li>
          ))}
        </ul>
      </section>

      <section className="mt-12">
        <SectionHead
          icon={Stethoscope}
          eyebrow="Needs attention"
          title="Call your doctor or midwife (within 24h)"
          note="These are treatable — and much easier treated early."
        />
        <ul className="mt-4 space-y-3">
          {sameDay.map((item) => (
            <li
              key={item}
              className="rounded-2xl border border-border/60 bg-card p-5 leading-relaxed"
            >
              {item}
            </li>
          ))}
        </ul>
      </section>

      <section className="mt-12">
        <SectionHead
          icon={HeartPulse}
          eyebrow="Common in recovery"
          title="Usually nothing to worry about"
          note="Still worth mentioning at your next visit if it's wearing on you."
        />
        <ul className="mt-4 space-y-3">
          {common.map((item) => (
            <li key={item} className="rounded-2xl bg-secondary p-5 leading-relaxed">
              {item}
            </li>
          ))}
        </ul>
      </section>

      <p className="mt-12 text-xs text-muted-foreground leading-relaxed">
        This page is educational and doesn't replace care from your clinician.
      </p>

      <div className="h-16 sm:hidden" />
      <MobileHelpBar />
    </AppShell>
  );
}

function SectionHead({
  icon: Icon,
  eyebrow,
  title,
  note,
}: {
  icon: React.ComponentType<{ className?: string }>;
  eyebrow: string;
  title: string;
  note: string;
}) {
  return (
    <div className="grid grid-cols-[auto_minmax(0,1fr)] items-start gap-3">
      <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-primary/10 text-primary">
        <Icon className="h-5 w-5" />
      </span>
      <div className="min-w-0">
        <p className="text-xs uppercase tracking-wider text-primary">{eyebrow}</p>
        <h2 className="font-serif text-2xl mt-0.5">{title}</h2>
        <p className="mt-1 text-sm text-muted-foreground">{note}</p>
      </div>
    </div>
  );
}

function HelpBanner() {
  return (
    <div className="sticky top-14 z-20 -mx-5 border-b border-primary/20 bg-primary px-5 py-3 text-primary-foreground shadow-sm">
      <p className="text-xs uppercase tracking-wider opacity-90">
        Talk to someone now — free, 24/7
      </p>
      <div className="mt-2 grid gap-2 sm:grid-cols-2">
        <a
          href="tel:18339435746"
          className="flex min-h-12 items-center justify-center gap-2 rounded-full bg-background px-4 text-sm font-medium text-foreground transition-opacity hover:opacity-90"
        >
          <Phone className="h-4 w-4 shrink-0" aria-hidden="true" />
          <span className="truncate">Maternal Mental Health 1-833-943-5746</span>
        </a>
        <a
          href="tel:988"
          className="flex min-h-12 items-center justify-center gap-2 rounded-full border border-primary-foreground/60 px-4 text-sm font-medium transition-colors hover:bg-primary-foreground/10"
        >
          <MessageSquare className="h-4 w-4 shrink-0" aria-hidden="true" />
          <span className="truncate">988 Suicide &amp; Crisis Lifeline</span>
        </a>
      </div>
    </div>
  );
}

function MobileHelpBar() {
  return (
    <div className="fixed inset-x-0 bottom-[4.5rem] z-20 sm:hidden">
      <div className="mx-auto grid max-w-2xl grid-cols-2 gap-2 border-t border-border/60 bg-background/95 px-5 py-2 backdrop-blur">
        <a
          href="tel:18339435746"
          className="flex min-h-12 items-center justify-center gap-2 rounded-full bg-primary px-3 text-xs font-medium text-primary-foreground"
        >
          <Phone className="h-4 w-4 shrink-0" aria-hidden="true" />
          Helpline
        </a>
        <a
          href="tel:988"
          className="flex min-h-12 items-center justify-center gap-2 rounded-full bg-clay px-3 text-xs font-medium text-background"
        >
          <MessageSquare className="h-4 w-4 shrink-0" aria-hidden="true" />
          988 Lifeline
        </a>
      </div>
    </div>
  );
}
