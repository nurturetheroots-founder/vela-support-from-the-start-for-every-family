import { useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { redeemInvite } from "@/lib/roles";

/**
 * Invited doulas and caregivers join a family with a 6-character code and skip
 * the parent onboarding entirely.
 */
export function CaregiverInviteDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
}) {
  const nav = useNavigate();
  const [code, setCode] = useState("");
  const [name, setName] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const valid = code.trim().length === 6 && name.trim().length >= 2;

  async function submit() {
    if (!valid || busy) return;
    setBusy(true);
    setError(null);
    try {
      await redeemInvite(code, name);
      toast.success("You're in. Welcome to the care team.");
      onOpenChange(false);
      await nav({ to: "/caregiver/shift-dashboard" });
    } catch {
      setError("That code didn't work. Double-check it with the family who invited you.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="rounded-3xl sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="font-serif text-2xl">Join a family's care team</DialogTitle>
          <DialogDescription className="leading-relaxed">
            Enter the code the family shared with you. You'll go straight to the shift tracker — no
            parent setup needed.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 pt-1">
          <div>
            <Label htmlFor="invite-code">Family invite code</Label>
            <Input
              id="invite-code"
              value={code}
              onChange={(e) => setCode(e.target.value.replace(/[^a-zA-Z0-9]/g, "").slice(0, 6).toUpperCase())}
              placeholder="A1B2C3"
              autoComplete="off"
              className="mt-2 h-12 text-center text-lg tracking-[0.4em]"
            />
          </div>
          <div>
            <Label htmlFor="invite-name">Your display name</Label>
            <Input
              id="invite-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Maya R."
              className="mt-2 h-12"
            />
          </div>
          {error && (
            <p role="alert" className="text-sm text-destructive leading-relaxed">
              {error}
            </p>
          )}
          <Button
            onClick={submit}
            disabled={!valid || busy}
            size="lg"
            className="h-12 w-full rounded-full"
          >
            {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
            {busy ? "Joining…" : "Join care team"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
