import { createFileRoute, Link, redirect } from "@tanstack/react-router";
import { useState } from "react";
import { AppShell } from "@/components/app-shell";
import { Button } from "@/components/ui/button";
import { addScreening, getState, nextScreeningDue, todayStr, useStore, weekNumber } from "@/lib/store";
import { cn } from "@/lib/utils";
import { ShieldCheck } from "lucide-react";

export const Route = createFileRoute("/screening")({
  head: () => ({ meta: [{ title: "EPDS screening — Vela" }] }),
  beforeLoad: () => {
    if (typeof window !== "undefined" && !getState().profile.onboarded) {
      throw redirect({ to: "/onboarding" });
    }
  },
  component: ScreeningPage,
});

// EPDS: 10 questions, each 0-3. Items 3, 5–10 reverse-scored (3..0).
// Simplified labels here — real EPDS wording is licensed.
interface Q { prompt: string; options: string[]; reverse: boolean; }
const QUESTIONS: Q[] = [
  { prompt: "I have been able to laugh and see the funny side of things.", options: ["As much as I always could", "Not quite so much now", "Definitely not so much now", "Not at all"], reverse: false },
  { prompt: "I have looked forward with enjoyment to things.", options: ["As much as I ever did", "Rather less than I used to", "Definitely less than I used to", "Hardly at all"], reverse: false },
  { prompt: "I have blamed myself unnecessarily when things went wrong.", options: ["Yes, most of the time", "Yes, some of the time", "Not very often", "No, never"], reverse: true },
  { prompt: "I have been anxious or worried for no good reason.", options: ["No, not at all", "Hardly ever", "Yes, sometimes", "Yes, very often"], reverse: false },
  { prompt: "I have felt scared or panicky for no very good reason.", options: ["Yes, quite a lot", "Yes, sometimes", "No, not much", "No, not at all"], reverse: true },
  { prompt: "Things have been getting on top of me.", options: ["Yes, most of the time I haven't been coping at all", "Yes, sometimes I haven't been coping as well as usual", "No, most of the time I have coped quite well", "No, I have been coping as well as ever"], reverse: true },
  { prompt: "I have been so unhappy that I have had difficulty sleeping.", options: ["Yes, most of the time", "Yes, sometimes", "Not very often", "No, not at all"], reverse: true },
  { prompt: "I have felt sad or miserable.", options: ["Yes, most of the time", "Yes, quite often", "Not very often", "No, not at all"], reverse: true },
  { prompt: "I have been so unhappy that I have been crying.", options: ["Yes, most of the time", "Yes, quite often", "Only occasionally", "No, never"], reverse: true },
  { prompt: "The thought of harming myself has occurred to me.", options: ["Yes, quite often", "Sometimes", "Hardly ever", "Never"], reverse: true },
];

function ScreeningPage() {
  const profile = useStore((s) => s.profile);
  const screenings = useStore((s) => s.screenings);
  const due = nextScreeningDue(profile, screenings);
  const triggerWeek = due?.week ?? weekNumber(profile).week ?? 6;

  const [answers, setAnswers] = useState<(number | null)[]>(Array(10).fill(null));
  const [result, setResult] = useState<{ score: number } | null>(null);

  const allAnswered = answers.every((a) => a !== null);

  function submit() {
    if (!allAnswered) return;
    const scored = answers.map((a, i) => (QUESTIONS[i].reverse ? a! : 3 - a!));
    const score = scored.reduce((sum, n) => sum + n, 0);
    addScreening({ date: todayStr(), score, triggerWeek, responses: answers as number[] });
    setResult({ score });
  }

  if (result) return <Result score={result.score} q10={answers[9]!} />;

  return (
    <AppShell>
      <div className="mb-5 flex items-center gap-3">
        <span className="grid place-items-center h-10 w-10 rounded-full bg-primary/10 text-primary">
          <ShieldCheck className="h-5 w-5" />
        </span>
        <div>
          <p className="text-xs text-primary uppercase tracking-wider">EPDS · Week {triggerWeek} milestone</p>
          <h1 className="text-2xl font-serif">How have you been feeling, this past week?</h1>
        </div>
      </div>
      <p className="text-sm text-muted-foreground">
        There are no right answers. Pick whatever feels closest to your last seven days, and we'll talk through what it means together at the end.
      </p>

      <ol className="mt-8 space-y-7">
        {QUESTIONS.map((q, i) => (
          <li key={i}>
            <p className="font-medium leading-relaxed">
              <span className="text-muted-foreground mr-2">{i + 1}.</span>
              {q.prompt}
            </p>
            <div className="mt-3 grid gap-2">
              {q.options.map((opt, j) => (
                <button
                  key={opt}
                  onClick={() => setAnswers(answers.map((a, k) => (k === i ? j : a)))}
                  className={cn(
                    "text-left rounded-2xl border p-3 px-4 text-sm transition-colors min-h-12",
                    answers[i] === j ? "border-primary bg-primary/5" : "border-border hover:border-foreground/30",
                  )}
                >
                  {opt}
                </button>
              ))}
            </div>
          </li>
        ))}
      </ol>

      <div className="mt-10">
        <Button size="lg" className="rounded-full w-full" disabled={!allAnswered} onClick={submit}>
          See my result
        </Button>
      </div>
    </AppShell>
  );
}

function Result({ score, q10 }: { score: number; q10: number }) {
  // q10 is the self-harm question; reverse=true so any answer != 3 ("Never") is non-zero
  const selfHarmFlag = q10 !== 3;
  let band: "low" | "mid" | "high" = "low";
  if (score >= 13 || selfHarmFlag) band = "high";
  else if (score >= 9) band = "mid";

  const copy = {
    low: {
      title: "This week looks steady, and that's worth noticing.",
      body: "Keep going with your daily check-ins. They're how we catch shifts early — together.",
      cta: { label: "Back to home", to: "/dashboard" as const },
    },
    mid: {
      title: "There's some heaviness sitting with you right now.",
      body: "That's worth honoring, not pushing past. Other parents are talking about exactly this in the peer community — and a doula session can help you get your bearings.",
      cta: { label: "See support options", to: "/support" as const },
    },
    high: {
      title: "We want to make sure you're not alone with this.",
      body: "Your score (and our care for you) says it's time for a warm hand-off. A doula can talk with you today, and we can help with a therapist referral that takes your insurance.",
      cta: { label: "Connect with support now", to: "/support" as const },
    },
  }[band];

  return (
    <AppShell>
      <div className="rounded-2xl bg-secondary p-6">
        <p className="text-xs uppercase tracking-wider text-primary">Your EPDS result</p>
        <div className="mt-2 flex items-baseline gap-2">
          <span className="font-serif text-5xl">{score}</span>
          <span className="text-muted-foreground">/ 30</span>
        </div>
      </div>
      <h1 className="text-2xl font-serif mt-6 leading-snug">{copy.title}</h1>
      <p className="mt-3 text-muted-foreground leading-relaxed">{copy.body}</p>
      {selfHarmFlag && (
        <div className="mt-5 rounded-2xl bg-clay/10 border border-clay/30 p-4 text-sm">
          <div className="font-medium">If you're in crisis right now, please call or text 988 (US).</div>
          <p className="mt-1 text-muted-foreground">Trained counselors are available 24/7. You deserve to be answered.</p>
        </div>
      )}
      <div className="mt-7 flex flex-wrap gap-3">
        <Link to={copy.cta.to}><Button size="lg" className="rounded-full">{copy.cta.label}</Button></Link>
        <Link to="/dashboard"><Button variant="ghost" size="lg" className="rounded-full">Home</Button></Link>
      </div>
    </AppShell>
  );
}