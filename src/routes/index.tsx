import { createFileRoute, Link, redirect } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import { Heart, ShieldCheck, MessageCircleHeart, BookOpen } from "lucide-react";
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

function Landing() {
  return (
    <div className="min-h-dvh bg-background">
      <header className="max-w-5xl mx-auto px-6 py-6 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="grid place-items-center h-9 w-9 rounded-full bg-primary text-primary-foreground">
            <Heart className="h-4 w-4" fill="currentColor" />
          </span>
          <span className="font-serif text-xl font-semibold">Vela</span>
        </div>
        <Link to="/onboarding">
          <Button variant="ghost" size="sm">Sign in</Button>
        </Link>
      </header>

      <section className="max-w-3xl mx-auto px-6 pt-10 pb-16 text-center">
        <p className="text-sm uppercase tracking-[0.18em] text-primary mb-5">Support from the start. For every Family.</p>
        <h1 className="text-4xl sm:text-5xl font-serif font-semibold leading-tight">
          Tender, attuned support — from birth through month 4.
        </h1>
        <p className="mt-6 text-lg text-muted-foreground max-w-xl mx-auto leading-relaxed">
          Daily check-ins, weekly learning, gentle screening, and human help when you need it. Built for the
          2am moments, not the clinic.
        </p>
        <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
          <Link to="/onboarding">
            <Button size="lg" className="rounded-full px-7">Start free</Button>
          </Link>
          <a href="#how" className="text-sm text-muted-foreground hover:text-foreground underline-offset-4 hover:underline">
            How Vela works
          </a>
        </div>
      </section>

      <section id="how" className="max-w-4xl mx-auto px-6 pb-24 grid sm:grid-cols-2 gap-4">
        {[
          { icon: Heart, title: "60-second daily check-in", body: "Mood, sleep, feeding, overall. We watch for patterns so you don't have to." },
          { icon: BookOpen, title: "Weekly learning, by your week", body: "Short, plain-language modules — newborn care, recovery, mental health." },
          { icon: ShieldCheck, title: "Gentle clinical screening", body: "EPDS at 2wk, 6wk, 3mo, and 4mo. Results come with a warm next step." },
          { icon: MessageCircleHeart, title: "Real human support", body: "Peer community, doula sessions, and therapist referrals on a sliding scale." },
        ].map(({ icon: Icon, title, body }) => (
          <div key={title} className="rounded-2xl bg-secondary p-6">
            <Icon className="h-5 w-5 text-primary" />
            <h3 className="mt-3 font-serif text-lg">{title}</h3>
            <p className="mt-2 text-sm text-muted-foreground leading-relaxed">{body}</p>
          </div>
        ))}
      </section>
    </div>
  );
}
