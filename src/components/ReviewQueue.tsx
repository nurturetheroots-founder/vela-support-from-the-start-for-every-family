import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Check, Loader2, Sparkles, X } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

const PENDING_STATUSES = ["pending", "awaiting_family_response"];

interface QueueRow {
  id: string;
  created_at: string;
  pattern_noticed: string;
  outreach_draft: string;
  status: string;
}

function relativeTime(iso: string) {
  const mins = Math.round((Date.now() - new Date(iso).getTime()) / 60000);
  if (mins < 60) return `Generated ${Math.max(mins, 1)} minutes ago`;
  if (mins < 1440) {
    const hrs = Math.round(mins / 60);
    return `Generated ${hrs} hour${hrs === 1 ? "" : "s"} ago`;
  }
  const days = Math.round(mins / 1440);
  return `Generated ${days} day${days === 1 ? "" : "s"} ago`;
}

export function ReviewQueue({ className }: { className?: string }) {
  const [rows, setRows] = useState<QueueRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [drafts, setDrafts] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState<Record<string, boolean>>({});
  const [leaving, setLeaving] = useState<Record<string, boolean>>({});

  useEffect(() => {
    let active = true;
    supabase
      .from("review_queue")
      .select("id, created_at, pattern_noticed, outreach_draft, status")
      .in("status", PENDING_STATUSES)
      .order("created_at", { ascending: false })
      .then(({ data }) => {
        if (!active) return;
        const list = (data ?? []) as QueueRow[];
        setRows(list);
        setDrafts(Object.fromEntries(list.map((r) => [r.id, r.outreach_draft])));
        setLoading(false);
      });
    return () => {
      active = false;
    };
  }, []);

  const act = async (row: QueueRow, action: "approved" | "dismissed") => {
    setBusy((b) => ({ ...b, [row.id]: true }));
    const now = new Date().toISOString();
    const { error } = await supabase
      .from("review_queue")
      .update({
        status: action,
        responded_at: now,
        ...(action === "approved"
          ? { approved_at: now, outreach_draft: drafts[row.id] ?? row.outreach_draft }
          : {}),
      })
      .eq("id", row.id);
    setBusy((b) => ({ ...b, [row.id]: false }));
    if (error) {
      toast.error("That didn't save. Try again in a moment.");
      return;
    }
    setLeaving((l) => ({ ...l, [row.id]: true }));
    window.setTimeout(() => setRows((r) => r.filter((x) => x.id !== row.id)), 260);
    toast(action === "approved" ? "Draft approved" : "Draft dismissed");
  };

  return (
    <section className={cn("space-y-3", className)} aria-label="Clinical review queue">
      <div className="flex items-center gap-2">
        <Sparkles className="h-4 w-4 text-primary" />
        <h2 className="font-serif text-xl">Clinical review queue</h2>
      </div>

      {loading ? (
        <div className="rounded-2xl border border-border/60 bg-card/60 p-6 flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" />
          Gathering drafts…
        </div>
      ) : rows.length === 0 ? (
        <div className="rounded-2xl border border-border/60 bg-secondary/50 p-6 text-center">
          <p className="font-serif text-lg text-foreground/90">All clear.</p>
          <p className="text-sm text-muted-foreground mt-1 leading-relaxed">
            Silence is a valid output — no rhythm patterns require outreach right now.
          </p>
        </div>
      ) : (
        <ul className="space-y-3">
          {rows.map((row) => (
            <li
              key={row.id}
              className={cn(
                "rounded-2xl border border-border/60 bg-card/70 p-5 shadow-sm transition-all duration-250",
                leaving[row.id] ? "opacity-0 translate-y-1 scale-[0.98]" : "opacity-100",
              )}
            >
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-xs rounded-full bg-secondary text-foreground/80 px-3 py-1">
                  {row.pattern_noticed}
                </span>
                <span className="text-xs text-muted-foreground">{relativeTime(row.created_at)}</span>
              </div>

              <Textarea
                value={drafts[row.id] ?? ""}
                onChange={(e) => setDrafts((d) => ({ ...d, [row.id]: e.target.value }))}
                rows={5}
                className="mt-3 rounded-xl bg-background/70 leading-relaxed"
                aria-label="Outreach draft"
              />

              <div className="mt-4 grid grid-cols-2 gap-2">
                <Button
                  onClick={() => act(row, "approved")}
                  disabled={!!busy[row.id]}
                  className="rounded-full min-h-11"
                >
                  <Check className="h-4 w-4" />
                  Approve &amp; send
                </Button>
                <Button
                  variant="ghost"
                  onClick={() => act(row, "dismissed")}
                  disabled={!!busy[row.id]}
                  className="rounded-full min-h-11 text-muted-foreground"
                >
                  <X className="h-4 w-4" />
                  Dismiss
                </Button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
