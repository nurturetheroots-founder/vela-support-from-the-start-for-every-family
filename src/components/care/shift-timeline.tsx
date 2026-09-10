import { useState } from "react";
import { Milk, Baby, Moon, NotebookPen, Pencil, Trash2, Check, X } from "lucide-react";
import { cn } from "@/lib/utils";
import type {
  CareLog,
  DiaperPayload,
  FeedPayload,
  ObservationPayload,
  SleepPayload,
} from "@/lib/care-log";
import { formatDuration } from "@/lib/care-log";

const styles = {
  sleep: { icon: Moon, tint: "text-sage", label: "Sleep" },
  feed: { icon: Milk, tint: "text-clay-soft", label: "Feed" },
  diaper: { icon: Baby, tint: "text-night-muted", label: "Diaper" },
  observation: { icon: NotebookPen, tint: "text-lilac-soft", label: "Note" },
} as const;

export function describeLog(log: CareLog): string {
  if (log.event_type === "feed") {
    const p = log.operational_metrics as FeedPayload;
    return p.type === "bottle"
      ? `Bottle · ${p.amount_oz ?? 0} oz`
      : `Nursing · ${p.duration_minutes ?? 0} min${p.side ? ` · ${p.side}` : ""}`;
  }
  if (log.event_type === "diaper") {
    const p = log.operational_metrics as DiaperPayload;
    return p.condition === "wet" ? "Wet" : p.condition === "dirty" ? "Dirty" : "Wet + dirty";
  }
  if (log.event_type === "sleep") {
    const p = log.operational_metrics as SleepPayload;
    return `${formatDuration(p.duration_minutes ?? 0)}${p.soothing_technique ? ` · ${p.soothing_technique}` : ""}`;
  }
  const p = log.operational_metrics as ObservationPayload;
  return p.note;
}

function time(iso: string) {
  return new Date(iso).toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" });
}

export function ShiftTimeline({
  logs,
  onEdit,
  onDelete,
}: {
  logs: CareLog[];
  onEdit: (log: CareLog, text: string) => void;
  onDelete: (log: CareLog) => void;
}) {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [openId, setOpenId] = useState<string | null>(null);
  const [draft, setDraft] = useState("");

  if (logs.length === 0) {
    return (
      <div className="rounded-[1.75rem] bg-night-soft/70 p-10 text-center text-night-muted">
        The night is quiet so far. Tap a card below when something happens.
      </div>
    );
  }

  return (
    <ol className="relative pl-8">
      <span
        aria-hidden
        className="absolute left-[15px] top-2 bottom-2 w-px bg-gradient-to-b from-transparent via-night-line to-transparent"
      />
      {logs.map((log) => {
        const s = styles[log.event_type];
        const Icon = s.icon;
        const editing = editingId === log.id;
        const expanded = openId === log.id;
        return (
          <li key={log.id} className="relative py-3">
            <span className="absolute -left-8 top-4 grid h-8 w-8 place-items-center rounded-full bg-night ring-1 ring-night-line">
              <Icon className={cn("h-4 w-4", s.tint)} />
            </span>
            <button
              type="button"
              onClick={() => setOpenId(expanded ? null : log.id)}
              className="flex w-full items-baseline gap-3 rounded-2xl px-2 py-1.5 text-left active:bg-night-soft/60"
            >
              <span className="w-16 shrink-0 text-xs tabular-nums text-night-muted">{time(log.timestamp)}</span>
              <span className="min-w-0 flex-1">
                {editing ? null : (
                  <span className="block text-[15px] leading-relaxed text-night-text">{describeLog(log)}</span>
                )}
                <span className="block text-[11px] uppercase tracking-wide text-night-muted/70">{s.label}</span>
              </span>
            </button>

            {editing && (
              <textarea
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                rows={2}
                className="mt-2 w-full rounded-2xl bg-night-soft p-3 text-sm text-night-text outline-none ring-1 ring-night-line focus:ring-clay-soft"
              />
            )}

            {(expanded || editing) && (
              <div className="mt-2 flex gap-2 pl-2">
                {editing ? (
                  <>
                    <button
                      type="button"
                      aria-label="Save"
                      onClick={() => {
                        onEdit(log, draft);
                        setEditingId(null);
                      }}
                      className="flex min-h-11 items-center gap-1.5 rounded-full bg-clay-soft px-4 text-sm font-medium text-night"
                    >
                      <Check className="h-4 w-4" /> Save
                    </button>
                    <button
                      type="button"
                      aria-label="Cancel"
                      onClick={() => setEditingId(null)}
                      className="flex min-h-11 items-center gap-1.5 rounded-full bg-night-soft px-4 text-sm text-night-muted"
                    >
                      <X className="h-4 w-4" /> Cancel
                    </button>
                  </>
                ) : (
                  <>
                    <button
                      type="button"
                      aria-label="Edit entry"
                      onClick={() => {
                        setDraft(describeLog(log));
                        setEditingId(log.id);
                      }}
                      className="flex min-h-11 items-center gap-1.5 rounded-full bg-night-soft px-4 text-sm text-night-text"
                    >
                      <Pencil className="h-4 w-4" /> Edit
                    </button>
                    <button
                      type="button"
                      aria-label="Delete entry"
                      onClick={() => onDelete(log)}
                      className="flex min-h-11 items-center gap-1.5 rounded-full bg-night-soft px-4 text-sm text-night-muted"
                    >
                      <Trash2 className="h-4 w-4" /> Remove
                    </button>
                  </>
                )}
              </div>
            )}
          </li>
        );
      })}
    </ol>
  );
}
