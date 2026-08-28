import { useState } from "react";
import { HeartHandshake, Loader2, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { startAgentTask, endAgentTask } from "@/lib/agent-tasks";

export function ShareCheckinsCard() {
  const [pending, setPending] = useState(false);
  const [shared, setShared] = useState(false);

  const share = async () => {
    setPending(true);
    const taskId = startAgentTask("Vela is gently preparing your check-in summary…");
    try {
      // Placeholder until the secure share API is wired up.
      await new Promise((r) => setTimeout(r, 1500));
      setShared(true);
    } finally {
      endAgentTask(taskId);
      setPending(false);
    }
  };

  return (
    <div className="rounded-2xl border border-border/60 bg-secondary/60 p-5 mb-4 shadow-sm">
      <div className="flex items-start gap-3">
        <span className="grid place-items-center h-10 w-10 rounded-full bg-primary/10 text-primary">
          <HeartHandshake className="h-5 w-5" />
        </span>
        <div className="flex-1">
          <h2 className="font-serif text-xl">You don't have to hold this alone</h2>
          <p className="text-sm text-muted-foreground mt-1 leading-relaxed">
            Share a gentle summary of how you've been feeling with someone in your corner — a therapist,
            your doula, or your partner. You choose who sees it, and you can stop sharing anytime.
          </p>
        </div>
      </div>
      <div className="mt-4">
        <Button
          onClick={share}
          disabled={pending}
          variant="secondary"
          className="w-full rounded-full h-12 bg-card/80 hover:bg-card border border-border/60 shadow-sm transition-all hover:shadow-md disabled:opacity-70"
        >
          {pending ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              Getting your summary ready…
            </>
          ) : (
            <>
              <HeartHandshake className="h-4 w-4 text-primary" />
              Share my check-ins with my support team
            </>
          )}
        </Button>
        <p className="text-xs text-muted-foreground mt-3 text-center leading-relaxed">
          Sent securely. Nothing is shared without you asking.
        </p>
      </div>

      <Dialog open={shared} onOpenChange={setShared}>
        <DialogContent className="rounded-2xl">
          <DialogHeader>
            <span className="grid place-items-center h-11 w-11 rounded-full bg-primary/10 text-primary mb-2">
              <Check className="h-5 w-5" />
            </span>
            <DialogTitle className="font-serif text-xl text-left">Your summary is on its way</DialogTitle>
            <DialogDescription className="text-left leading-relaxed">
              Your check-ins have been securely shared with your support team. This is a snapshot of how
              your days have felt — not an assessment or diagnosis. Reaching out was a caring thing to do.
            </DialogDescription>
          </DialogHeader>
          <p className="text-xs text-muted-foreground leading-relaxed">
            If you ever need someone right away, the National Maternal Mental Health Hotline is
            1-833-943-5746, and 988 is available any hour.
          </p>
          <DialogFooter>
            <Button className="rounded-full w-full" onClick={() => setShared(false)}>
              Back to my day
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
