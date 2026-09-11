import { useState } from "react";
import { createFileRoute, Link, redirect } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import { ArrowRight, BookHeart, HeartHandshake, Sparkles, type LucideIcon } from "lucide-react";
import { getState } from "@/lib/store";
import { legal } from "@/lib/microcopy";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Vela — Fourth Trimester Care, Birth to 4 Months" },
      {
        name: "description",
        content:
          "Vela companions you from birth to 4 months with daily check-ins, weekly learning, gentle mood screening, and real human support when you need it.",
      },
      { property: "og:title", content: "Vela — Fourth Trimester Care, Birth to 4 Months" },
      {
        property: "og:description",
        content:
          "Vela companions you from birth to 4 months with daily check-ins, weekly learning, gentle mood screening, and real human support when you need it.",
      },
    ],
  }),
  beforeLoad: () => {
    if (typeof window !== "undefined" && getState().profile.onboarded) {
      throw redirect({ to: "/dashboard" });
    }
  },
  component: Landing,
});

type Card = { icon: LucideIcon; title: string; body: string; tone: "clay" | "sage" };

type Slide = {
  eyebrow: string;
  headLead: string;
  headAccent: string;
  body: string;
  orb?: boolean;
  cards?: Card[];
  cta: string;
};

const slides: Slide[] = [
  {
    eyebrow: "Welcome",
    headLead: "You are here,",
    headAccent: "and that matters.",
    body: "Whether you are expecting, just had your baby, or somewhere in the middle of the beautiful chaos — Vela is here to walk alongside you. Not to tell you what to do, but to make sure you never feel like you are doing it alone.",
    orb: true,
    cta: "Let us begin",
  },
  {
    eyebrow: "How Vela works",
    headLead: "Small moments of",
    headAccent: "support, every day.",
    body: "Three layers of care, designed to meet you wherever you are today.",
    cards: [
      {
        icon: Sparkles,
        tone: "clay",
        title: "Daily check-ins",
        body: "60 seconds. No judgment. Every feeling is the right feeling.",
      },
      {
        icon: BookHeart,
        tone: "sage",
        title: "Weekly guides",
        body: "Tailored to your stage — emotions, recovery, sleep, identity.",
      },
      {
        icon: HeartHandshake,
        tone: "clay",
        title: "Human support",
        body: "Peer community, doula sessions, and therapist referrals on a sliding scale.",
      },
    ],
    cta: "Continue",
  },
  {
    eyebrow: "What comes next",
    headLead: "From birth",
    headAccent: "through month four.",
    body: "We will ask a few gentle questions about you and your baby, then shape Vela around your days. You can change anything, anytime.",
    orb: true,
    cta: "Begin with Vela",
  },
];

function Landing() {
  const [i, setI] = useState(0);
  const slide = slides[i]!;
  const last = i === slides.length - 1;

  return (
    <div
      className="min-h-dvh flex flex-col text-foreground"
      style={{ backgroundImage: "var(--gradient-welcome)" }}
    >
      <header className="px-7 pt-12 pb-2 flex items-center justify-between">
        <span className="font-serif text-2xl tracking-[0.38em] lowercase">vela</span>
        <div className="flex items-center gap-2" role="tablist" aria-label="Welcome steps">
          {slides.map((s, idx) => (
            <button
              key={s.eyebrow}
              type="button"
              role="tab"
              aria-selected={idx === i}
              aria-label={`Step ${idx + 1}: ${s.eyebrow}`}
              onClick={() => setI(idx)}
              className={
                idx === i
                  ? "h-1.5 w-7 rounded-full bg-clay transition-all"
                  : "h-1.5 w-1.5 rounded-full bg-sand-deep transition-all"
              }
            />
          ))}
        </div>
      </header>

      <main className="flex-1 px-7 pt-10 pb-6 max-w-xl w-full">
        <p className="text-xs uppercase tracking-[0.32em] text-muted-foreground">{slide.eyebrow}</p>
        <h1 className="mt-6 font-serif text-[2.6rem] sm:text-5xl leading-[1.1] font-normal">
          {slide.headLead} <span className="italic text-clay">{slide.headAccent}</span>
        </h1>
        <p className="mt-7 text-lg leading-[1.7] text-muted-foreground">{slide.body}</p>

        {slide.orb ? (
          <div className="mt-12 flex justify-center" aria-hidden="true">
            <div className="relative h-52 w-52 grid place-items-center">
              <div
                className="absolute inset-0 rounded-full blur-2xl opacity-70"
                style={{
                  background:
                    "radial-gradient(circle, color-mix(in oklab, var(--clay) 35%, transparent) 0%, transparent 70%)",
                }}
              />
              <div className="relative h-44 w-44 rounded-full bg-accent/60" />
              <div className="absolute h-28 w-28 rounded-full bg-welcome-blush/50 -translate-y-3" />
            </div>
          </div>
        ) : null}

        {slide.cards ? (
          <div className="mt-8 space-y-4">
            {slide.cards.map(({ icon: Icon, title, body, tone }) => (
              <div
                key={title}
                className="rounded-3xl bg-card/70 border border-border/60 p-5 flex gap-4"
              >
                <span
                  className={`grid place-items-center h-12 w-12 shrink-0 rounded-2xl ${
                    tone === "clay" ? "bg-clay/12 text-clay" : "bg-primary/12 text-primary"
                  }`}
                >
                  <Icon className="h-5 w-5" />
                </span>
                <div>
                  <h2 className="font-sans text-lg font-medium">{title}</h2>
                  <p className="mt-1 text-[0.95rem] leading-relaxed text-muted-foreground">
                    {body}
                  </p>
                </div>
              </div>
            ))}
          </div>
        ) : null}
      </main>

      <footer className="px-7 pb-12 pt-2 max-w-xl w-full space-y-4">
        {last ? (
          <Link to="/onboarding" className="block">
            <Button
              size="lg"
              className="w-full rounded-2xl h-14 text-base bg-clay text-primary-foreground hover:bg-clay/90"
            >
              {slide.cta}
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </Link>
        ) : (
          <Button
            size="lg"
            className="w-full rounded-2xl h-14 text-base bg-clay text-primary-foreground hover:bg-clay/90"
            onClick={() => setI((n) => Math.min(n + 1, slides.length - 1))}
          >
            {slide.cta}
            <ArrowRight className="ml-2 h-4 w-4" />
          </Button>
        )}
        <Link
          to="/onboarding"
          className="block text-center text-sm text-muted-foreground underline-offset-4 hover:underline"
        >
          I already have an account
        </Link>
        <p className="pt-2 text-center text-xs leading-relaxed text-muted-foreground/80">
          {legal.disclaimer}
        </p>
      </footer>
    </div>
  );
}
