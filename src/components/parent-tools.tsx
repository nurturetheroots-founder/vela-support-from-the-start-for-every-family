import { useState } from "react";
import { Link, useNavigate } from "@tanstack/react-router";
import { FileHeart, Loader2, ShieldCheck, Wrench } from "lucide-react";
import { Button } from "@/components/ui/button";
import { DisclosureSection } from "@/components/disclosure-section";
import { ShareCheckinsCard } from "@/components/share-checkins";
import { startAgentTask, endAgentTask } from "@/lib/agent-tasks";

/**
 * Secondary parent tools — handover report, EPDS screening, and sharing.
 * Folded away here so the home screen can stay to three cards.
 */
export function ParentToolsDrawer({ className }: { className?: string }) {
  return (
    <div className={className}>
      <DisclosureSection icon={Wrench} title="More tools" hint="Handover report, screening, sharing">
        <HandoverReportCard />
        <div className="rounded-2xl border border-border/60 bg-card/70 p-5 mb-4 shadow-sm">
          <div className="flex items-start gap-3">
            <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-primary/10 text-primary">
              <ShieldCheck className="h-5 w-5" />
            </span>
            <div className="flex-1">
              <h2 className="font-serif text-xl">Mood screening</h2>
              <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
                A gentle 10-question check on how the last seven days have felt.
              </p>
            </div>
          </div>
          <div className="mt-4">
            <Link to="/screening">
              <Button variant="outline" className="h-12 w-full rounded-full">
                Take the screening
              </Button>
            </Link>
          </div>
        </div>
        <ShareCheckinsCard />
      </DisclosureSection>
    </div>
  );
}

function HandoverReportCard() {
  const [pending, setPending] = useState(false);
  const navigate = useNavigate();

  const generate = async () => {
    setPending(true);
    const taskId = startAgentTask("Vela is securely coordinating your care plan…");
    try {
      await new Promise((r) => setTimeout(r, 900));
      await navigate({ to: "/handover" });
    } finally {
      endAgentTask(taskId);
      setPending(false);
    }
  };

  return (
    <div className="rounded-2xl border border-border/60 bg-card/70 p-5 mb-4 shadow-sm">
      <div className="flex items-start gap-3">
        <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-primary/10 text-primary">
          <FileHeart className="h-5 w-5" />
        </span>
        <div className="flex-1">
          <h2 className="font-serif text-xl">Pediatrician handover</h2>
          <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
            A calm, one-page summary of how you and baby have been doing — easy to share at your next visit.
          </p>
        </div>
      </div>
      <div className="mt-4">
        <Button
          onClick={generate}
          disabled={pending}
          className="h-12 w-full rounded-full shadow-sm transition-all hover:shadow-md disabled:opacity-70"
        >
          {pending ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              Preparing your summary…
            </>
          ) : (
            <>
              <FileHeart className="h-4 w-4" />
              Generate Pediatrician Handover Report
            </>
          )}
        </Button>
      </div>
    </div>
  );
}
