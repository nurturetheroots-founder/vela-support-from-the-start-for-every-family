import { useState } from "react";
import { createFileRoute, Link, redirect } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import { getState } from "@/lib/store";

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

type Slide = {
  eyebrow: string;
  headLead: string;
  headAccent: string;
  body: string;
};

const slides: Slide[] = [
  {
    eyebrow: "Welcome",
    headLead: "You are here,",
    headAccent: "and that matters.",
    body:
      "Whether you are expecting, just had your baby, or somewhere in the middle of the beautiful chaos — Vela is here to walk alongside you. Not to tell you what to do, but to make sure you never feel like you are doing it alone.",
  },
  {
    eyebrow: "What Vela is",
    headLead: "A companion,",
    headAccent: "not a checklist.",
    body:
      "A 60-second daily check-in, short weekly learning made for the week you are actually in, and gentle mood screening along the way. Small moments of noticing, so nothing quietly slips by.",
  },
  {
    eyebrow: "How we walk with you",
    headLead: "From birth",
    headAccent: "through month four.",
    body:
      "And when you want a person, there is one — peer community, doula sessions, and therapist referrals on a sliding scale. Support from the start, for every family.",
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

      <main className="flex-1 px-7 pt-10 pb-8 max-w-xl w-full">
        <p className="text-xs uppercase tracking-[0.32em] text-muted-foreground">
          {slide.eyebrow}
        </p>
        <h1 className="mt-6 font-serif text-[2.65rem] sm:text-6xl leading-[1.08] font-normal">
          {slide.headLead}
          <br />
          <span className="italic text-clay">{slide.headAccent}</span>
        </h1>
        <p className="mt-9 text-lg leading-[1.75] text-muted-foreground">{slide.body}</p>
      </main>

      <footer className="px-7 pb-12 max-w-xl w-full">
        {last ? (
          <div className="space-y-4">
            <Link to="/onboarding" className="block">
              <Button size="lg" className="w-full rounded-full h-13 text-base">
                Begin with Vela
              </Button>
            </Link>
            <Link
              to="/onboarding"
              className="block text-center text-sm text-muted-foreground underline-offset-4 hover:underline"
            >
              I already have an account
            </Link>
          </div>
        ) : (
          <div className="flex items-center justify-between gap-4">
            <Link
              to="/onboarding"
              className="text-sm text-muted-foreground underline-offset-4 hover:underline"
            >
              Skip
            </Link>
            <Button
              size="lg"
              variant="secondary"
              className="rounded-full px-8 bg-clay text-primary-foreground hover:bg-clay/90"
              onClick={() => setI((n) => Math.min(n + 1, slides.length - 1))}
            >
              Continue
            </Button>
          </div>
        )}
      </footer>
    </div>
  );
}
