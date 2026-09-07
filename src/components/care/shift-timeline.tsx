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
  sleep: { icon: Moon, badge: "bg-teal-500/15 text-teal-300 border-teal-500/30", label: "Sleep" },
  feed: { icon: Milk, badge: "bg-amber-500/15 text-amber-300 border-amber-500/30", label: "Feed" },
  diaper: { icon: Baby, badge: "bg-slate-500/15 text-slate-300 border-slate-500/30", label: "Diaper" },
  observation: {
    icon: NotebookPen,
    badge: "bg-violet-500/15 text-violet-300 border-violet-500/30",
    label: "Observation",
  },
} as const;

export function describeLog(log: CareLog): string {
  if (log.event_type === "feed") {
    const p = log.payload as FeedPayload;
    return p.type === "bottle"
      ? `Bottle · ${p.amount_oz ?? 0} oz`
      : `Nursing · ${p.duration_minutes ?? 0} min${p.side ? ` · ${p.side}` : ""}`;
  }
  if (log.event_type === "diaper") {
    const p = log.payload as DiaperPayload;
    return p.condition === "wet" ? "Wet" : p.condition === "dirty" ? "Dirty" : "Wet + dirty";
  }
  if (log.event_type === "sleep") {
    const p = log.payload as SleepPayload;
    return `${formatDuration(p.duration_minutes ?? 0)}${p.soothing_technique ? ` · ${p.soothing_technique}` : ""}`;
  }
  const p = log.payload as ObservationPayload;
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
  const [draft, setDraft] = useState("");

  if (logs.length === 0) {
    return (
      <div className="rounded-3xl border border-slate-800 bg-slate-900/60 p-8 text-center text-slate-400">
        Nothing logged yet this shift. Tap a button below to start.
      </div>
    );
  }

  return (
    <ol className="space-y-3">
      {logs.map((log) => {
        const s = styles[log.event_type];
        const Icon = s.icon;
        const editing = editingId === log.id;
        return (
          <li
            key={log.id}
            className="rounded-2xl border border-slate-800 bg-slate-900/70 p-4 transition-opacity"
          >
            <div className="flex items-start gap-3">
              <span className={cn("grid h-10 w-10 shrink-0 place-items-center rounded-full border", s.badge)}>
                <Icon className="h-5 w-5" />
              </span>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2 text-xs">
                  <span className={cn("rounded-full border px-2 py-0.5", s.badge)}>{s.label}</span>
                  <span className="text-slate-500">{time(log.timestamp)}</span>
                </div>
                {editing ? (
                  <textarea
                    value={draft}
                    onChange={(e) => setDraft(e.target.value)}
                    rows={2}
                    className="mt-2 w-full rounded-xl border border-slate-700 bg-slate-950 p-2 text-sm text-slate-100 outline-none focus:border-slate-500"
                  />
                ) : (
                  <p className="mt-1 text-sm leading-relaxed text-slate-200">{describeLog(log)}</p>
                )}
              </div>
              <div className="flex shrink-0 gap-1">
                {editing ? (
                  <>
                    <button
                      type="button"
                      aria-label="Save"
                      onClick={() => {
                        onEdit(log, draft);
                        setEditingId(null);
                      }}
                      className="grid h-11 w-11 place-items-center rounded-full text-teal-300 active:bg-slate-800"
                    >
                      <Check className="h-5 w-5" />
                    </button>
                    <button
                      type="button"
                      aria-label="Cancel"
                      onClick={() => setEditingId(null)}
                      className="grid h-11 w-11 place-items-center rounded-full text-slate-400 active:bg-slate-800"
                    >
                      <X className="h-5 w-5" />
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
                      className="grid h-11 w-11 place-items-center rounded-full text-slate-400 active:bg-slate-800"
                    >
                      <Pencil className="h-4 w-4" />
                    </button>
                    <button
                      type="button"
                      aria-label="Delete entry"
                      onClick={() => onDelete(log)}
                      className="grid h-11 w-11 place-items-center rounded-full text-slate-500 active:bg-slate-800"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </>
                )}
              </div>
            </div>
          </li>
        );
      })}
    </ol>
  );
}
