import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Check } from "lucide-react";

/**
 * Gentle confirmation shown after a handover summary is shared with a provider.
 * Non-diagnostic by design: it describes what was sent, never what it means.
 */
export function HandoverSentDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm rounded-3xl border-border/60 bg-card/95 p-7 text-center">
        <div className="mx-auto grid h-14 w-14 place-items-center rounded-full bg-primary/10 text-primary">
          <Check className="h-6 w-6" />
        </div>
        <DialogHeader className="mt-2 space-y-3">
          <DialogTitle className="font-serif text-2xl leading-snug text-center">
            Your summary has been securely sent to your provider, and a follow-up is requested.
          </DialogTitle>
          <DialogDescription className="text-sm leading-relaxed text-muted-foreground text-center">
            Nothing more is needed from you right now. Your provider will reach out to talk it through together.
            This summary simply shares what you've noticed — it isn't an assessment or a diagnosis.
          </DialogDescription>
        </DialogHeader>
        <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
          If something feels urgent before you hear back, you're always welcome to call your provider directly,
          or the National Maternal Mental Health Hotline at 1-833-943-5746.
        </p>
        <DialogFooter className="mt-4">
          <Button className="w-full rounded-full h-12" onClick={() => onOpenChange(false)}>
            Back to my home base
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
