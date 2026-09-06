import { affirm, cta } from "@/lib/microcopy";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { AppShell } from "@/components/app-shell";
import { AuthGate } from "@/components/auth-gate";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { addCheckin, todayStr, useStore } from "@/lib/store";
import { saveCheckin } from "@/lib/vela-db";
import { cn } from "@/lib/utils";
import { Heart, Loader2 } from "lucide-react";

export const Route = createFileRoute("/checkin")({
  head: () => ({
    meta: [
      { title: "Daily Check-In — Vela" },
      {
        name: "description",
        content:
          "A one-minute daily check-in on mood, sleep, and feeding, so patterns show up early and support arrives sooner.",
      },
      { property: "og:title", content: "Daily Check-In — Vela" },
      {
        property: "og:description",
        content: "One minute on mood, sleep, and feeding — so patterns show up early.",
      },
      { property: "og:type", content: "website" },
      { property: "og:url", content: "https://app.nurturetheroots.co/checkin" },
      { name: "twitter:card", content: "summary" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: () => (
    <AuthGate requireOnboarded>
      <CheckinPage />
    </AuthGate>
  ),
});

const moods = ["😞", "😕", "😐", "🙂", "😊"];
const overall = ["Rough", "Hard", "Okay", "Good", "Steady"];

function CheckinPage() {
  const nav = useNavigate();
  const { user } = useAuth();
  const today = todayStr();
  const existing = useStore((s) => s.checkins.find((c) => c.date === today));
  const [mood, setMood] = useState<number | null>(null);
  const [sleep, setSleep] = useState<"poor" | "fair" | "good" | null>(null);
  const [feeding, setFeeding] = useState<"struggling" | "okay" | "going well" | null>(null);
  const [over, setOver] = useState<number | null>(null);
  const [note, setNote] = useState("");
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [submitted, setSubmitted] = useState<null | { flagged: boolean }>(null);


  if (existing && !submitted) {
    return (
      <AppShell>
        <h1 className="text-3xl font-serif">Already checked in today.</h1>
        <p className="mt-3 text-muted-foreground">Rest easy — today is already noted. We'll be here again tomorrow.</p>
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
          {submitted.flagged
            ? affirm.checkinFlaggedBody
            : affirm.checkinSavedBody}
        </p>
        <div className="mt-6 flex flex-wrap gap-3">
          <Link to="/dashboard"><Button className="rounded-full">{cta.backHome}</Button></Link>
          {submitted.flagged && (
            <Link to="/support"><Button variant="outline" className="rounded-full">{cta.seeSupport}</Button></Link>
          )}
        </div>
      </AppShell>
    );
  }

  const canSubmit = mood !== null && sleep !== null && feeding !== null && over !== null;

  async function submit() {
    if (!canSubmit || saving) return;
    setSaving(true);
    setSaveError(null);
    const c = addCheckin({
      date: today,
      mood: mood!,
      sleep: sleep!,
      feeding: feeding!,
      overall: over!,
      note: note.trim() || undefined,
    });
    try {
      if (user) await saveCheckin(user.id, c);
    } catch {
      setSaveError("We saved today on this device, but couldn't reach your account just yet.");
    } finally {
      setSaving(false);
      setSubmitted({ flagged: !!c.flagged });
    }
  }


  return (
    <AppShell>
      <h1 className="text-3xl font-serif">How's today?</h1>
      <p className="mt-2 text-muted-foreground">Sixty seconds, whenever you can. There are no wrong answers here.</p>

      <section className="mt-8">
        <Label>Mood right now</Label>
        <div className="mt-3 grid grid-cols-5 gap-2">
          {moods.map((m, i) => (
            <button
              key={m}
              onClick={() => setMood(i + 1)}
              className={cn(
                "h-14 rounded-2xl border text-2xl transition-colors",
                mood === i + 1 ? "border-primary bg-primary/5" : "border-border hover:border-foreground/30",
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
        <Chips
          options={["poor", "fair", "good"] as const}
          value={sleep}
          onChange={setSleep}
        />
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
                over === i + 1 ? "border-primary bg-primary/5" : "border-border hover:border-foreground/30",
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
        <Button size="lg" className="rounded-full w-full" disabled={!canSubmit || saving} onClick={submit}>
          {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          Save today's check-in
        </Button>
      </div>
      {saveError && <p role="alert" className="mt-3 text-xs text-destructive text-center">{saveError}</p>}

      <p className="mt-3 text-xs text-muted-foreground text-center">
        We hold your check-ins gently. If a few heavy days gather in a row, we'll quietly offer a hand — never a diagnosis.
      </p>
    </AppShell>
  );
}

function Label({ children, htmlFor }: { children: React.ReactNode; htmlFor?: string }) {
  return <label htmlFor={htmlFor} className="text-sm font-medium">{children}</label>;
}

function Chips<T extends string>({ options, value, onChange }: { options: readonly T[]; value: T | null; onChange: (v: T) => void }) {
  return (
    <div className="mt-3 grid grid-cols-3 gap-2">
      {options.map((o) => (
        <button
          key={o}
          onClick={() => onChange(o)}
          className={cn(
            "min-h-12 rounded-2xl border text-sm capitalize transition-colors",
            value === o ? "border-primary bg-primary/5" : "border-border hover:border-foreground/30",
          )}
        >
          {o}
        </button>
      ))}
    </div>
  );
}