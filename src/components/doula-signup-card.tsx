import { useState } from "react";
import { z } from "zod";
import { toast } from "sonner";
import { HeartHandshake, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

const schema = z.object({
  full_name: z.string().trim().min(2, "Please add your name").max(100, "That name is too long"),
  email: z.string().trim().email("Please check that email address").max(255),
  location: z.string().trim().max(120, "Keep this under 120 characters").optional(),
  specialties: z.string().trim().max(200, "Keep this under 200 characters").optional(),
  about: z.string().trim().max(1000, "Keep this under 1000 characters").optional(),
});

type Field = keyof z.infer<typeof schema>;

/** Doulas and newborn care specialists apply to join the care team list. */
export function DoulaSignupCard() {
  const [values, setValues] = useState<Record<Field, string>>({
    full_name: "",
    email: "",
    location: "",
    specialties: "",
    about: "",
  });
  const [errors, setErrors] = useState<Partial<Record<Field, string>>>({});
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState(false);

  const set = (field: Field) => (value: string) =>
    setValues((prev) => ({ ...prev, [field]: value }));

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (busy) return;

    const parsed = schema.safeParse(values);
    if (!parsed.success) {
      const next: Partial<Record<Field, string>> = {};
      for (const issue of parsed.error.issues) {
        next[issue.path[0] as Field] = issue.message;
      }
      setErrors(next);
      return;
    }
    setErrors({});
    setBusy(true);
    try {
      const { data: auth } = await supabase.auth.getUser();
      const { error } = await supabase.from("doula_applications").insert({
        ...parsed.data,
        location: parsed.data.location || null,
        specialties: parsed.data.specialties || null,
        about: parsed.data.about || null,
        user_id: auth.user?.id ?? null,
      });
      if (error) throw error;
      setSent(true);
    } catch {
      toast.error("That didn't send. Try once more.");
    } finally {
      setBusy(false);
    }
  }

  if (sent) {
    return (
      <div className="rounded-2xl border border-primary/30 bg-primary/5 p-5">
        <h3 className="font-serif text-xl">Thank you — we have your details</h3>
        <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
          Ashlee reviews every application personally and will be in touch by email. If you're
          accepted, you'll get an invite code that opens your client dashboard.
        </p>
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-border/60 bg-card/70 p-5">
      <div className="flex items-start gap-3">
        <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-primary/10 text-primary">
          <HeartHandshake className="h-5 w-5" />
        </span>
        <div className="min-w-0">
          <p className="text-xs uppercase tracking-wider text-primary">For practitioners</p>
          <h3 className="mt-1 font-serif text-xl">Join the care team</h3>
          <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
            Doulas, night nurses and newborn care specialists — tell us a little about your work and
            we'll be in touch.
          </p>
        </div>
      </div>

      <form onSubmit={submit} className="mt-5 space-y-4" noValidate>
        <TextField
          id="doula-name"
          label="Your name"
          value={values.full_name}
          onChange={set("full_name")}
          error={errors.full_name}
          placeholder="Maya Rivera"
          autoComplete="name"
        />
        <TextField
          id="doula-email"
          label="Email"
          type="email"
          value={values.email}
          onChange={set("email")}
          error={errors.email}
          placeholder="you@example.com"
          autoComplete="email"
        />
        <TextField
          id="doula-location"
          label="Where you work"
          value={values.location}
          onChange={set("location")}
          error={errors.location}
          placeholder="San Francisco Bay Area"
        />
        <TextField
          id="doula-specialties"
          label="Your focus"
          value={values.specialties}
          onChange={set("specialties")}
          error={errors.specialties}
          placeholder="Overnight care, feeding support"
        />

        <div>
          <Label htmlFor="doula-about">Anything else</Label>
          <Textarea
            id="doula-about"
            value={values.about}
            onChange={(e) => set("about")(e.target.value)}
            placeholder="Certifications, years of experience, the families you love working with."
            rows={4}
            className="mt-2 resize-none"
            aria-invalid={!!errors.about}
          />
          {errors.about && (
            <p role="alert" className="mt-1.5 text-sm text-destructive">
              {errors.about}
            </p>
          )}
        </div>

        <Button type="submit" disabled={busy} className="h-12 w-full rounded-full">
          {busy && <Loader2 className="h-4 w-4 animate-spin" />}
          {busy ? "Sending…" : "Send my details"}
        </Button>
        <p className="text-center text-xs leading-relaxed text-muted-foreground">
          Only Ashlee sees this. No family data is shared until you're invited to a care team.
        </p>
      </form>
    </div>
  );
}

function TextField({
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
} & Omit<React.ComponentProps<typeof Input>, "onChange" | "value" | "id">) {
  return (
    <div>
      <Label htmlFor={id}>{label}</Label>
      <Input
        id={id}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        aria-invalid={!!error}
        className="mt-2 h-12"
        {...rest}
      />
      {error && (
        <p role="alert" className="mt-1.5 text-sm text-destructive">
          {error}
        </p>
      )}
    </div>
  );
}
