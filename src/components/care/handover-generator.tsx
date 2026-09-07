import { useState } from "react";
import { toast } from "sonner";
import { ClipboardCopy, Send, Sparkles } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { formatDuration, formatSummaryText, saveHandover, type ShiftMetrics } from "@/lib/care-log";

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-slate-800 bg-slate-900/70 p-3">
      <p className="text-xs uppercase tracking-wide text-slate-500">{label}</p>
      <p className="mt-1 text-lg font-semibold text-slate-100">{value}</p>
    </div>
  );
}

export function HandoverGenerator({
  babyId,
  babyName,
  metrics,
  shiftStart,
  onPublished,
}: {
  babyId: string;
  babyName: string;
  metrics: ShiftMetrics;
  shiftStart: string;
  onPublished?: () => void;
}) {
  const [open, setOpen] = useState(false);
  const [notes, setNotes] = useState("");
  const [busy, setBusy] = useState(false);

  const feedLine = [
    `${metrics.feed_count} feed${metrics.feed_count === 1 ? "" : "s"}`,
    metrics.total_oz ? `${metrics.total_oz} oz` : null,
    metrics.total_nursing_mins ? `${metrics.total_nursing_mins} min nursing` : null,
  ]
    .filter(Boolean)
    .join(" · ");

  async function publish() {
    setBusy(true);
    try {
      await saveHandover({
        babyId,
        shiftStart,
        shiftEnd: new Date().toISOString(),
        metrics,
        notes,
        status: "published",
      });
      toast.success("Handover published — it's waiting on the parent's morning view.");
      setOpen(false);
      onPublished?.();
    } catch {
      toast.error("Couldn't publish just now. Try again in a moment.");
    } finally {
      setBusy(false);
    }
  }

  async function copy() {
    const text = formatSummaryText(metrics, notes, babyName);
    try {
      await navigator.clipboard.writeText(text);
      toast.success("Summary copied — paste it anywhere.");
    } catch {
      toast.error("Copy isn't available on this device.");
    }
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="flex min-h-14 w-full items-center justify-center gap-2 rounded-2xl bg-teal-500/90 text-base font-semibold text-slate-950 active:bg-teal-400"
      >
        <Sparkles className="h-5 w-5" />
        Generate Shift Handover
      </button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-md border-slate-800 bg-slate-950 text-slate-100">
          <DialogHeader className="text-left">
            <DialogTitle className="text-slate-50">Shift handover</DialogTitle>
          </DialogHeader>

          <div className="grid grid-cols-2 gap-3">
            <Metric label="Feeds" value={feedLine || "None yet"} />
            <Metric label="Diapers" value={`${metrics.wet_diapers} wet · ${metrics.dirty_diapers} dirty`} />
            <div className="col-span-2">
              <Metric label="Longest sleep" value={formatDuration(metrics.longest_sleep_stretch_mins)} />
            </div>
          </div>

          <label className="mt-1 block text-sm text-slate-400" htmlFor="handover-notes">
            Notes for the morning
          </label>
          <textarea
            id="handover-notes"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={5}
            placeholder="Soothing patterns, latch or gas notes, and a word of encouragement…"
            className="w-full rounded-2xl border border-slate-800 bg-slate-900 p-3 text-sm leading-relaxed text-slate-100 outline-none placeholder:text-slate-600 focus:border-slate-600"
          />

          <div className="mt-2 space-y-2">
            <button
              type="button"
              disabled={busy}
              onClick={publish}
              className="flex min-h-14 w-full items-center justify-center gap-2 rounded-2xl bg-teal-500/90 text-base font-semibold text-slate-950 disabled:opacity-60"
            >
              <Send className="h-5 w-5" />
              {busy ? "Publishing…" : "Publish to parent app"}
            </button>
            <button
              type="button"
              onClick={copy}
              className="flex min-h-12 w-full items-center justify-center gap-2 rounded-2xl border border-slate-800 text-sm font-medium text-slate-200"
            >
              <ClipboardCopy className="h-4 w-4" />
              Copy formatted summary
            </button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
