import { affirm, cta } from "@/lib/microcopy";
import { createFileRoute, Link, redirect, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { AppShell } from "@/components/app-shell";
import { Button } from "@/components/ui/button";
import { addCheckin, getState, todayStr, useStore } from "@/lib/store";
import { cn } from "@/lib/utils";
import { Heart } from "lucide-react";

export const Route = createFileRoute("/checkin")({
  head: () => ({ meta: [{ title: "Daily check-in — Vela" }] }),
  beforeLoad: () => {
    if (typeof window !== "undefined" && !getState().profile.onboarded) {
      throw redirect({ to: "/onboarding" });
    }
  },
  component: CheckinPage,
});

const moods = ["😞", "😕", "😐", "🙂", "😊"];
const overall = ["Rough", "Hard", "Okay", "Good", "Steady"];

function CheckinPage() {
  const nav = useNavigate();
  const today = todayStr();
  const existing = useStore((s) => s.checkins.find((c) => c.date === today));
  const [mood, setMood] = useState<number | null>(null);
  const [sleep, setSleep] = useState<"poor" | "fair" | "good" | null>(null);
  const [feeding, setFeeding] = useState<"struggling" | "okay" | "going well" | null>(null);
  const [over, setOver] = useState<number | null>(null);
  const [note, setNote] = useState("");
  const [submitted, setSubmitted] = useState<null | { flagged: boolean }>(null);

  if (existing && !submitted) {
    return (
      <AppShell>
        <h1 className="text-3xl font-serif">Already checked in today.</h1>
        <p className="mt-3 text-muted-foreground">
          Rest easy — today is already noted. We'll be here again tomorrow.
        </p>
        <Link to="/dashboard" className="inline-block mt-6">
          <Button className="rounded-full">{cta.backHome}</Button>
        </Link>
      </AppShell>
    );
  }

  if (submitted) {
    return (
      <AppShell>
        <div className="grid place-items-center h-14 w-14 rounded-full bg-primary/10 text-primary">
          <Heart className="h-6 w-6" fill="currentColor" />
        </div>
        <h1 className="text-3xl font-serif mt-5">{affirm.checkinSaved}</h1>
        <p className="mt-3 text-muted-foreground leading-relaxed">
          {submitted.flagged ? affirm.checkinFlaggedBody : affirm.checkinSavedBody}
        </p>
        <div className="mt-6 flex flex-wrap gap-3">
          <Link to="/dashboard">
            <Button className="rounded-full">{cta.backHome}</Button>
          </Link>
          {submitted.flagged && (
            <Link to="/support">
              <Button variant="outline" className="rounded-full">
                {cta.seeSupport}
              </Button>
            </Link>
          )}
        </div>
      </AppShell>
    );
  }

  const canSubmit = mood !== null && sleep !== null && feeding !== null && over !== null;

  function submit() {
    if (!canSubmit) return;
    const c = addCheckin({
      date: today,
      mood: mood!,
      sleep: sleep!,
      feeding: feeding!,
      overall: over!,
      note: note.trim() || undefined,
    });
    setSubmitted({ flagged: !!c.flagged });
  }

  return (
    <AppShell>
      <h1 className="text-3xl font-serif">How's today?</h1>
      <p className="mt-2 text-muted-foreground">
        Sixty seconds, whenever you can. There are no wrong answers here.
      </p>

      <section className="mt-8">
        <Label>Mood right now</Label>
        <div className="mt-3 grid grid-cols-5 gap-2">
          {moods.map((m, i) => (
            <button
              key={m}
              onClick={() => setMood(i + 1)}
              className={cn(
                "h-14 rounded-2xl border text-2xl transition-colors",
                mood === i + 1
                  ? "border-primary bg-primary/5"
                  : "border-border hover:border-foreground/30",
              )}
              aria-label={`Mood ${i + 1} of 5`}
            >
              {m}
            </button>
          ))}
        </div>
      </section>

      <section className="mt-8">
        <Label>Sleep last night</Label>
        <Chips options={["poor", "fair", "good"] as const} value={sleep} onChange={setSleep} />
      </section>

      <section className="mt-8">
        <Label>Feeding</Label>
        <Chips
          options={["struggling", "okay", "going well"] as const}
          value={feeding}
          onChange={setFeeding}
        />
      </section>

      <section className="mt-8">
        <Label>Overall</Label>
        <div className="mt-3 grid grid-cols-5 gap-2">
          {overall.map((m, i) => (
            <button
              key={m}
              onClick={() => setOver(i + 1)}
              className={cn(
                "h-14 rounded-2xl border text-xs transition-colors px-1",
                over === i + 1
                  ? "border-primary bg-primary/5"
                  : "border-border hover:border-foreground/30",
              )}
            >
              {m}
            </button>
          ))}
        </div>
      </section>

      <section className="mt-8">
        <Label htmlFor="note">Anything you want to name? (optional)</Label>
        <textarea
          id="note"
          value={note}
          onChange={(e) => setNote(e.target.value.slice(0, 500))}
          rows={3}
          className="mt-2 w-full rounded-2xl border border-input bg-card p-4 text-sm focus:outline-none focus:ring-1 focus:ring-ring"
          placeholder="A word, a sentence, or skip it."
        />
      </section>

      <div className="mt-8">
        <Button size="lg" className="rounded-full w-full" disabled={!canSubmit} onClick={submit}>
          Save today's check-in
        </Button>
      </div>
      <p className="mt-3 text-xs text-muted-foreground text-center">
        We hold your check-ins gently. If a few heavy days gather in a row, we'll quietly offer a
        hand — never a diagnosis.
      </p>
    </AppShell>
  );
}

function Label({ children, htmlFor }: { children: React.ReactNode; htmlFor?: string }) {
  return (
    <label htmlFor={htmlFor} className="text-sm font-medium">
      {children}
    </label>
  );
}

function Chips<T extends string>({
  options,
  value,
  onChange,
}: {
  options: readonly T[];
  value: T | null;
  onChange: (v: T) => void;
}) {
  return (
    <div className="mt-3 grid grid-cols-3 gap-2">
      {options.map((o) => (
        <button
          key={o}
          onClick={() => onChange(o)}
          className={cn(
            "min-h-12 rounded-2xl border text-sm capitalize transition-colors",
            value === o
              ? "border-primary bg-primary/5"
              : "border-border hover:border-foreground/30",
          )}
        >
          {o}
        </button>
      ))}
    </div>
  );
}
