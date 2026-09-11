import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { format } from "date-fns";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Checkbox } from "@/components/ui/checkbox";
import { legal } from "@/lib/microcopy";
import { setProfile, type Insurance, type Stage, type Tier } from "@/lib/store";
import { cn } from "@/lib/utils";
import { ExpectTimeline } from "@/components/expect-timeline";
import { CalendarIcon, Check, Heart, Sparkles, AlertCircle, Loader2 } from "lucide-react";

export const Route = createFileRoute("/onboarding")({
  head: () => ({
    meta: [
      { title: "Welcome to Vela" },
      { name: "description", content: "Set up your Vela profile in a few gentle steps." },
    ],
  }),
  component: Onboarding,
});

const FOCUS_OPTIONS = [
  { id: "mood", label: "My mood and mental health", desc: "Daily check-ins and gentle screening." },
  { id: "sleep", label: "Sleep — mine and baby's", desc: "Rest strategies that fit real life." },
  { id: "feeding", label: "Feeding", desc: "Chest/breast, bottle, or a mix of both." },
  { id: "recovery", label: "Physical recovery", desc: "Healing, pain, and what's normal." },
  {
    id: "identity",
    label: "Identity and relationships",
    desc: "Matrescence, partnership, community.",
  },
  {
    id: "support",
    label: "Finding human support",
    desc: "Doulas, therapists, and peer connection.",
  },
];

const MAX_FOCUS = 3;
const MAX_WEEKS = 17; // fourth trimester runs to about 4 months

const PREPARING_STEPS = [
  "Decoding infant cues & sleep states",
  "Customizing feeding & lactation support",
  "Preparing maternal wellness check-ins",
  "Connecting Bay Area support resources",
];

function startOfToday() {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
}

function FieldError({ id, children }: { id: string; children: React.ReactNode }) {
  return (
    <p id={id} role="alert" className="mt-2 flex items-start gap-1.5 text-sm text-destructive">
      <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
      <span>{children}</span>
    </p>
  );
}

function Onboarding() {
  const nav = useNavigate();
  const [step, setStep] = useState(1);
  const [stage, setStage] = useState<Stage | null>(null);
  const [dueDate, setDueDate] = useState<Date | undefined>();
  const [ageWeeks, setAgeWeeks] = useState("");
  const [ageDays, setAgeDays] = useState("");
  const [focuses, setFocuses] = useState<string[]>([]);
  const [name, setName] = useState("");
  const [zip, setZip] = useState("");
  const [insurance, setInsurance] = useState<Insurance>("Private");
  const [tier, setTier] = useState<Tier>(10);
  const [consent, setConsent] = useState(false);

  const total = 7;
  const [showErrors, setShowErrors] = useState(false);
  const [finishing, setFinishing] = useState(false);
  const [preparedCount, setPreparedCount] = useState(0);

  useEffect(() => {
    if (!finishing) return;
    if (preparedCount >= PREPARING_STEPS.length) {
      const done = setTimeout(() => nav({ to: "/dashboard" }), 600);
      return () => clearTimeout(done);
    }
    const t = setTimeout(() => setPreparedCount((c) => c + 1), 750);
    return () => clearTimeout(t);
  }, [finishing, preparedCount, nav]);

  const errors: Record<string, string> = {};
  if (step === 1 && !stage) {
    errors.stage = "Choose where you are right now so we can tune what comes next.";
  }
  if (step === 2 && stage === "expecting") {
    if (!dueDate) {
      errors.dueDate = "Please pick an estimated due date — a rough guess is fine.";
    } else {
      const today = startOfToday();
      const latest = new Date(today);
      latest.setDate(latest.getDate() + 300);
      if (dueDate < today) {
        errors.dueDate =
          "That date has already passed. If baby is here, go back and choose Postpartum.";
      } else if (dueDate > latest) {
        errors.dueDate = "That's more than 10 months away — please double-check the date.";
      }
    }
  }
  if (step === 2 && stage === "postpartum") {
    if (ageWeeks.trim() === "") {
      errors.ageWeeks = "Let us know how many weeks old your baby is — 0 is perfect for a newborn.";
    } else if (Number(ageWeeks) > MAX_WEEKS) {
      errors.ageWeeks = `Vela companions birth through ${MAX_WEEKS} weeks. You're welcome to stay, but content ends at 4 months.`;
    }
    if (ageDays !== "" && (Number(ageDays) < 0 || Number(ageDays) > 6)) {
      errors.ageDays = "Days can be 0 through 6.";
    }
  }
  if (step === 3) {
    if (name.trim().length < 2) errors.name = "Please enter the name you'd like us to use.";
    if (!/^\d{5}$/.test(zip)) errors.zip = "Enter a 5-digit zip code so we can find local support.";
  }
  if (step === 4 && focuses.length === 0) {
    errors.focuses = "Choose at least one priority — you can change these later.";
  }

  const stepValid = Object.keys(errors).length === 0;
  // The weeks message at exactly the cap is guidance, not a blocker.
  const blocking = Object.keys(errors).filter(
    (k) => !(k === "ageWeeks" && Number(ageWeeks) > MAX_WEEKS && ageWeeks.trim() !== ""),
  );

  function toggleFocus(id: string) {
    setFocuses((cur) => {
      if (cur.includes(id)) return cur.filter((f) => f !== id);
      if (cur.length >= MAX_FOCUS) return cur;
      return [...cur, id];
    });
  }

  function derivedBirthDate() {
    if (stage !== "postpartum") return undefined;
    const days = Number(ageWeeks || 0) * 7 + Number(ageDays || 0);
    const d = new Date();
    d.setDate(d.getDate() - days);
    return d.toISOString().slice(0, 10);
  }

  function finish() {
    setProfile({
      name: name.trim(),
      stage: stage ?? "postpartum",
      dueDate: stage === "expecting" && dueDate ? format(dueDate, "yyyy-MM-dd") : undefined,
      birthDate: derivedBirthDate(),
      focuses,
      zip,
      insurance,
      tier,
      onboarded: true,
    });
    setFinishing(true);
  }

  function next() {
    if (!stepValid) {
      setShowErrors(true);
      if (blocking.length > 0) return;
    }
    setShowErrors(false);
    if (step === total) return finish();
    setStep(step + 1);
  }

  return finishing ? (
    <div
      className="min-h-dvh bg-background flex flex-col items-center justify-center px-5"
      style={{ backgroundImage: "var(--gradient-welcome)", backgroundAttachment: "fixed" }}
    >
      <div className="max-w-md w-full text-center">
        <span className="mx-auto grid place-items-center h-12 w-12 rounded-full bg-primary/10 text-primary">
          <Loader2 className="h-6 w-6 animate-spin" />
        </span>
        <h1 className="mt-5 font-serif text-3xl">Crafting your family's rhythm…</h1>
        <p className="mt-3 text-muted-foreground leading-relaxed">
          Tailoring newborn developmental insights and recovery support for you and baby.
        </p>
        <ul className="mt-8 space-y-3 text-left">
          {PREPARING_STEPS.map((s, i) => (
            <li
              key={s}
              className={cn(
                "flex items-center gap-3 rounded-2xl bg-secondary px-4 py-3 text-sm transition-opacity",
                i < preparedCount
                  ? "opacity-100"
                  : i === preparedCount
                    ? "opacity-90"
                    : "opacity-45",
              )}
            >
              {i < preparedCount ? (
                <Check className="h-4 w-4 shrink-0 text-primary" />
              ) : i === preparedCount ? (
                <Loader2 className="h-4 w-4 shrink-0 animate-spin text-primary" />
              ) : (
                <span className="h-4 w-4 shrink-0 rounded-full border border-border" />
              )}
              <span>{s}</span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  ) : (
    <div
      className="min-h-dvh bg-background flex flex-col"
      style={{ backgroundImage: "var(--gradient-welcome)", backgroundAttachment: "fixed" }}
    >
      <header className="px-5 py-5 max-w-xl w-full mx-auto flex items-center gap-2">
        <span className="grid place-items-center h-8 w-8 rounded-full bg-primary text-primary-foreground">
          <Heart className="h-4 w-4" fill="currentColor" />
        </span>
        <span className="font-serif text-lg font-semibold">Vela</span>
        <span className="ml-auto text-xs text-muted-foreground">
          Step {step} of {total}
        </span>
      </header>
      <div className="max-w-xl w-full mx-auto px-5">
        <div className="h-1.5 rounded-full bg-secondary overflow-hidden">
          <div
            className="h-full bg-primary transition-all"
            style={{ width: `${(step / total) * 100}%` }}
          />
        </div>
      </div>

      <main className="flex-1 max-w-xl w-full mx-auto px-5 py-10">
        {step === 1 && (
          <div>
            <h1 className="text-3xl font-serif">Where are you right now?</h1>
            <p className="mt-3 text-muted-foreground">This shapes everything we bring you next.</p>
            <div className="mt-6 space-y-3">
              <ChoiceCard
                active={stage === "expecting"}
                onClick={() => setStage("expecting")}
                title="Expecting / Pregnancy"
                desc="Baby hasn't arrived yet. We'll get you ready for the fourth trimester."
              />
              <ChoiceCard
                active={stage === "postpartum"}
                onClick={() => setStage("postpartum")}
                title="Postpartum"
                desc="Baby is here. We'll tune everything to your week."
              />
            </div>
            {showErrors && errors.stage && <FieldError id="err-stage">{errors.stage}</FieldError>}
          </div>
        )}

        {step === 2 && stage === "expecting" && (
          <div>
            <h1 className="text-3xl font-serif">When are you due?</h1>
            <p className="mt-3 text-muted-foreground">
              An estimate is perfectly fine — you can update it any time.
            </p>
            <div className="mt-6">
              <Label htmlFor="due">Estimated due date</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    id="due"
                    variant="outline"
                    className={cn(
                      "mt-2 h-12 w-full justify-start rounded-xl text-left font-normal",
                      !dueDate && "text-muted-foreground",
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {dueDate ? format(dueDate, "PPP") : <span>Pick your due date</span>}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={dueDate}
                    onSelect={setDueDate}
                    initialFocus
                    className={cn("p-3 pointer-events-auto")}
                  />
                </PopoverContent>
              </Popover>
              {showErrors && errors.dueDate && (
                <FieldError id="err-due">{errors.dueDate}</FieldError>
              )}
            </div>
          </div>
        )}

        {step === 2 && stage === "postpartum" && (
          <div>
            <h1 className="text-3xl font-serif">How old is your baby?</h1>
            <p className="mt-3 text-muted-foreground">
              We use this to tune your check-ins and learning to your week in the fourth trimester.
            </p>
            <div className="mt-6 grid grid-cols-2 gap-3">
              <div>
                <Label htmlFor="weeks">Weeks</Label>
                <Input
                  id="weeks"
                  inputMode="numeric"
                  placeholder="6"
                  className="mt-2 h-12"
                  aria-invalid={showErrors && !!errors.ageWeeks}
                  aria-describedby={showErrors && errors.ageWeeks ? "err-weeks" : undefined}
                  value={ageWeeks}
                  onChange={(e) => setAgeWeeks(e.target.value.replace(/\D/g, "").slice(0, 2))}
                />
                {showErrors && errors.ageWeeks && (
                  <FieldError id="err-weeks">{errors.ageWeeks}</FieldError>
                )}
              </div>
              <div>
                <Label htmlFor="days">Days</Label>
                <Input
                  id="days"
                  inputMode="numeric"
                  placeholder="3"
                  className="mt-2 h-12"
                  aria-invalid={showErrors && !!errors.ageDays}
                  aria-describedby={showErrors && errors.ageDays ? "err-days" : undefined}
                  value={ageDays}
                  onChange={(e) => {
                    const v = e.target.value.replace(/\D/g, "").slice(0, 1);
                    setAgeDays(v === "" ? "" : String(Math.min(6, Number(v))));
                  }}
                />
                {showErrors && errors.ageDays && (
                  <FieldError id="err-days">{errors.ageDays}</FieldError>
                )}
              </div>
            </div>
            <p className="mt-3 text-xs text-muted-foreground">
              Days are optional — weeks alone is enough.
            </p>
          </div>
        )}

        {step === 3 && (
          <div>
            <h1 className="text-3xl font-serif">Tell us a little about you.</h1>
            <p className="mt-3 text-muted-foreground">
              Just the basics. You can change anything later.
            </p>
            <div className="mt-6 space-y-4">
              <div>
                <Label htmlFor="name">Your name</Label>
                <Input
                  id="name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="mt-2 h-12"
                  placeholder="First name"
                  aria-invalid={showErrors && !!errors.name}
                  aria-describedby={showErrors && errors.name ? "err-name" : undefined}
                />
                {showErrors && errors.name && <FieldError id="err-name">{errors.name}</FieldError>}
              </div>
              <div>
                <Label htmlFor="zip">Zip code</Label>
                <Input
                  id="zip"
                  inputMode="numeric"
                  maxLength={5}
                  value={zip}
                  onChange={(e) => setZip(e.target.value.replace(/\D/g, ""))}
                  className="mt-2 h-12"
                  placeholder="94110"
                  aria-invalid={showErrors && !!errors.zip}
                  aria-describedby={showErrors && errors.zip ? "err-zip" : undefined}
                />
                {showErrors && errors.zip && <FieldError id="err-zip">{errors.zip}</FieldError>}
              </div>
              <div>
                <Label>Insurance</Label>
                <div className="mt-2 grid grid-cols-3 gap-2">
                  {(["Medicaid", "Private", "Uninsured"] as Insurance[]).map((opt) => (
                    <button
                      key={opt}
                      type="button"
                      onClick={() => setInsurance(opt)}
                      className={cn(
                        "min-h-12 rounded-xl border text-sm transition-colors",
                        insurance === opt
                          ? "border-primary bg-primary/5 text-foreground"
                          : "border-border text-muted-foreground hover:text-foreground",
                      )}
                    >
                      {opt}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {step === 4 && (
          <div>
            <h1 className="text-3xl font-serif">What matters most right now?</h1>
            <p className="mt-3 text-muted-foreground">We'll lead with these on your dashboard.</p>
            <div className="mt-5 inline-flex items-center gap-2 rounded-full bg-secondary px-3 py-1.5 text-xs text-muted-foreground">
              <Sparkles className="h-3.5 w-3.5 text-primary" />
              Select up to {MAX_FOCUS} priorities ({focuses.length}/{MAX_FOCUS} selected)
            </div>
            <div className="mt-4 space-y-3">
              {FOCUS_OPTIONS.map((o) => {
                const active = focuses.includes(o.id);
                const locked = !active && focuses.length >= MAX_FOCUS;
                return (
                  <button
                    key={o.id}
                    type="button"
                    onClick={() => toggleFocus(o.id)}
                    disabled={locked}
                    aria-pressed={active}
                    className={cn(
                      "w-full text-left rounded-2xl border p-5 transition-colors",
                      active
                        ? "border-primary bg-primary/5"
                        : "border-border hover:border-foreground/30",
                      locked && "opacity-45 cursor-not-allowed hover:border-border",
                    )}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <div className="font-medium">{o.label}</div>
                        <p className="mt-1 text-sm text-muted-foreground leading-relaxed">
                          {o.desc}
                        </p>
                      </div>
                      <span
                        className={cn(
                          "mt-0.5 grid h-5 w-5 shrink-0 place-items-center rounded-full border",
                          active
                            ? "border-primary bg-primary text-primary-foreground"
                            : "border-border",
                        )}
                      >
                        {active && <Check className="h-3 w-3" />}
                      </span>
                    </div>
                  </button>
                );
              })}
            </div>
            {focuses.length >= MAX_FOCUS && (
              <p className="mt-4 text-xs text-muted-foreground">
                That's {MAX_FOCUS} — deselect one to swap in something else.
              </p>
            )}
            {showErrors && errors.focuses && (
              <FieldError id="err-focuses">{errors.focuses}</FieldError>
            )}
          </div>
        )}

        {step === 5 && (
          <div>
            <h1 className="text-3xl font-serif">Pay what feels right.</h1>
            <p className="mt-3 text-muted-foreground">
              Vela runs on a sliding scale so support reaches everyone. Pick the tier that fits your
              situation — no proof, no questions.
            </p>
            <div className="mt-6 space-y-3">
              <TierCard
                active={tier === 0}
                onClick={() => setTier(0)}
                price="$0"
                label="Access"
                desc="Daily check-ins, learning, screening, peer community."
              />
              <TierCard
                active={tier === 10}
                onClick={() => setTier(10)}
                price="$10"
                label="Supported"
                desc="Everything in Access. Suggested if you're on Medicaid or tight on income."
              />
              <TierCard
                active={tier === 25}
                onClick={() => setTier(25)}
                price="$25"
                label="Sustaining"
                desc="Helps cover another family's care. Suggested if you're managing."
              />
              <TierCard
                active={tier === 50}
                onClick={() => setTier(50)}
                price="$50"
                label="Solidarity"
                desc="Funds two more families. Suggested if you have room to give."
              />
            </div>
          </div>
        )}

        {step === 6 && (
          <div>
            <h1 className="text-3xl font-serif">What to expect next.</h1>
            <p className="mt-3 text-muted-foreground leading-relaxed">
              A gentle map of the fourth trimester, week by week. Tap any moment to see how Vela
              walks it with you — nothing here is a schedule you have to keep.
            </p>
            <ExpectTimeline currentWeek={stage === "postpartum" ? Number(ageWeeks || 0) : 0} />
          </div>
        )}

        {step === 7 && (
          <div>
            <h1 className="text-3xl font-serif">Welcome, {name || "friend"}.</h1>
            <p className="mt-3 text-muted-foreground leading-relaxed">
              Here's what to expect: a quick check-in each day, one short learning module each week,
              and gentle screening at key milestones. When something needs more, we'll surface human
              support — never as a gate, always as an offering.
            </p>
            <ul className="mt-6 space-y-3 text-sm">
              {[
                "60-second daily check-in",
                "Weekly learning by your week",
                "EPDS screening at 2wk, 6wk, 3mo, and 4mo",
                "Doula and therapist support when you want it",
              ].map((t) => (
                <li key={t} className="flex items-start gap-3">
                  <span className="mt-0.5 grid place-items-center h-5 w-5 rounded-full bg-primary text-primary-foreground">
                    <Check className="h-3 w-3" />
                  </span>
                  {t}
                </li>
              ))}
            </ul>

            <div className="mt-8 rounded-2xl border border-border/70 bg-secondary/60 p-5">
              <label className="flex items-start gap-3 cursor-pointer">
                <Checkbox
                  checked={consent}
                  onCheckedChange={(v) => setConsent(v === true)}
                  className="mt-0.5"
                  aria-describedby="consent-copy"
                />
                <span id="consent-copy" className="text-sm leading-relaxed text-foreground/90">
                  {legal.onboardingConsent}
                </span>
              </label>
              <p className="mt-3 text-xs leading-relaxed text-muted-foreground">
                {legal.disclaimer}
              </p>
            </div>
          </div>
        )}
      </main>

      <footer className="sticky bottom-0 bg-welcome-base/90 backdrop-blur border-t border-border/50">
        <div className="max-w-xl mx-auto px-5 py-4 flex items-center justify-between gap-3">
          <Button
            variant="ghost"
            disabled={step === 1}
            onClick={() => {
              setShowErrors(false);
              setStep(step - 1);
            }}
          >
            Back
          </Button>
          <Button
            size="lg"
            className="rounded-full px-7"
            disabled={step === total && !consent}
            onClick={next}
          >
            {step === total
              ? "Complete setup"
              : step === 5 && tier !== 0
                ? "Simulate checkout"
                : "Continue"}
          </Button>
        </div>
      </footer>
    </div>
  );
}

function ChoiceCard({
  active,
  onClick,
  title,
  desc,
}: {
  active: boolean;
  onClick: () => void;
  title: string;
  desc: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "w-full text-left rounded-2xl border p-5 transition-colors",
        active ? "border-primary bg-primary/5" : "border-border hover:border-foreground/30",
      )}
    >
      <div className="font-serif text-xl">{title}</div>
      <p className="mt-2 text-sm text-muted-foreground leading-relaxed">{desc}</p>
    </button>
  );
}

function TierCard({
  active,
  onClick,
  price,
  label,
  desc,
}: {
  active: boolean;
  onClick: () => void;
  price: string;
  label: string;
  desc: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "w-full text-left rounded-2xl border p-5 transition-colors",
        active ? "border-primary bg-primary/5" : "border-border hover:border-foreground/30",
      )}
    >
      <div className="flex items-baseline justify-between">
        <div className="font-serif text-2xl">
          {price}
          <span className="text-sm text-muted-foreground font-sans">/mo</span>
        </div>
        <div className="text-xs uppercase tracking-wider text-primary">{label}</div>
      </div>
      <p className="mt-2 text-sm text-muted-foreground leading-relaxed">{desc}</p>
    </button>
  );
}
