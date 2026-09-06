import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Loader2, Sparkles, Check, Pencil, X } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

type Status = "awaiting_family_response" | "approved" | "dismissed";

interface DraftRow {
  id: string;
  created_at: string;
  pattern_noticed: string;
  outreach_draft: string;
  status: string;
  category: string | null;
  clinical_context: string | null;
}

function timeAgo(iso: string) {
  const d = new Date(iso);
  const mins = Math.round((Date.now() - d.getTime()) / 60000);
  if (mins < 60) return `${Math.max(mins, 1)} min ago`;
  if (mins < 1440) return `${Math.round(mins / 60)} hr ago`;
  return d.toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

export function DraftApprovalQueue({ className }: { className?: string }) {
  const [drafts, setDrafts] = useState<DraftRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [leaving, setLeaving] = useState<Record<string, boolean>>({});
  const [editing, setEditing] = useState<Record<string, string | undefined>>({});
  const [saving, setSaving] = useState<Record<string, boolean>>({});

  useEffect(() => {
    let active = true;
    supabase
      .from("review_queue")
      .select("id, created_at, pattern_noticed, outreach_draft, status, category, clinical_context")
      .eq("status", "awaiting_family_response")
      .order("created_at", { ascending: false })
      .then(({ data }) => {
        if (!active) return;
        setDrafts((data ?? []) as DraftRow[]);
        setLoading(false);
      });
    return () => {
      active = false;
    };
  }, []);

  const remove = (id: string) => {
    setLeaving((l) => ({ ...l, [id]: true }));
    window.setTimeout(() => setDrafts((d) => d.filter((x) => x.id !== id)), 260);
  };

  const setStatus = async (draft: DraftRow, status: Status) => {
    setSaving((s) => ({ ...s, [draft.id]: true }));
    const text = editing[draft.id] ?? draft.outreach_draft;
    const { error } = await supabase
      .from("review_queue")
      .update({
        status,
        responded_at: new Date().toISOString(),
        ...(status === "approved" ? { outreach_draft: text } : {}),
      })
      .eq("id", draft.id);
    setSaving((s) => ({ ...s, [draft.id]: false }));
    if (error) {
      toast.error("That didn't save. Try again in a moment.");
      return;
    }
    remove(draft.id);
    toast(
      status === "approved"
        ? "Approved — added to your shared timeline."
        : "Draft dismissed; no data logged.",
    );
  };

  const saveEdit = async (draft: DraftRow) => {
    const text = (editing[draft.id] ?? "").trim();
    if (!text) return;
    setSaving((s) => ({ ...s, [draft.id]: true }));
    const { error } = await supabase
      .from("review_queue")
      .update({ outreach_draft: text })
      .eq("id", draft.id);
    setSaving((s) => ({ ...s, [draft.id]: false }));
    if (error) {
      toast.error("That didn't save. Try again in a moment.");
      return;
    }
    setDrafts((d) => d.map((x) => (x.id === draft.id ? { ...x, outreach_draft: text } : x)));
    setEditing((e) => ({ ...e, [draft.id]: undefined }));
    toast("Your words are saved.");
  };

  return (
    <section className={cn("mb-4", className)} aria-label="Drafts waiting for you">
      <div className="flex items-center gap-2 mb-3">
        <Sparkles className="h-4 w-4 text-primary" />
        <h2 className="font-serif text-xl">Waiting for your okay</h2>
      </div>

      {loading ? (
        <div className="rounded-2xl border border-border/60 bg-card/60 p-6 flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" />
          Gathering your drafts…
        </div>
      ) : drafts.length === 0 ? (
        <div className="rounded-2xl border border-border/60 bg-secondary/50 p-6 text-center">
          <p className="font-serif text-lg text-foreground/90">Your queue is clear.</p>
          <p className="text-sm text-muted-foreground mt-1">No pending drafts to review.</p>
        </div>
      ) : (
        <ul className="space-y-3">
          {drafts.map((d) => {
            const isEditing = editing[d.id] !== undefined;
            const busy = !!saving[d.id];
            return (
              <li
                key={d.id}
                className={cn(
                  "rounded-2xl border border-border/60 bg-card/70 p-5 shadow-sm transition-all duration-250",
                  leaving[d.id] ? "opacity-0 translate-y-1 scale-[0.98]" : "opacity-100",
                )}
              >
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-xs rounded-full bg-secondary text-foreground/80 px-3 py-1">
                    {d.category ?? "Gentle observation"}
                  </span>
                  <span className="text-xs text-muted-foreground">{timeAgo(d.created_at)}</span>
                </div>

                <p className="text-xs text-muted-foreground mt-2 leading-relaxed">
                  {d.clinical_context ?? d.pattern_noticed}
                </p>

                {isEditing ? (
                  <Textarea
                    value={editing[d.id] ?? ""}
                    onChange={(e) => setEditing((s) => ({ ...s, [d.id]: e.target.value }))}
                    rows={5}
                    className="mt-3 rounded-xl bg-background/70 leading-relaxed"
                    aria-label="Edit this draft"
                  />
                ) : (
                  <p className="mt-3 text-sm text-foreground/90 leading-relaxed whitespace-pre-line">
                    {d.outreach_draft}
                  </p>
                )}

                <div className="mt-4 grid grid-cols-3 gap-2">
                  {isEditing ? (
                    <>
                      <Button
                        onClick={() => saveEdit(d)}
                        disabled={busy}
                        className="col-span-2 rounded-full min-h-11"
                      >
                        Save my words
                      </Button>
                      <Button
                        variant="ghost"
                        onClick={() => setEditing((s) => ({ ...s, [d.id]: undefined }))}
                        className="rounded-full min-h-11"
                      >
                        Cancel
                      </Button>
                    </>
                  ) : (
                    <>
                      <Button
                        onClick={() => setStatus(d, "approved")}
                        disabled={busy}
                        className="rounded-full min-h-11"
                      >
                        <Check className="h-4 w-4" />
                        Approve
                      </Button>
                      <Button
                        variant="outline"
                        onClick={() => setEditing((s) => ({ ...s, [d.id]: d.outreach_draft }))}
                        className="rounded-full min-h-11 bg-card/60"
                      >
                        <Pencil className="h-4 w-4" />
                        Edit
                      </Button>
                      <Button
                        variant="ghost"
                        onClick={() => setStatus(d, "dismissed")}
                        disabled={busy}
                        className="rounded-full min-h-11 text-muted-foreground"
                      >
                        <X className="h-4 w-4" />
                        Dismiss
                      </Button>
                    </>
                  )}
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
