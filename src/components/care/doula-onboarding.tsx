import { useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { toast } from "sonner";
import { Loader2, ArrowRight, Check } from "lucide-react";
import { z } from "zod";
import { supabase } from "@/integrations/supabase/client";
import { redeemInvite } from "@/lib/roles";
import { resetBabyCache, setSelectedFamilyId } from "@/lib/care-log";
import { useNightDim, NightDimToggle } from "@/components/care/night-mode";
import { ClientInviteRequest } from "@/components/care/client-invite-request";
import { cn } from "@/lib/utils";

const detailsSchema = z.object({
  full_name: z.string().trim().min(2, "Please add your name").max(100, "That name is too long"),
  email: z.string().trim().email("Please check that email address").max(255),
  location: z.string().trim().max(120, "Keep this under 120 characters"),
  specialties: z.string().trim().max(200, "Keep this under 200 characters"),
});

type Field = keyof z.infer<typeof detailsSchema>;

/** Three steps: who you are, add your first family, then your case list. */
export function DoulaOnboarding() {
  const navigate = useNavigate();
  const { dim, toggle } = useNightDim();
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [busy, setBusy] = useState(false);

  const [values, setValues] = useState<Record<Field, string>>({
    full_name: "",
    email: "",
    location: "",
    specialties: "",
  });
  const [errors, setErrors] = useState<Partial<Record<Field, string>>>({});

  const [code, setCode] = useState("");
  const [codeError, setCodeError] = useState<string | null>(null);
  const [joined, setJoined] = useState(0);

  const set = (f: Field) => (v: string) => setValues((p) => ({ ...p, [f]: v }));

  async function saveDetails() {
    if (busy) return;
    const parsed = detailsSchema.safeParse(values);
    if (!parsed.success) {
      const next: Partial<Record<Field, string>> = {};
      for (const issue of parsed.error.issues) next[issue.path[0] as Field] = issue.message;
      setErrors(next);
      return;
    }
    setErrors({});
    setBusy(true);
    try {
      const { data: auth } = await supabase.auth.getUser();
      const uid = auth.user?.id;
      await supabase.from("doula_applications").insert({
        full_name: parsed.data.full_name,
        email: parsed.data.email,
        location: parsed.data.location || null,
        specialties: parsed.data.specialties || null,
        about: null,
        user_id: uid ?? null,
      });
      if (uid) {
        await supabase
          .from("parents")
          .upsert({ parent_id: uid, display_name: parsed.data.full_name }, { onConflict: "parent_id" });
      }
      setStep(2);
    } catch {
      toast.error("That didn't save. Try once more.");
    } finally {
      setBusy(false);
    }
  }

  async function join() {
    const trimmed = code.trim().toUpperCase();
    if (trimmed.length !== 6) {
      setCodeError("Codes are 6 characters, like 7KQ2MB.");
      return;
    }
    setBusy(true);
    setCodeError(null);
    try {
      const familyId = await redeemInvite(trimmed, values.full_name || "Caregiver");
      resetBabyCache();
      setSelectedFamilyId(familyId);
      setJoined((n) => n + 1);
      setCode("");
      toast.success("Family added");
    } catch {
      setCodeError("That code isn't working. Ask the family to send a fresh one.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className={cn("min-h-dvh bg-night text-night-text", dim && "night-dim")}>
      <div className="mx-auto max-w-lg px-5 pb-40 pt-6">
        <header className="mb-6 grid grid-cols-[minmax(0,1fr)_auto] items-start gap-3">
          <div className="min-w-0">
            <p className="text-xs uppercase tracking-widest text-night-muted">Step {step} of 3</p>
            <h1 className="mt-1 font-serif text-2xl text-night-text">
              {step === 1 ? "Set up your provider profile" : step === 2 ? "Add your families" : "You're set"}
            </h1>
          </div>
          <NightDimToggle dim={dim} onToggle={toggle} />
        </header>

        {step === 1 && (
          <div className="space-y-4 rounded-3xl bg-night-soft p-5 ring-1 ring-night-line">
            <NightField id="dn" label="Your name" value={values.full_name} onChange={set("full_name")} error={errors.full_name} placeholder="Maya Rivera" autoComplete="name" />
            <NightField id="de" label="Email" type="email" value={values.email} onChange={set("email")} error={errors.email} placeholder="you@example.com" autoComplete="email" />
            <NightField id="dl" label="Where you work" value={values.location} onChange={set("location")} error={errors.location} placeholder="San Francisco Bay Area" />
            <NightField id="ds" label="Your focus" value={values.specialties} onChange={set("specialties")} error={errors.specialties} placeholder="Overnight care, feeding support" />
            <button
              onClick={saveDetails}
              disabled={busy}
              className="inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-full bg-clay-soft px-5 text-sm font-medium text-night disabled:opacity-60"
            >
              {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
              Continue <ArrowRight className="h-4 w-4" />
            </button>
          </div>
        )}

        {step === 2 && (
          <div className="space-y-5">
            <div className="rounded-3xl bg-night-soft p-5 ring-1 ring-night-line">
              <h2 className="font-serif text-lg text-night-text">Enter a family's code</h2>
              <p className="mt-2 text-sm leading-relaxed text-night-muted">
                Six characters from the family. Add as many as you like.
              </p>
              <input
                value={code}
                onChange={(e) => setCode(e.target.value.toUpperCase().slice(0, 6))}
                placeholder="7KQ2MB"
                inputMode="text"
                autoCapitalize="characters"
                aria-invalid={!!codeError}
                aria-label="Family invite code"
                className="mt-3 h-12 w-full rounded-2xl bg-night px-4 text-center font-mono text-lg tracking-[0.4em] text-night-text ring-1 ring-night-line"
              />
              {codeError && (
                <p role="alert" className="mt-2 text-sm text-clay-soft">
                  {codeError}
                </p>
              )}
              <button
                onClick={join}
                disabled={busy}
                className="mt-3 inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-full bg-clay-soft px-5 text-sm font-medium text-night disabled:opacity-60"
              >
                {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                Add family
              </button>
              {joined > 0 && (
                <p className="mt-3 inline-flex items-center gap-2 text-sm text-night-muted">
                  <Check className="h-4 w-4" /> {joined} {joined === 1 ? "family" : "families"} added
                </p>
              )}
            </div>

            <ClientInviteRequest providerName={values.full_name} />

            <button
              onClick={() => setStep(3)}
              className="inline-flex min-h-11 w-full items-center justify-center rounded-full bg-night-soft px-5 text-sm text-night-text ring-1 ring-night-line"
            >
              {joined > 0 ? "Done adding families" : "Skip for now"}
            </button>
          </div>
        )}

        {step === 3 && (
          <div className="space-y-5">
            <div className="rounded-3xl bg-night-soft p-5 ring-1 ring-night-line">
              <p className="text-sm leading-relaxed text-night-muted">
                Your client dashboard shows each family and the last 24 hours of feeds, diapers and
                sleep. Parent check-ins and screenings stay private to the parent.
              </p>
            </div>
            <button
              onClick={() => navigate({ to: "/caregiver/clients" })}
              className="inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-full bg-clay-soft px-5 text-sm font-medium text-night"
            >
              Open my clients <ArrowRight className="h-4 w-4" />
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

function NightField({
  id,
  label,
  value,
  onChange,
  error,
  ...rest
}: {
  id: string;
  label: string;
  value: string;
  onChange: (v: string) => void;
  error?: string;
} & Omit<React.ComponentProps<"input">, "onChange" | "value" | "id">) {
  return (
    <div>
      <label htmlFor={id} className="text-sm text-night-muted">
        {label}
      </label>
      <input
        id={id}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        aria-invalid={!!error}
        className="mt-2 h-12 w-full rounded-2xl bg-night px-4 text-night-text ring-1 ring-night-line placeholder:text-night-muted/70"
        {...rest}
      />
      {error && (
        <p role="alert" className="mt-1.5 text-sm text-clay-soft">
          {error}
        </p>
      )}
    </div>
  );
}
