import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { setProfile, type Insurance, type Tier } from "@/lib/store";
import { cn } from "@/lib/utils";
import { Check, Heart } from "lucide-react";

export const Route = createFileRoute("/onboarding")({
  head: () => ({
    meta: [
      { title: "Welcome to Vela" },
      { name: "description", content: "Set up your Vela profile in a few gentle steps." },
    ],
  }),
  component: Onboarding,
});

function Onboarding() {
  const nav = useNavigate();
  const [step, setStep] = useState(1);
  const [birthDate, setBirthDate] = useState("");
  const [name, setName] = useState("");
  const [zip, setZip] = useState("");
  const [insurance, setInsurance] = useState<Insurance>("Private");
  const [tier, setTier] = useState<Tier>(10);

  const total = 4;
  const canNext =
    (step === 1 && birthDate) ||
    (step === 2 && name.trim() && /^\d{5}$/.test(zip)) ||
    step === 3 ||
    step === 4;

  function finish() {
    setProfile({
      name: name.trim(),
      birthDate,
      zip,
      insurance,
      tier,
      onboarded: true,
    });
    nav({ to: "/dashboard" });
  }

  function next() {
    if (step === 3 && tier !== 0) {
      // Stripe checkout placeholder
      setStep(4);
      return;
    }
    if (step === 4) return finish();
    setStep(step + 1);
  }

  return (
    <div className="min-h-dvh bg-background flex flex-col">
      <header className="px-5 py-5 max-w-xl w-full mx-auto flex items-center gap-2">
        <span className="grid place-items-center h-8 w-8 rounded-full bg-primary text-primary-foreground">
          <Heart className="h-4 w-4" fill="currentColor" />
        </span>
        <span className="font-serif text-lg font-semibold">Vela</span>
        <span className="ml-auto text-xs text-muted-foreground">Step {step} of {total}</span>
      </header>
      <div className="max-w-xl w-full mx-auto px-5">
        <div className="h-1.5 rounded-full bg-secondary overflow-hidden">
          <div className="h-full bg-primary transition-all" style={{ width: `${(step / total) * 100}%` }} />
        </div>
      </div>

      <main className="flex-1 max-w-xl w-full mx-auto px-5 py-10">
        {step === 1 && (
          <div>
            <h1 className="text-3xl font-serif">When did your baby arrive?</h1>
            <p className="mt-3 text-muted-foreground">We use this to tune your check-ins and learning to your week in the fourth trimester.</p>
            <div className="mt-6">
              <Label htmlFor="bd">Birth date</Label>
              <Input id="bd" type="date" value={birthDate} onChange={(e) => setBirthDate(e.target.value)} className="mt-2 h-12" />
            </div>
          </div>
        )}

        {step === 2 && (
          <div>
            <h1 className="text-3xl font-serif">Tell us a little about you.</h1>
            <p className="mt-3 text-muted-foreground">Just the basics. You can change anything later.</p>
            <div className="mt-6 space-y-4">
              <div>
                <Label htmlFor="name">Your name</Label>
                <Input id="name" value={name} onChange={(e) => setName(e.target.value)} className="mt-2 h-12" placeholder="First name" />
              </div>
              <div>
                <Label htmlFor="zip">Zip code</Label>
                <Input id="zip" inputMode="numeric" maxLength={5} value={zip} onChange={(e) => setZip(e.target.value.replace(/\D/g, ""))} className="mt-2 h-12" placeholder="94110" />
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
                        insurance === opt ? "border-primary bg-primary/5 text-foreground" : "border-border text-muted-foreground hover:text-foreground",
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

        {step === 3 && (
          <div>
            <h1 className="text-3xl font-serif">Pay what feels right.</h1>
            <p className="mt-3 text-muted-foreground">
              Vela runs on a sliding scale so support reaches everyone. Pick the tier that fits your situation — no proof, no questions.
            </p>
            <div className="mt-6 space-y-3">
              <TierCard active={tier === 0} onClick={() => setTier(0)} price="$0" label="Access" desc="Daily check-ins, learning, screening, peer community." />
              <TierCard active={tier === 10} onClick={() => setTier(10)} price="$10" label="Supported" desc="Everything in Access. Suggested if you're on Medicaid or tight on income." />
              <TierCard active={tier === 25} onClick={() => setTier(25)} price="$25" label="Sustaining" desc="Helps cover another family's care. Suggested if you're managing." />
              <TierCard active={tier === 50} onClick={() => setTier(50)} price="$50" label="Solidarity" desc="Funds two more families. Suggested if you have room to give." />
            </div>
          </div>
        )}

        {step === 4 && (
          <div>
            <h1 className="text-3xl font-serif">Welcome, {name || "friend"}.</h1>
            <p className="mt-3 text-muted-foreground leading-relaxed">
              Here's what to expect: a quick check-in each day, one short learning module each week, and gentle
              screening at key milestones. When something needs more, we'll surface human support — never as a
              gate, always as an offering.
            </p>
            <ul className="mt-6 space-y-3 text-sm">
              {["60-second daily check-in", "Weekly learning by your week", "EPDS screening at 2wk, 6wk, 3mo, and 4mo", "Doula and therapist support when you want it"].map((t) => (
                <li key={t} className="flex items-start gap-3">
                  <span className="mt-0.5 grid place-items-center h-5 w-5 rounded-full bg-primary text-primary-foreground"><Check className="h-3 w-3" /></span>
                  {t}
                </li>
              ))}
            </ul>
          </div>
        )}
      </main>

      <footer className="sticky bottom-0 bg-background/95 backdrop-blur border-t border-border/60">
        <div className="max-w-xl mx-auto px-5 py-4 flex items-center justify-between gap-3">
          <Button variant="ghost" disabled={step === 1} onClick={() => setStep(step - 1)}>Back</Button>
          <Button size="lg" className="rounded-full px-7" disabled={!canNext} onClick={next}>
            {step === 4 ? "Go to my dashboard" : step === 3 ? (tier === 0 ? "Continue" : "Simulate checkout") : "Continue"}
          </Button>
        </div>
      </footer>
    </div>
  );
}

function TierCard({ active, onClick, price, label, desc }: { active: boolean; onClick: () => void; price: string; label: string; desc: string }) {
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
        <div className="font-serif text-2xl">{price}<span className="text-sm text-muted-foreground font-sans">/mo</span></div>
        <div className="text-xs uppercase tracking-wider text-primary">{label}</div>
      </div>
      <p className="mt-2 text-sm text-muted-foreground leading-relaxed">{desc}</p>
    </button>
  );
}
