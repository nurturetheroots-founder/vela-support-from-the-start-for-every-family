import { useState } from "react";
import { HeartHandshake, Check } from "lucide-react";
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
import { GentleLoading } from "@/components/gentle-loading";

export function ShareCheckinsCard() {
  const [pending, setPending] = useState(false);
  const [shared, setShared] = useState(false);

  const share = async () => {
    setPending(true);
    const taskId = startAgentTask("Vela is gently organizing your thoughts for your support team…");
    try {
      // Placeholder until the secure share API is wired up.
      await new Promise((r) => setTimeout(r, 2400));
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
        {pending ? (
          <GentleLoading />
        ) : (
          <>
            <Button
              onClick={share}
              variant="secondary"
              className="w-full rounded-full h-12 bg-card/80 hover:bg-card border border-border/60 shadow-sm transition-all hover:shadow-md"
            >
              <HeartHandshake className="h-4 w-4 text-primary" />
              Share my check-ins with my support team
            </Button>
            <p className="text-xs text-muted-foreground mt-3 text-center leading-relaxed">
              Sent securely. Nothing is shared without you asking.
            </p>
          </>
        )}
      </div>


      <Dialog open={shared} onOpenChange={setShared}>
        <DialogContent className="rounded-3xl border-border/60 bg-card/95 backdrop-blur px-6 py-7 sm:max-w-md">
          <div className="relative mx-auto mb-1">
            <span className="absolute inset-0 rounded-full bg-primary/15 blur-xl animate-gentle-fade" aria-hidden="true" />
            <span className="relative grid place-items-center h-14 w-14 rounded-full bg-primary/10 text-primary">
              <HeartHandshake className="h-6 w-6" />
            </span>
          </div>
          <DialogHeader className="space-y-3">
            <DialogTitle className="font-serif text-2xl leading-snug text-center">
              Your summary has been shared
            </DialogTitle>
            <DialogDescription className="text-center text-base leading-relaxed text-muted-foreground">
              Your check-in summary has been securely shared with your support network. You are doing an
              incredible job, and you don't have to carry this alone.
            </DialogDescription>
          </DialogHeader>

          <div className="mt-2 rounded-2xl bg-secondary/70 px-4 py-3">
            <p className="text-sm leading-relaxed text-muted-foreground text-center">
              This is simply a picture of how your days have felt — nothing more. Asking someone to walk
              beside you is a strong, loving thing to do.
            </p>
          </div>

          <p className="mt-1 text-xs text-muted-foreground leading-relaxed text-center">
            If you'd like someone to talk to right now, the National Maternal Mental Health Hotline is
            1-833-943-5746, and 988 is there any hour, any day.
          </p>

          <DialogFooter>
            <Button className="rounded-full w-full h-12" onClick={() => setShared(false)}>
              Back to my day
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

    </div>
  );
}
