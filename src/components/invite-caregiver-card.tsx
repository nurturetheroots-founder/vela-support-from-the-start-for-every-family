import { useState } from "react";
import { toast } from "sonner";
import { Loader2, Copy, UserPlus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { createInviteCode } from "@/lib/roles";

/**
 * Parents create a short code here and share it with the doula or caregiver
 * who will be logging shifts for their baby.
 */
export function InviteCaregiverCard() {
  const [code, setCode] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function generate() {
    setBusy(true);
    try {
      setCode(await createInviteCode());
    } catch {
      toast.error("Couldn't create a code just now. Try again in a moment.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="rounded-3xl bg-card/80 border border-border/50 p-6">
      <h2 className="font-serif text-xl flex items-center gap-2">
        <UserPlus className="h-5 w-5 text-primary" /> Invite your care team
      </h2>
      <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
        Share a code with your doula or night caregiver. They'll see only the shift tracker — never
        your check-ins or private notes.
      </p>

      {code ? (
        <div className="mt-4 flex items-center gap-3">
          <span className="rounded-2xl bg-secondary px-5 py-3 font-mono text-2xl tracking-[0.3em]">
            {code}
          </span>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              void navigator.clipboard?.writeText(code);
              toast.success("Code copied.");
            }}
          >
            <Copy className="h-4 w-4" /> Copy
          </Button>
        </div>
      ) : (
        <Button onClick={generate} disabled={busy} className="mt-4 rounded-full px-6">
          {busy && <Loader2 className="h-4 w-4 animate-spin" />}
          {busy ? "Creating…" : "Create invite code"}
        </Button>
      )}
    </section>
  );
}
